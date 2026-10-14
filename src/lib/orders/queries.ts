import 'server-only'
import { zonedRange } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import type { OrderListFilters, OrderTab } from '@/lib/validations/order'
import type { DeliveryMethod, PreparationStatus } from './status'

// Las órdenes se leen solo de Supabase con la sesión del usuario: el RLS garantiza
// que cada ferretería vea únicamente sus filas (RN-14, RN-15).

export const ORDERS_PAGE_SIZE = 20

const TAB_STATUSES: Record<OrderTab, PreparationStatus[] | null> = {
  'por-preparar': ['preparing'],
  listas: ['ready_for_pickup', 'ready_to_ship'],
  completadas: ['completed'],
  canceladas: ['cancelled'],
  todas: null,
}

const SUMMARY_COLUMNS =
  'order_id, order_name, processed_at, customer_display_name, financial_status, is_test, order_cancelled_at, delivery_method, lines_count, units, net_amount, currency, status, status_changed_at, shopify_push_status'

export type StoreOrderSummary = {
  orderId: string
  name: string
  processedAt: string
  customerName: string | null
  financialStatus: string | null
  isTest: boolean
  cancelledAt: string | null
  deliveryMethod: DeliveryMethod
  linesCount: number
  units: number
  netAmount: number
  currency: string
  status: PreparationStatus
  statusChangedAt: string | null
  shopifyPushStatus: string | null
}

type SummaryRow = {
  order_id: number
  order_name: string
  processed_at: string
  customer_display_name: string | null
  financial_status: string | null
  is_test: boolean
  order_cancelled_at: string | null
  delivery_method: DeliveryMethod
  lines_count: number
  units: number
  net_amount: number
  currency: string
  status: PreparationStatus
  status_changed_at: string | null
  shopify_push_status: string | null
}

const toSummary = (row: SummaryRow): StoreOrderSummary => ({
  orderId: String(row.order_id),
  name: row.order_name,
  processedAt: row.processed_at,
  customerName: row.customer_display_name,
  financialStatus: row.financial_status,
  isTest: row.is_test,
  cancelledAt: row.order_cancelled_at,
  deliveryMethod: row.delivery_method,
  linesCount: row.lines_count,
  units: row.units,
  netAmount: Number(row.net_amount),
  currency: row.currency,
  status: row.status,
  statusChangedAt: row.status_changed_at,
  shopifyPushStatus: row.shopify_push_status,
})

export const listStoreOrders = async (storeId: string, filters: OrderListFilters) => {
  const supabase = await createClient()
  const page = filters.pagina
  const fromIndex = (page - 1) * ORDERS_PAGE_SIZE

  let query = supabase
    .from('store_orders')
    .select(SUMMARY_COLUMNS, { count: 'exact' })
    .eq('hardware_store_id', storeId)

  const statuses = TAB_STATUSES[filters.estado]
  if (statuses) query = query.in('status', statuses)

  if (filters.metodo === 'pickup') query = query.eq('delivery_method', 'pickup')
  if (filters.metodo === 'envio') query = query.neq('delivery_method', 'pickup')

  if (filters.desde || filters.hasta) {
    const range = zonedRange(filters.desde ?? '2000-01-01', filters.hasta ?? '2999-12-31')
    query = query.gte('processed_at', range.from.toISOString()).lt('processed_at', range.to.toISOString())
  }

  if (filters.q) {
    // q ya viene saneado (solo letras, números, espacios y guiones).
    const pattern = `"%${filters.q}%"`
    query = query.or(`order_name.ilike.${pattern},customer_display_name.ilike.${pattern}`)
  }

  const { data, error, count } = await query
    .order('processed_at', { ascending: false })
    .order('order_id', { ascending: false })
    .range(fromIndex, fromIndex + ORDERS_PAGE_SIZE - 1)

  if (error) throw new Error(`No se pudieron leer las órdenes: ${error.message}`)

  const total = count ?? 0
  return {
    orders: (data ?? []).map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  }
}

export const countStoreOrdersByTab = async (storeId: string) => {
  const supabase = await createClient()

  const countFor = async (statuses: PreparationStatus[] | null) => {
    let query = supabase
      .from('store_orders')
      .select('order_id', { count: 'exact', head: true })
      .eq('hardware_store_id', storeId)
    if (statuses) query = query.in('status', statuses)
    const { count, error } = await query
    if (error) throw new Error(`No se pudieron contar las órdenes: ${error.message}`)
    return count ?? 0
  }

  const entries = await Promise.all(
    (Object.entries(TAB_STATUSES) as [OrderTab, PreparationStatus[] | null][]).map(
      async ([tab, statuses]) => [tab, await countFor(statuses)] as const
    )
  )
  return Object.fromEntries(entries) as Record<OrderTab, number>
}

export const listRecentStoreOrders = async (storeId: string, limit = 5) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_orders')
    .select(SUMMARY_COLUMNS)
    .eq('hardware_store_id', storeId)
    .order('processed_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`No se pudieron leer las órdenes: ${error.message}`)
  return (data ?? []).map(toSummary)
}

export type StoreOrderLine = {
  id: string
  title: string
  variantTitle: string | null
  sku: string | null
  imageUrl: string | null
  quantity: number
  currentQuantity: number
  unfulfilledQuantity: number
  originalUnitPrice: number
  discountedUnitPrice: number
  netTotal: number
  deliveryMethod: DeliveryMethod | null
}

export type StoreOrderEvent = {
  id: number
  from: PreparationStatus | null
  to: PreparationStatus
  source: 'panel' | 'shopify'
  changedBy: string | null
  createdAt: string
}

export type StoreOrderDetail = StoreOrderSummary & {
  grossAmount: number
  discountAmount: number
  refundedAmount: number
  shopifyPushError: string | null
  lines: StoreOrderLine[]
  events: StoreOrderEvent[]
}

// Devuelve null si la orden no existe o no tiene líneas de la ferretería; la página
// responde 404 en ambos casos (RN-08).
export const getStoreOrder = async (storeId: string, orderId: string): Promise<StoreOrderDetail | null> => {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('store_orders')
    .select(`${SUMMARY_COLUMNS}, gross_amount, discount_amount, refunded_amount, shopify_push_error`)
    .eq('hardware_store_id', storeId)
    .eq('order_id', Number(orderId))
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer la orden: ${error.message}`)
  if (!order) return null

  const [linesResult, eventsResult] = await Promise.all([
    supabase
      .from('shopify_order_lines')
      .select(
        'gid, title, variant_title, sku, image_url, quantity, current_quantity, unfulfilled_quantity, original_unit_price, discounted_unit_price, delivery_method'
      )
      .eq('hardware_store_id', storeId)
      .eq('order_id', Number(orderId))
      .order('title'),
    supabase
      .from('store_order_status_events')
      .select('id, from_status, to_status, source, changed_by, created_at')
      .eq('hardware_store_id', storeId)
      .eq('order_id', Number(orderId))
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
  ])
  if (linesResult.error) throw new Error(`No se pudieron leer las líneas: ${linesResult.error.message}`)
  if (eventsResult.error) throw new Error(`No se pudo leer el historial: ${eventsResult.error.message}`)

  return {
    ...toSummary(order),
    grossAmount: Number(order.gross_amount),
    discountAmount: Number(order.discount_amount),
    refundedAmount: Number(order.refunded_amount),
    shopifyPushError: order.shopify_push_error,
    lines: linesResult.data.map((line) => ({
      id: line.gid,
      title: line.title,
      variantTitle: line.variant_title,
      sku: line.sku,
      imageUrl: line.image_url,
      quantity: line.quantity,
      currentQuantity: line.current_quantity,
      unfulfilledQuantity: line.unfulfilled_quantity,
      originalUnitPrice: Number(line.original_unit_price),
      discountedUnitPrice: Number(line.discounted_unit_price),
      netTotal: Math.round(line.current_quantity * Number(line.discounted_unit_price) * 100) / 100,
      deliveryMethod: line.delivery_method,
    })),
    events: eventsResult.data.map((event) => ({
      id: event.id,
      from: event.from_status,
      to: event.to_status,
      source: event.source as 'panel' | 'shopify',
      changedBy: event.changed_by,
      createdAt: event.created_at,
    })),
  }
}
