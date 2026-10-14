import 'server-only'
import type { StoreDTO } from '@/lib/auth/dal'
import { getShopifyEnv } from '@/lib/env'
import type { PreparationStatus } from '@/lib/orders/status'
import { createAdminClient } from '@/lib/supabase/admin'
import { shopifyAdminQuery } from './client'
import type { UserError } from './types'

// Fase 5b: refleja en Shopify los cambios de estado del panel (RN-23). Solo corre con
// SHOPIFY_FULFILLMENT_SYNC=true. Si Shopify falla, el estado en Supabase se conserva
// y la interfaz ofrece "Reintentar".
//
// "Listo para recoger" no se marca en la entrega de Shopify, porque eso dispara su
// propio correo sin el código: el aviso con el código lo envía el backoffice (RN-27)
// y en Shopify solo se etiqueta la orden.

type PushStatus = 'pending' | 'ok' | 'failed' | 'skipped'
export type PushResult = { status: PushStatus; message: string | null }

const FULFILLMENT_ORDER_QUERY = /* GraphQL */ `
  query FulfillmentOrderForPush($id: ID!) {
    fulfillmentOrder(id: $id) {
      id
      status
      deliveryMethod { methodType }
      lineItems(first: 250) {
        nodes { id remainingQuantity lineItem { id } }
      }
    }
  }
`

const FULFILLMENT_CREATE = /* GraphQL */ `
  mutation DeliverPickup($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment { id status }
      userErrors { field message }
    }
  }
`

const TAGS_ADD = /* GraphQL */ `
  mutation TagReadyToShip($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
  }
`

const TAGS_REMOVE = /* GraphQL */ `
  mutation UntagReadyToShip($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) { userErrors { field message } }
  }
`

type FulfillmentOrderForPush = {
  id: string
  status: string
  deliveryMethod: { methodType: string } | null
  lineItems: { nodes: { id: string; remainingQuantity: number; lineItem: { id: string } }[] }
}

const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS'])

const userErrorMessage = (errors: UserError[]) => errors.map((error) => error.message).join('; ')

const readyToShipTag = (store: StoreDTO) => `listo-envio:${store.slug}`
const readyForPickupTag = (store: StoreDTO) => `listo-recoger:${store.slug}`

const orderGid = (orderId: number) => `gid://shopify/Order/${orderId}`

// Líneas de la ferretería en esta orden, con su entrega de Shopify.
const storeLines = async (orderId: number, storeId: string) => {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shopify_order_lines')
    .select('gid, fulfillment_order_gid, current_quantity')
    .eq('order_id', orderId)
    .eq('hardware_store_id', storeId)
    .gt('current_quantity', 0)
  if (error) throw new Error(error.message)
  return data
}

const fetchFulfillmentOrder = async (id: string) => {
  const { fulfillmentOrder } = await shopifyAdminQuery<{ fulfillmentOrder: FulfillmentOrderForPush | null }>(
    FULFILLMENT_ORDER_QUERY,
    { id }
  )
  return fulfillmentOrder
}

// Entregado: cierra en Shopify solo las líneas de la ferretería, sin avisar al cliente.
const markDelivered = async (orderId: number, store: StoreDTO): Promise<PushResult> => {
  const lines = await storeLines(orderId, store.id)
  const lineIds = new Set(lines.map((line) => line.gid))
  const fulfillmentOrderIds = [...new Set(lines.map((line) => line.fulfillment_order_gid).filter(Boolean))] as string[]

  const lineItemsByFulfillmentOrder: { fulfillmentOrderId: string; fulfillmentOrderLineItems: { id: string; quantity: number }[] }[] = []
  for (const fulfillmentOrderId of fulfillmentOrderIds) {
    const fulfillmentOrder = await fetchFulfillmentOrder(fulfillmentOrderId)
    if (!fulfillmentOrder || !OPEN_STATUSES.has(fulfillmentOrder.status)) continue
    const items = fulfillmentOrder.lineItems.nodes
      .filter((item) => lineIds.has(item.lineItem.id) && item.remainingQuantity > 0)
      .map((item) => ({ id: item.id, quantity: item.remainingQuantity }))
    if (items.length > 0) lineItemsByFulfillmentOrder.push({ fulfillmentOrderId, fulfillmentOrderLineItems: items })
  }

  if (lineItemsByFulfillmentOrder.length === 0) {
    return { status: 'skipped', message: 'No hay líneas pendientes de cerrar en Shopify.' }
  }

  const { fulfillmentCreate } = await shopifyAdminQuery<{ fulfillmentCreate: { userErrors: UserError[] } }>(
    FULFILLMENT_CREATE,
    { fulfillment: { lineItemsByFulfillmentOrder, notifyCustomer: false } }
  )
  if (fulfillmentCreate.userErrors.length > 0) {
    return { status: 'failed', message: userErrorMessage(fulfillmentCreate.userErrors) }
  }
  return { status: 'ok', message: null }
}

// Etiqueta la orden para que LaFerrey vea en Shopify qué está listo en cada ferretería.
const setReadyTag = async (orderId: number, tag: string, add: boolean): Promise<PushResult> => {
  const mutation = add ? TAGS_ADD : TAGS_REMOVE
  const data = await shopifyAdminQuery<Record<string, { userErrors: UserError[] }>>(mutation, {
    id: orderGid(orderId),
    tags: [tag],
  })
  const errors = Object.values(data)[0].userErrors
  return errors.length > 0 ? { status: 'failed', message: userErrorMessage(errors) } : { status: 'ok', message: null }
}

const savePushResult = async (orderId: number, storeId: string, result: PushResult) => {
  const admin = createAdminClient()
  await admin
    .from('store_orders')
    .update({ shopify_push_status: result.status, shopify_push_error: result.message })
    .eq('order_id', orderId)
    .eq('hardware_store_id', storeId)
}

// Refleja en Shopify el cambio `from → to` y guarda el resultado. Nunca lanza.
export const pushStatusToShopify = async (
  orderId: number,
  store: StoreDTO,
  from: PreparationStatus | null,
  to: PreparationStatus
): Promise<PushResult | null> => {
  if (!getShopifyEnv().fulfillmentSync) return null

  let result: PushResult
  try {
    if (to === 'ready_for_pickup') result = await setReadyTag(orderId, readyForPickupTag(store), true)
    else if (to === 'ready_to_ship') result = await setReadyTag(orderId, readyToShipTag(store), true)
    else if (to === 'preparing' && from === 'ready_to_ship') result = await setReadyTag(orderId, readyToShipTag(store), false)
    else if (to === 'preparing' && from === 'ready_for_pickup') {
      result = await setReadyTag(orderId, readyForPickupTag(store), false)
    } else if (to === 'completed') {
      result = await markDelivered(orderId, store)
      if (result.status !== 'failed') await setReadyTag(orderId, readyForPickupTag(store), false)
    } else return null
  } catch (error) {
    result = { status: 'failed', message: error instanceof Error ? error.message : String(error) }
  }

  await savePushResult(orderId, store.id, result)
  return result
}
