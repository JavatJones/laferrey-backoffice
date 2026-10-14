import { normalizeVendor } from '@/lib/shopify/vendor'
import type { DeliveryMethod, PreparationStatus } from './status'

// Mapeo puro de una orden de Shopify a las filas de Supabase. Sin efectos
// secundarios: recibe la orden, las ferreterías y el estado actual guardado, y
// devuelve qué escribir. Los montos se calculan en centavos enteros (nunca float).

// ---------------------------------------------------------------------------
// Forma de la orden según el fragmento OrderForSync (src/lib/shopify/orders-sync.ts)
// ---------------------------------------------------------------------------
type MoneySet = { shopMoney: { amount: string } }

export type ShopifyOrderLine = {
  id: string
  vendor: string | null
  title: string
  variantTitle: string | null
  sku: string | null
  quantity: number
  currentQuantity: number
  unfulfilledQuantity: number
  product: { id: string } | null
  variant: { id: string } | null
  image: { url: string } | null
  originalUnitPriceSet: MoneySet
  discountedUnitPriceAfterAllDiscountsSet: MoneySet
  originalTotalSet: MoneySet
  discountedTotalSet: MoneySet
}

export type ShopifyFulfillmentOrder = {
  id: string
  status: string
  deliveryMethod: { methodType: string } | null
  assignedLocation: { location: { id: string } | null } | null
  lineItems: { nodes: { id: string; remainingQuantity: number; totalQuantity: number; lineItem: { id: string } }[] }
}

export type ShopifyOrderForSync = {
  id: string
  legacyResourceId: string
  name: string
  processedAt: string
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  cancelReason: string | null
  closedAt: string | null
  test: boolean
  displayFinancialStatus: string | null
  displayFulfillmentStatus: string | null
  currencyCode: string
  sourceName: string | null
  customer: { displayName: string | null } | null
  lineItems: { nodes: ShopifyOrderLine[] }
  fulfillmentOrders: { nodes: ShopifyFulfillmentOrder[] }
}

// ---------------------------------------------------------------------------
// Entradas y salidas
// ---------------------------------------------------------------------------
export type SyncStore = { id: string; vendorKey: string }

// Estado guardado antes de esta sincronización, para decidir los cambios automáticos.
export type ExistingStoreOrder = {
  storeId: string
  status: PreparationStatus
  units: number
  lineGids: string[]
}

export type OrderRow = {
  id: number
  gid: string
  name: string
  processed_at: string
  shopify_created_at: string
  shopify_updated_at: string
  cancelled_at: string | null
  cancel_reason: string | null
  closed_at: string | null
  is_test: boolean
  financial_status: string | null
  fulfillment_status: string | null
  currency: string
  customer_display_name: string | null
  source_name: string | null
}

export type LineRow = {
  gid: string
  order_id: number
  hardware_store_id: string | null
  vendor: string | null
  product_gid: string | null
  variant_gid: string | null
  title: string
  variant_title: string | null
  sku: string | null
  image_url: string | null
  quantity: number
  current_quantity: number
  unfulfilled_quantity: number
  original_unit_price: string
  discounted_unit_price: string
  original_total: string
  discounted_total: string
  delivery_method: DeliveryMethod | null
  fulfillment_order_gid: string | null
  fulfillment_order_line_item_gid: string | null
  location_gid: string | null
}

// Sin `status`: al insertar queda en preparing y al actualizar no se toca.
export type StoreOrderRow = {
  order_id: number
  hardware_store_id: string
  order_name: string
  processed_at: string
  customer_display_name: string | null
  financial_status: string | null
  is_test: boolean
  order_cancelled_at: string | null
  delivery_method: DeliveryMethod
  currency: string
  lines_count: number
  units: number
  gross_amount: string
  discount_amount: string
  refunded_amount: string
  net_amount: string
}

export type StatusChange = { storeId: string; from: PreparationStatus; to: PreparationStatus; reason: string }

export type MappedOrder = {
  order: OrderRow
  lines: LineRow[]
  storeOrders: StoreOrderRow[]
  statusChanges: StatusChange[]
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Dinero en centavos
// ---------------------------------------------------------------------------
export const toCents = (amount: string): number => {
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(amount.trim())
  if (!match) throw new Error(`Monto inválido: ${amount}`)
  const [, sign, whole, fraction = ''] = match
  // Redondeo a 2 decimales con la tercera cifra (Shopify ya manda 2, pero por si acaso).
  const padded = `${fraction}000`
  let cents = Number(whole) * 100 + Number(padded.slice(0, 2))
  if (Number(padded[2]) >= 5) cents += 1
  return sign ? -cents : cents
}

export const fromCents = (cents: number): string => {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

const money = (set: MoneySet) => toCents(set.shopMoney.amount)

// RN-16: la ferretería solo ve el nombre. Si el cliente no tiene nombre, Shopify usa su
// correo (o teléfono) como displayName; en ese caso no se guarda.
export const customerNameOf = (order: Pick<ShopifyOrderForSync, 'customer'>) => {
  const name = order.customer?.displayName?.trim()
  if (!name || name.includes('@') || /^\+?[\d\s()-]{7,}$/.test(name)) return null
  return name
}

// ---------------------------------------------------------------------------
// Entrega
// ---------------------------------------------------------------------------
const DELIVERY_METHODS: Record<string, DeliveryMethod> = {
  PICK_UP: 'pickup',
  SHIPPING: 'shipping',
  LOCAL: 'local_delivery',
  PICKUP_POINT: 'pickup_point',
  RETAIL: 'retail',
  NONE: 'none',
}

const ACTIVE_FULFILLMENT_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'SCHEDULED', 'ON_HOLD', 'INCOMPLETE'])

// Prioridad al elegir la entrega de una línea que aparece en varias (p. ej. una
// entrega cerrada y otra nueva tras moverla de sucursal).
const fulfillmentPriority = (status: string, remaining: number) => {
  if (ACTIVE_FULFILLMENT_STATUSES.has(status) && remaining > 0) return 0
  if (ACTIVE_FULFILLMENT_STATUSES.has(status)) return 1
  if (status === 'CLOSED') return 2
  return 3
}

type LineDelivery = {
  method: DeliveryMethod | null
  fulfillmentOrderGid: string
  fulfillmentOrderLineItemGid: string
  locationGid: string | null
}

const deliveryByLine = (order: ShopifyOrderForSync, warnings: string[]) => {
  const candidates = new Map<string, (LineDelivery & { priority: number })[]>()

  for (const fulfillmentOrder of order.fulfillmentOrders.nodes) {
    const methodType = fulfillmentOrder.deliveryMethod?.methodType ?? null
    const method = methodType ? (DELIVERY_METHODS[methodType] ?? null) : null
    if (methodType && !method) warnings.push(`Método de entrega desconocido: ${methodType}`)

    for (const item of fulfillmentOrder.lineItems.nodes) {
      const list = candidates.get(item.lineItem.id) ?? []
      list.push({
        method,
        fulfillmentOrderGid: fulfillmentOrder.id,
        fulfillmentOrderLineItemGid: item.id,
        locationGid: fulfillmentOrder.assignedLocation?.location?.id ?? null,
        priority: fulfillmentPriority(fulfillmentOrder.status, item.remainingQuantity),
      })
      candidates.set(item.lineItem.id, list)
    }
  }

  const result = new Map<string, LineDelivery>()
  for (const [lineId, list] of candidates) {
    const [best] = [...list].sort((a, b) => a.priority - b.priority)
    result.set(lineId, best)
  }
  return result
}

// ---------------------------------------------------------------------------
// Estado automático (RN-20)
// ---------------------------------------------------------------------------
type StoreLines = { storeId: string; lines: LineRow[] }

const autoStatus = (
  order: ShopifyOrderForSync,
  { lines }: StoreLines,
  current: PreparationStatus,
  existing: ExistingStoreOrder | undefined
): { to: PreparationStatus; reason: string } | null => {
  const units = lines.reduce((sum, line) => sum + line.current_quantity, 0)
  const activeLines = lines.filter((line) => line.current_quantity > 0)

  if (order.cancelledAt) {
    return current === 'cancelled' ? null : { to: 'cancelled', reason: 'orden cancelada en Shopify' }
  }
  if (units === 0) {
    return current === 'cancelled' ? null : { to: 'cancelled', reason: 'sin unidades de la ferretería' }
  }

  // "Aparecieron líneas nuevas suyas": un gid que no estaba o más unidades que antes.
  const previousGids = new Set(existing?.lineGids ?? [])
  const gainedLines =
    existing !== undefined &&
    (activeLines.some((line) => !previousGids.has(line.gid)) || units > existing.units)

  if (activeLines.every((line) => line.unfulfilled_quantity === 0)) {
    return current === 'completed' ? null : { to: 'completed', reason: 'LaFerrey preparó todas sus líneas' }
  }

  if (current === 'cancelled') {
    // Volvieron a agregarle unidades a una orden que había quedado sin líneas suyas.
    return { to: 'preparing', reason: 'la orden volvió a tener líneas de la ferretería' }
  }

  if ((current === 'ready_for_pickup' || current === 'ready_to_ship' || current === 'completed') && gainedLines) {
    return { to: 'preparing', reason: 'una edición agregó líneas de la ferretería' }
  }

  return null
}

// ---------------------------------------------------------------------------
// Mapeo
// ---------------------------------------------------------------------------
export const mapOrderForSync = (
  order: ShopifyOrderForSync,
  stores: SyncStore[],
  existing: ExistingStoreOrder[] = []
): MappedOrder => {
  const warnings: string[] = []
  const orderId = Number(order.legacyResourceId)
  const storeByVendor = new Map(stores.map((store) => [store.vendorKey, store.id]))
  const delivery = deliveryByLine(order, warnings)

  const orderRow: OrderRow = {
    id: orderId,
    gid: order.id,
    name: order.name,
    processed_at: order.processedAt,
    shopify_created_at: order.createdAt,
    shopify_updated_at: order.updatedAt,
    cancelled_at: order.cancelledAt,
    cancel_reason: order.cancelReason,
    closed_at: order.closedAt,
    is_test: order.test,
    financial_status: order.displayFinancialStatus,
    fulfillment_status: order.displayFulfillmentStatus,
    currency: order.currencyCode,
    customer_display_name: customerNameOf(order),
    source_name: order.sourceName,
  }

  const lines: LineRow[] = order.lineItems.nodes.map((line) => {
    const lineDelivery = delivery.get(line.id)
    return {
      gid: line.id,
      order_id: orderId,
      hardware_store_id: storeByVendor.get(normalizeVendor(line.vendor)) ?? null,
      vendor: line.vendor,
      product_gid: line.product?.id ?? null,
      variant_gid: line.variant?.id ?? null,
      title: line.title,
      variant_title: line.variantTitle,
      sku: line.sku || null,
      image_url: line.image?.url ?? null,
      quantity: line.quantity,
      current_quantity: line.currentQuantity,
      unfulfilled_quantity: line.unfulfilledQuantity,
      original_unit_price: fromCents(money(line.originalUnitPriceSet)),
      discounted_unit_price: fromCents(money(line.discountedUnitPriceAfterAllDiscountsSet)),
      original_total: fromCents(money(line.originalTotalSet)),
      discounted_total: fromCents(money(line.discountedTotalSet)),
      delivery_method: lineDelivery?.method ?? null,
      fulfillment_order_gid: lineDelivery?.fulfillmentOrderGid ?? null,
      fulfillment_order_line_item_gid: lineDelivery?.fulfillmentOrderLineItemGid ?? null,
      location_gid: lineDelivery?.locationGid ?? null,
    }
  })

  // Agrupa por ferretería. Incluye ferreterías que ya tenían orden aunque hoy no
  // tengan líneas, para que pasen a Cancelado en lugar de quedar huérfanas.
  const byStore = new Map<string, LineRow[]>()
  for (const line of lines) {
    if (!line.hardware_store_id) continue
    byStore.set(line.hardware_store_id, [...(byStore.get(line.hardware_store_id) ?? []), line])
  }
  for (const previous of existing) {
    if (!byStore.has(previous.storeId)) byStore.set(previous.storeId, [])
  }

  const sourceById = new Map(order.lineItems.nodes.map((line) => [line.id, line]))
  const existingByStore = new Map(existing.map((entry) => [entry.storeId, entry]))
  const storeOrders: StoreOrderRow[] = []
  const statusChanges: StatusChange[] = []

  for (const [storeId, storeLines] of byStore) {
    let gross = 0
    let discount = 0
    let refunded = 0
    let net = 0
    let units = 0
    for (const line of storeLines.map((row) => sourceById.get(row.gid)!)) {
      const originalTotal = money(line.originalTotalSet)
      const discountedUnit = money(line.discountedUnitPriceAfterAllDiscountsSet)
      gross += originalTotal
      discount += originalTotal - money(line.discountedTotalSet)
      refunded += (line.quantity - line.currentQuantity) * discountedUnit
      net += line.currentQuantity * discountedUnit
      units += line.currentQuantity
    }

    const methods = new Set(storeLines.map((line) => line.delivery_method).filter((m): m is DeliveryMethod => m !== null))
    let deliveryMethod: DeliveryMethod = 'none'
    if (methods.size === 1) deliveryMethod = [...methods][0]
    if (methods.size > 1) {
      deliveryMethod = methods.has('pickup') ? 'pickup' : [...methods][0]
      warnings.push(`La ferretería ${storeId} mezcla métodos de entrega (${[...methods].join(', ')}); se usa ${deliveryMethod}`)
    }

    storeOrders.push({
      order_id: orderId,
      hardware_store_id: storeId,
      order_name: order.name,
      processed_at: order.processedAt,
      customer_display_name: customerNameOf(order),
      financial_status: order.displayFinancialStatus,
      is_test: order.test,
      order_cancelled_at: order.cancelledAt,
      delivery_method: deliveryMethod,
      currency: order.currencyCode,
      lines_count: storeLines.filter((line) => line.current_quantity > 0).length,
      units,
      gross_amount: fromCents(gross),
      discount_amount: fromCents(discount),
      refunded_amount: fromCents(refunded),
      net_amount: fromCents(net),
    })

    const previous = existingByStore.get(storeId)
    const current = previous?.status ?? 'preparing'
    const change = autoStatus(order, { storeId, lines: storeLines }, current, previous)
    if (change) statusChanges.push({ storeId, from: current, ...change })
  }

  return { order: orderRow, lines, storeOrders, statusChanges, warnings }
}
