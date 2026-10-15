import 'server-only'
import {
  mapOrderForSync,
  type ExistingStoreOrder,
  type MappedOrder,
  type ShopifyOrderForSync,
  type ShopifyOrderLine,
  type SyncStore,
} from '@/lib/orders/map-order'
import type { PreparationStatus } from '@/lib/orders/status'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesInsert } from '@/lib/supabase/database.types'
import { shopifyAdminQuery } from './client'
import type { PageInfo } from './types'
import { normalizeVendor } from './vendor'

// Shopify → Supabase. Corre con el cliente admin (secret key) desde el webhook, el
// cron y los scripts. Es idempotente: sincronizar dos veces la misma orden no cambia nada.

const ORDER_LINE_FIELDS = /* GraphQL */ `
  fragment OrderLineForSync on LineItem {
    id
    vendor
    title
    variantTitle
    sku
    quantity
    currentQuantity
    unfulfilledQuantity
    product { id }
    variant { id }
    image { url }
    originalUnitPriceSet { shopMoney { amount } }
    discountedUnitPriceAfterAllDiscountsSet { shopMoney { amount } }
    originalTotalSet { shopMoney { amount } }
    discountedTotalSet { shopMoney { amount } }
  }
`

const ORDER_FIELDS = /* GraphQL */ `
  ${ORDER_LINE_FIELDS}
  fragment OrderForSync on Order {
    id
    legacyResourceId
    name
    processedAt
    createdAt
    updatedAt
    cancelledAt
    cancelReason
    closedAt
    test
    displayFinancialStatus
    displayFulfillmentStatus
    currencyCode
    sourceName
    customer { displayName }
    lineItems(first: 250) {
      nodes { ...OrderLineForSync }
      pageInfo { hasNextPage endCursor }
    }
    fulfillmentOrders(first: 50) {
      nodes {
        id
        status
        deliveryMethod { methodType }
        assignedLocation { location { id } }
        lineItems(first: 250) {
          nodes { id remainingQuantity totalQuantity lineItem { id } }
        }
      }
    }
  }
`

const ORDER_QUERY = /* GraphQL */ `
  ${ORDER_FIELDS}
  query OrderForSync($id: ID!) {
    order(id: $id) { ...OrderForSync }
  }
`

const ORDERS_UPDATED_SINCE_QUERY = /* GraphQL */ `
  ${ORDER_FIELDS}
  query OrdersUpdatedSince($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
      nodes { ...OrderForSync }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const ORDER_LINES_PAGE_QUERY = /* GraphQL */ `
  ${ORDER_LINE_FIELDS}
  query OrderLinesPage($id: ID!, $after: String) {
    order(id: $id) {
      lineItems(first: 250, after: $after) {
        nodes { ...OrderLineForSync }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

// Con 250 líneas y entregas anidadas, cada orden cuesta ~150 puntos: 5 por página
// mantiene la consulta por debajo del máximo de 1000.
const ORDERS_PAGE_SIZE = 5

// Al reanudar desde el cursor se repite un minuto para no perder órdenes con el
// mismo updatedAt; volver a sincronizarlas no tiene efecto.
const CURSOR_OVERLAP_MS = 60_000

const SYNC_STATE_KEY = 'orders'

type OrderWithLinePage = Omit<ShopifyOrderForSync, 'lineItems'> & {
  lineItems: { nodes: ShopifyOrderLine[]; pageInfo: PageInfo }
}

export type OrderSyncResult = {
  orderId: number
  name: string
  storeOrders: number
  statusChanges: { storeId: string; from: PreparationStatus; to: PreparationStatus }[]
  warnings: string[]
}

const orderIdFromGid = (gid: string) => {
  const match = /^gid:\/\/shopify\/Order\/(\d+)$/.exec(gid)
  if (!match) throw new Error(`GID de orden inválido: ${gid}`)
  return Number(match[1])
}

export const orderGid = (id: number | string) => `gid://shopify/Order/${id}`

// Una orden con más de 250 líneas trae el resto en páginas adicionales.
const withAllLines = async (order: OrderWithLinePage): Promise<ShopifyOrderForSync> => {
  const nodes = [...order.lineItems.nodes]
  let pageInfo = order.lineItems.pageInfo

  while (pageInfo.hasNextPage && pageInfo.endCursor) {
    const data = await shopifyAdminQuery<{
      order: { lineItems: { nodes: ShopifyOrderLine[]; pageInfo: PageInfo } } | null
    }>(ORDER_LINES_PAGE_QUERY, { id: order.id, after: pageInfo.endCursor })
    if (!data.order) break
    nodes.push(...data.order.lineItems.nodes)
    pageInfo = data.order.lineItems.pageInfo
  }

  return { ...order, lineItems: { nodes } }
}

const loadStores = async (): Promise<SyncStore[]> => {
  const admin = createAdminClient()
  const { data, error } = await admin.from('hardware_stores').select('id, shopify_vendor')
  if (error) throw new Error(`No se pudieron leer las ferreterías: ${error.message}`)
  return data.map((store) => ({ id: store.id, vendorKey: normalizeVendor(store.shopify_vendor) }))
}

const loadExisting = async (orderId: number): Promise<ExistingStoreOrder[]> => {
  const admin = createAdminClient()
  const [orders, lines] = await Promise.all([
    admin.from('store_orders').select('hardware_store_id, status, units').eq('order_id', orderId),
    admin.from('shopify_order_lines').select('gid, hardware_store_id').eq('order_id', orderId),
  ])
  if (orders.error) throw new Error(`No se pudieron leer las órdenes guardadas: ${orders.error.message}`)
  if (lines.error) throw new Error(`No se pudieron leer las líneas guardadas: ${lines.error.message}`)

  return orders.data.map((row) => ({
    storeId: row.hardware_store_id,
    status: row.status,
    units: row.units,
    lineGids: lines.data.filter((line) => line.hardware_store_id === row.hardware_store_id).map((line) => line.gid),
  }))
}

const quoteList = (values: string[]) => `(${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(',')})`

// Los montos viajan como texto decimal ("356.23"): PostgREST los acepta en columnas
// numeric y así nunca pasan por float. Los tipos generados los declaran como number.
const asInsert = <T extends 'shopify_order_lines' | 'store_orders'>(rows: unknown[]) =>
  rows as TablesInsert<T>[]

const persist = async ({ order, lines, storeOrders, statusChanges }: MappedOrder) => {
  const admin = createAdminClient()

  const orderResult = await admin.from('shopify_orders').upsert({ ...order, synced_at: new Date().toISOString() })
  if (orderResult.error) throw new Error(`No se pudo guardar la orden: ${orderResult.error.message}`)

  if (lines.length > 0) {
    const { error } = await admin
      .from('shopify_order_lines')
      .upsert(asInsert<'shopify_order_lines'>(lines), { onConflict: 'gid' })
    if (error) throw new Error(`No se pudieron guardar las líneas: ${error.message}`)
  }

  let staleLines = admin.from('shopify_order_lines').delete().eq('order_id', order.id)
  if (lines.length > 0) staleLines = staleLines.not('gid', 'in', quoteList(lines.map((line) => line.gid)))
  const staleResult = await staleLines
  if (staleResult.error) throw new Error(`No se pudieron limpiar las líneas: ${staleResult.error.message}`)

  if (storeOrders.length > 0) {
    // Sin `status`: al insertar queda en preparing y al actualizar se conserva.
    const { error } = await admin
      .from('store_orders')
      .upsert(asInsert<'store_orders'>(storeOrders), { onConflict: 'order_id,hardware_store_id' })
    if (error) throw new Error(`No se pudieron guardar las órdenes de las ferreterías: ${error.message}`)
  }

  // Update aparte para que el trigger registre el cambio con source = 'shopify' (RN-22).
  for (const change of statusChanges) {
    const { error } = await admin
      .from('store_orders')
      .update({ status: change.to })
      .eq('order_id', order.id)
      .eq('hardware_store_id', change.storeId)
    if (error) throw new Error(`No se pudo actualizar el estado: ${error.message}`)
  }
}

const syncOrder = async (order: OrderWithLinePage, stores: SyncStore[]): Promise<OrderSyncResult> => {
  const full = await withAllLines(order)
  const orderId = Number(full.legacyResourceId)
  const mapped = mapOrderForSync(full, stores, await loadExisting(orderId))
  await persist(mapped)

  for (const warning of mapped.warnings) console.warn(`[sync] ${full.name}: ${warning}`)

  return {
    orderId,
    name: full.name,
    storeOrders: mapped.storeOrders.length,
    statusChanges: mapped.statusChanges.map(({ storeId, from, to }) => ({ storeId, from, to })),
    warnings: mapped.warnings,
  }
}

// ORDERS_DELETE: la cascada borra líneas, órdenes de ferretería e historial.
export const deleteSyncedOrder = async (orderId: number) => {
  const admin = createAdminClient()
  const { error } = await admin.from('shopify_orders').delete().eq('id', orderId)
  if (error) throw new Error(`No se pudo borrar la orden: ${error.message}`)
}

export const syncOrderById = async (gid: string): Promise<OrderSyncResult | { orderId: number; deleted: true }> => {
  const orderId = orderIdFromGid(gid)
  const { order } = await shopifyAdminQuery<{ order: OrderWithLinePage | null }>(ORDER_QUERY, { id: gid })

  if (!order) {
    await deleteSyncedOrder(orderId)
    return { orderId, deleted: true }
  }

  return syncOrder(order, await loadStores())
}

export type BulkSyncSummary = {
  from: string | null
  cursor: string | null
  orders: number
  statusChanges: number
  failures: { name: string; error: string }[]
}

const readCursor = async () => {
  const admin = createAdminClient()
  const { data, error } = await admin.from('shopify_sync_state').select('cursor').eq('key', SYNC_STATE_KEY).maybeSingle()
  if (error) throw new Error(`No se pudo leer el cursor: ${error.message}`)
  return data?.cursor ?? null
}

const writeSyncState = async (state: { cursor?: string | null; last_error: string | null }) => {
  const admin = createAdminClient()
  const { error } = await admin
    .from('shopify_sync_state')
    .upsert({ key: SYNC_STATE_KEY, last_run_at: new Date().toISOString(), ...state })
  if (error) throw new Error(`No se pudo guardar el cursor: ${error.message}`)
}

// Reconciliación: sincroniza las órdenes actualizadas desde el último cursor (o todas
// con `full`) y guarda el nuevo cursor en shopify_sync_state.
export const syncOrdersUpdatedSince = async ({ full = false }: { full?: boolean } = {}): Promise<BulkSyncSummary> => {
  // Si la revisión termina sin errores, todo lo actualizado antes de este momento ya se
  // procesó: el cursor puede avanzar hasta aquí aunque no haya habido órdenes.
  const startedAt = new Date().toISOString()
  const previousCursor = full ? null : await readCursor()
  const since = previousCursor ? new Date(new Date(previousCursor).getTime() - CURSOR_OVERLAP_MS).toISOString() : null
  const stores = await loadStores()

  const summary: BulkSyncSummary = { from: since, cursor: previousCursor, orders: 0, statusChanges: 0, failures: [] }
  let after: string | null = null

  try {
    do {
      const { orders }: { orders: { nodes: OrderWithLinePage[]; pageInfo: PageInfo } } = await shopifyAdminQuery(
        ORDERS_UPDATED_SINCE_QUERY,
        { first: ORDERS_PAGE_SIZE, after, query: since ? `updated_at:>='${since}'` : null }
      )

      for (const order of orders.nodes) {
        try {
          const result = await syncOrder(order, stores)
          summary.orders += 1
          summary.statusChanges += result.statusChanges.length
        } catch (error) {
          summary.failures.push({ name: order.name, error: error instanceof Error ? error.message : String(error) })
        }
        // Avanza el cursor solo hasta la última orden sin fallas previas, para reintentarlas.
        if (summary.failures.length === 0 && (!summary.cursor || order.updatedAt > summary.cursor)) {
          summary.cursor = order.updatedAt
        }
      }

      after = orders.pageInfo.hasNextPage ? orders.pageInfo.endCursor : null
    } while (after)

    if (summary.failures.length === 0 && (!summary.cursor || startedAt > summary.cursor)) {
      summary.cursor = startedAt
    }
    await writeSyncState({
      cursor: summary.cursor,
      last_error: summary.failures.length > 0 ? `${summary.failures.length} órdenes con error` : null,
    })
  } catch (error) {
    await writeSyncState({ cursor: summary.cursor, last_error: error instanceof Error ? error.message : String(error) })
    throw error
  }

  return summary
}
