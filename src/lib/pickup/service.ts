import 'server-only'
import type { StoreDTO } from '@/lib/auth/dal'
import { sendEmail } from '@/lib/email/mailer'
import { getPickupCodeSecret } from '@/lib/env'
import { customerNameOf } from '@/lib/orders/map-order'
import { shopifyAdminQuery } from '@/lib/shopify/client'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MAX_FAILED_ATTEMPTS,
  MAX_SENDS,
  RESEND_COOLDOWN_MS,
  generatePickupCode,
  hashPickupCode,
  maskEmail,
  normalizePickupCode,
  pickupCodeMatches,
} from './code'
import { buildPickupEmail } from './email-template'

// RN-27. Corre con el cliente admin porque la tabla de códigos es interna; quien llama
// ya autorizó la ferretería con el DAL. La ferretería nunca recibe el código ni el
// correo completo del cliente.

export class PickupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PickupError'
  }
}

export type PickupStatus = {
  sentToMasked: string | null
  sentAt: string | null
  sendCount: number
  sendsLeft: number
  lastSendError: string | null
  attemptsLeft: number
  locked: boolean
  verifiedAt: string | null
  verificationMethod: 'code' | 'id_document' | null
  overrideReason: string | null
}

const scopeOf = (orderId: number, storeId: string) => `${orderId}:${storeId}`

const ORDER_CONTACT_QUERY = /* GraphQL */ `
  query PickupOrderContact($id: ID!, $locationId: ID!) {
    order(id: $id) {
      name
      email
      customer { displayName }
    }
    location(id: $locationId) {
      name
      address { formatted }
    }
  }
`

type PickupCodeRow = {
  code_hash: string | null
  sent_to_masked: string | null
  sent_at: string | null
  send_count: number
  last_send_error: string | null
  failed_attempts: number
  locked_at: string | null
  verified_at: string | null
  verification_method: string | null
  override_reason: string | null
}

const COLUMNS =
  'code_hash, sent_to_masked, sent_at, send_count, last_send_error, failed_attempts, locked_at, verified_at, verification_method, override_reason'

const readRow = async (orderId: number, storeId: string) => {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('store_order_pickup_codes')
    .select(COLUMNS)
    .eq('order_id', orderId)
    .eq('hardware_store_id', storeId)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer el código de recogida: ${error.message}`)
  return data as PickupCodeRow | null
}

const toStatus = (row: PickupCodeRow): PickupStatus => ({
  sentToMasked: row.sent_to_masked,
  sentAt: row.sent_at,
  sendCount: row.send_count,
  sendsLeft: Math.max(MAX_SENDS - row.send_count, 0),
  lastSendError: row.last_send_error,
  attemptsLeft: Math.max(MAX_FAILED_ATTEMPTS - row.failed_attempts, 0),
  locked: Boolean(row.locked_at),
  verifiedAt: row.verified_at,
  verificationMethod: (row.verification_method as PickupStatus['verificationMethod']) ?? null,
  overrideReason: row.override_reason,
})

export const getPickupStatus = async (storeId: string, orderId: number): Promise<PickupStatus | null> => {
  const row = await readRow(orderId, storeId)
  return row ? toStatus(row) : null
}

// La orden de la ferretería debe ser pickup y estar lista para recoger.
const requireReadyPickup = async (orderId: number, storeId: string) => {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('store_orders')
    .select('order_name, status, delivery_method')
    .eq('order_id', orderId)
    .eq('hardware_store_id', storeId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new PickupError('No encontrado.')
  if (data.delivery_method !== 'pickup') throw new PickupError('Esta orden no es de pickup.')
  if (data.status !== 'ready_for_pickup') throw new PickupError('La orden debe estar en Listo para recoger.')
  return data
}

const saveSendError = async (orderId: number, storeId: string, message: string) => {
  const admin = createAdminClient()
  await admin
    .from('store_order_pickup_codes')
    .upsert(
      { order_id: orderId, hardware_store_id: storeId, last_send_error: message },
      { onConflict: 'order_id,hardware_store_id' }
    )
}

// Genera un código nuevo (el anterior deja de servir) y lo envía al correo del cliente.
export const issuePickupCode = async (store: StoreDTO, orderId: number, { resend = false } = {}) => {
  const order = await requireReadyPickup(orderId, store.id)
  const current = await readRow(orderId, store.id)

  if (current?.verified_at) throw new PickupError('El cliente ya fue verificado.')
  if (current && current.send_count >= MAX_SENDS) {
    throw new PickupError(`Ya se enviaron ${MAX_SENDS} códigos para esta orden. Usa la entrega con identificación.`)
  }
  if (current?.sent_at && Date.now() - new Date(current.sent_at).getTime() < RESEND_COOLDOWN_MS) {
    const seconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(current.sent_at).getTime())) / 1000)
    throw new PickupError(`Espera ${seconds} segundos antes de reenviar el código.`)
  }

  const contact = await shopifyAdminQuery<{
    order: { name: string; email: string | null; customer: { displayName: string | null } | null } | null
    location: { name: string; address: { formatted: string[] } | null } | null
  }>(ORDER_CONTACT_QUERY, { id: `gid://shopify/Order/${orderId}`, locationId: store.locationId })

  const email = contact.order?.email?.trim()
  if (!email) {
    const message =
      'Shopify no devolvió el correo del cliente: la orden no tiene correo o la app no tiene permiso para leerlo.'
    await saveSendError(orderId, store.id, message)
    throw new PickupError(message)
  }

  const admin = createAdminClient()
  const { data: lines } = await admin
    .from('shopify_order_lines')
    .select('title, variant_title, current_quantity')
    .eq('order_id', orderId)
    .eq('hardware_store_id', store.id)
    .gt('current_quantity', 0)
    .order('title')

  const code = generatePickupCode()
  const message = buildPickupEmail({
    customerName: customerNameOf({ customer: contact.order?.customer ?? null }),
    orderName: contact.order?.name ?? order.order_name,
    storeName: store.name,
    code,
    address: contact.location?.address?.formatted.filter(Boolean).join(', ') || null,
    items: (lines ?? []).map((line) => ({
      title: line.title,
      variantTitle: line.variant_title,
      quantity: line.current_quantity,
    })),
    resent: resend || Boolean(current?.sent_at),
  })

  // Primero se envía: si el correo falla, el código anterior sigue siendo el válido.
  try {
    await sendEmail({ to: email, ...message })
  } catch (error) {
    console.error('[pickup] envío de correo', error)
    const reason = 'No se pudo enviar el correo con el código. Intenta de nuevo en unos minutos.'
    await saveSendError(orderId, store.id, reason)
    throw new PickupError(reason)
  }

  const sentToMasked = maskEmail(email)
  const { error } = await admin.from('store_order_pickup_codes').upsert(
    {
      order_id: orderId,
      hardware_store_id: store.id,
      code_hash: hashPickupCode(code, getPickupCodeSecret(), scopeOf(orderId, store.id)),
      sent_to_masked: sentToMasked,
      sent_at: new Date().toISOString(),
      send_count: (current?.send_count ?? 0) + 1,
      last_send_error: null,
      failed_attempts: 0,
      locked_at: null,
    },
    { onConflict: 'order_id,hardware_store_id' }
  )
  if (error) throw new Error(`No se pudo guardar el código: ${error.message}`)

  return { sentToMasked }
}

// Compara el código que dicta el cliente. Cuenta los intentos fallidos de forma atómica
// (compare-and-swap sobre failed_attempts) y bloquea al llegar al máximo.
export const verifyPickupCode = async (store: StoreDTO, userId: string, orderId: number, rawCode: string) => {
  await requireReadyPickup(orderId, store.id)
  const code = normalizePickupCode(rawCode)
  const admin = createAdminClient()

  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readRow(orderId, store.id)
    if (row?.verified_at) return { verified: true as const }
    if (!row?.code_hash) throw new PickupError('Esta orden no tiene un código enviado. Envíalo primero.')
    if (row.locked_at) {
      throw new PickupError('El código se bloqueó por demasiados intentos. Reenvía uno nuevo o entrega con identificación.')
    }

    if (pickupCodeMatches(code, row.code_hash, getPickupCodeSecret(), scopeOf(orderId, store.id))) {
      const { error } = await admin
        .from('store_order_pickup_codes')
        .update({ verified_at: new Date().toISOString(), verified_by: userId, verification_method: 'code' })
        .eq('order_id', orderId)
        .eq('hardware_store_id', store.id)
        .is('verified_at', null)
      if (error) throw new Error(error.message)
      return { verified: true as const }
    }

    const failed = row.failed_attempts + 1
    const locked = failed >= MAX_FAILED_ATTEMPTS
    const { data } = await admin
      .from('store_order_pickup_codes')
      .update({ failed_attempts: failed, locked_at: locked ? new Date().toISOString() : null })
      .eq('order_id', orderId)
      .eq('hardware_store_id', store.id)
      .eq('failed_attempts', row.failed_attempts)
      .select('failed_attempts')
    if (data && data.length > 0) {
      return { verified: false as const, attemptsLeft: MAX_FAILED_ATTEMPTS - failed, locked }
    }
    // Otro intento cambió el contador al mismo tiempo: se vuelve a leer.
  }
  throw new PickupError('No se pudo verificar el código. Intenta de nuevo.')
}

// Excepción de RN-27: sin código, con identificación oficial y motivo.
export const verifyPickupWithId = async (store: StoreDTO, userId: string, orderId: number, reason: string) => {
  await requireReadyPickup(orderId, store.id)
  if ((await readRow(orderId, store.id))?.verified_at) return
  const admin = createAdminClient()
  const { error } = await admin.from('store_order_pickup_codes').upsert(
    {
      order_id: orderId,
      hardware_store_id: store.id,
      verified_at: new Date().toISOString(),
      verified_by: userId,
      verification_method: 'id_document',
      override_reason: reason.trim(),
    },
    { onConflict: 'order_id,hardware_store_id' }
  )
  if (error) throw new Error(`No se pudo registrar la entrega: ${error.message}`)
}
