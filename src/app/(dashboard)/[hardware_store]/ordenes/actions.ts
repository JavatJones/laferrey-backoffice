'use server'

import { revalidatePath } from 'next/cache'
import { StoreAccessError, authorizeStore, describeStoreAccessError, type StoreDTO } from '@/lib/auth/dal'
import { statusLabel, type DeliveryMethod, type PreparationStatus } from '@/lib/orders/status'
import { PickupError, issuePickupCode, verifyPickupCode, verifyPickupWithId } from '@/lib/pickup/service'
import { pushStatusToShopify, type PushResult } from '@/lib/shopify/fulfillment'
import { createClient } from '@/lib/supabase/server'
import {
  deliverPickupWithCodeSchema,
  deliverPickupWithIdSchema,
  pickupOrderSchema,
  updateOrderStatusSchema,
  type DeliverPickupWithIdValues,
  type UpdateOrderStatusInput,
} from '@/lib/validations/order'

// Envío del código de recogida al marcar "Listo para recoger" (RN-27).
export type PickupNotice = { sent: true; sentToMasked: string } | { sent: false; error: string }

export type UpdateOrderStatusResult =
  | { ok: true; status: PreparationStatus; label: string; push: PushResult | null; pickup?: PickupNotice }
  | { ok: false; error: string }

const DB_ERRORS: Record<string, string> = {
  invalid_status_transition: 'Ese cambio de estado no está permitido. Recarga la página para ver el estado actual.',
  pickup_not_verified: 'Para entregar, escribe el código de recogida que te dicta el cliente.',
}

const revalidateOrder = (slug: string, orderId: string) => {
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/ordenes`)
  revalidatePath(`/${slug}/ordenes/${orderId}`)
}

const accessError = (error: unknown) => {
  if (error instanceof StoreAccessError) return { ok: false as const, error: describeStoreAccessError(error) }
  if (error instanceof PickupError) return { ok: false as const, error: error.message }
  throw error
}

// Cambia el estado con la sesión del usuario: el RLS y el trigger validan la transición
// (RN-19) y que el pickup esté verificado (RN-27).
const changeStatus = async (store: StoreDTO, slug: string, orderId: string, to: PreparationStatus) => {
  const supabase = await createClient()

  const { data: before } = await supabase
    .from('store_orders')
    .select('status')
    .eq('order_id', Number(orderId))
    .eq('hardware_store_id', store.id)
    .maybeSingle()
  if (!before) return { ok: false as const, error: 'No encontrado.' }

  const { data, error } = await supabase
    .from('store_orders')
    .update({ status: to })
    .eq('order_id', Number(orderId))
    .eq('hardware_store_id', store.id)
    .select('status, delivery_method')

  if (error) {
    if (error.code === 'P0001' && DB_ERRORS[error.message]) return { ok: false as const, error: DB_ERRORS[error.message] }
    console.error('[ordenes] changeStatus', error)
    return { ok: false as const, error: 'No se pudo cambiar el estado. Intenta de nuevo.' }
  }
  if (!data || data.length === 0) return { ok: false as const, error: 'No encontrado.' }

  const updated = data[0] as { status: PreparationStatus; delivery_method: DeliveryMethod }
  const push =
    before.status === updated.status
      ? null
      : await pushStatusToShopify(Number(orderId), store, before.status, updated.status)

  revalidateOrder(slug, orderId)
  return {
    ok: true as const,
    status: updated.status,
    label: statusLabel(updated.status, updated.delivery_method),
    deliveryMethod: updated.delivery_method,
    changed: before.status !== updated.status,
    push,
  }
}

export const updateOrderStatus = async (input: UpdateOrderStatusInput): Promise<UpdateOrderStatusResult> => {
  const parsed = updateOrderStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' }
  const { slug, orderId, to } = parsed.data

  try {
    const { store } = await authorizeStore(slug)
    const result = await changeStatus(store, slug, orderId, to)
    if (!result.ok) return result

    // Al quedar lista una orden de pickup se envía el código al cliente. Si el envío
    // falla, el estado se conserva y el panel ofrece reenviarlo.
    let pickup: PickupNotice | undefined
    if (result.changed && result.status === 'ready_for_pickup') {
      try {
        pickup = { sent: true, ...(await issuePickupCode(store, Number(orderId))) }
      } catch (error) {
        pickup = { sent: false, error: error instanceof PickupError ? error.message : 'No se pudo enviar el código.' }
        if (!(error instanceof PickupError)) console.error('[ordenes] issuePickupCode', error)
      }
      revalidateOrder(slug, orderId)
    }

    return { ok: true, status: result.status, label: result.label, push: result.push, pickup }
  } catch (error) {
    return accessError(error)
  }
}

export const resendPickupCode = async (input: { slug: string; orderId: string }) => {
  const parsed = pickupOrderSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Solicitud inválida.' }
  const { slug, orderId } = parsed.data

  try {
    const { store } = await authorizeStore(slug)
    const { sentToMasked } = await issuePickupCode(store, Number(orderId), { resend: true })
    revalidateOrder(slug, orderId)
    return { ok: true as const, sentToMasked }
  } catch (error) {
    return accessError(error)
  }
}

export type DeliverPickupResult =
  | { ok: true; label: string; push: PushResult | null }
  | { ok: false; error: string; attemptsLeft?: number; locked?: boolean }

export const deliverPickupWithCode = async (input: { slug: string; orderId: string; code: string }): Promise<DeliverPickupResult> => {
  const parsed = deliverPickupWithCodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Código inválido.' }
  const { slug, orderId, code } = parsed.data

  try {
    const { user, store } = await authorizeStore(slug)
    const verification = await verifyPickupCode(store, user.id, Number(orderId), code)
    if (!verification.verified) {
      revalidateOrder(slug, orderId)
      return verification.locked
        ? {
            ok: false,
            locked: true,
            attemptsLeft: 0,
            error: 'Código incorrecto. Se bloqueó por demasiados intentos: reenvía uno nuevo o entrega con identificación.',
          }
        : {
            ok: false,
            attemptsLeft: verification.attemptsLeft,
            error: `Código incorrecto. Te ${verification.attemptsLeft === 1 ? 'queda 1 intento' : `quedan ${verification.attemptsLeft} intentos`}.`,
          }
    }

    const result = await changeStatus(store, slug, orderId, 'completed')
    return result.ok ? { ok: true, label: result.label, push: result.push } : result
  } catch (error) {
    return accessError(error)
  }
}

export const deliverPickupWithId = async (input: DeliverPickupWithIdValues & { slug: string; orderId: string }): Promise<DeliverPickupResult> => {
  const parsed = deliverPickupWithIdSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' }
  const { slug, orderId, reason } = parsed.data

  try {
    const { user, store } = await authorizeStore(slug)
    await verifyPickupWithId(store, user.id, Number(orderId), reason)
    const result = await changeStatus(store, slug, orderId, 'completed')
    return result.ok ? { ok: true, label: result.label, push: result.push } : result
  } catch (error) {
    return accessError(error)
  }
}

export const retryShopifySync = async (input: { slug: string; orderId: string }): Promise<UpdateOrderStatusResult> => {
  const parsed = pickupOrderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' }
  const { slug, orderId } = parsed.data

  try {
    const { store } = await authorizeStore(slug)
    const supabase = await createClient()
    const { data } = await supabase
      .from('store_orders')
      .select('status, delivery_method')
      .eq('order_id', Number(orderId))
      .eq('hardware_store_id', store.id)
      .maybeSingle()
    if (!data) return { ok: false, error: 'No encontrado.' }

    const push = await pushStatusToShopify(Number(orderId), store, null, data.status)
    revalidateOrder(slug, orderId)
    return { ok: true, status: data.status, label: statusLabel(data.status, data.delivery_method), push }
  } catch (error) {
    return accessError(error)
  }
}
