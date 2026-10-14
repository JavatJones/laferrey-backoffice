import { describe, expect, it } from 'vitest'
import {
  fromCents,
  mapOrderForSync,
  toCents,
  type ExistingStoreOrder,
  type ShopifyFulfillmentOrder,
  type ShopifyOrderForSync,
  type ShopifyOrderLine,
  type SyncStore,
} from './map-order'

const MERCADO = 'store-mercado'
const OTRA = 'store-otra'
const STORES: SyncStore[] = [
  { id: MERCADO, vendorKey: 'mercado total ferretero' },
  { id: OTRA, vendorKey: 'otra ferretería' },
]

const money = (amount: string) => ({ shopMoney: { amount } })

const line = (id: number, overrides: Partial<ShopifyOrderLine> & { unit?: string; discountedUnit?: string } = {}) => {
  const { unit = '100.00', discountedUnit = unit, ...rest } = overrides
  const quantity = rest.quantity ?? 1
  const base: ShopifyOrderLine = {
    id: `gid://shopify/LineItem/${id}`,
    vendor: 'Mercado Total Ferretero',
    title: `Producto ${id}`,
    variantTitle: null,
    sku: `SKU-${id}`,
    quantity,
    currentQuantity: quantity,
    unfulfilledQuantity: quantity,
    product: { id: `gid://shopify/Product/${id}` },
    variant: { id: `gid://shopify/ProductVariant/${id}` },
    image: null,
    originalUnitPriceSet: money(unit),
    discountedUnitPriceAfterAllDiscountsSet: money(discountedUnit),
    originalTotalSet: money(fromCents(toCents(unit) * quantity)),
    discountedTotalSet: money(fromCents(toCents(discountedUnit) * quantity)),
  }
  return { ...base, ...rest }
}

const fulfillmentOrder = (
  id: number,
  methodType: string,
  lineIds: number[],
  overrides: Partial<ShopifyFulfillmentOrder> = {}
): ShopifyFulfillmentOrder => ({
  id: `gid://shopify/FulfillmentOrder/${id}`,
  status: 'OPEN',
  deliveryMethod: { methodType },
  assignedLocation: { location: { id: 'gid://shopify/Location/85431091293' } },
  lineItems: {
    nodes: lineIds.map((lineId) => ({
      id: `gid://shopify/FulfillmentOrderLineItem/${id}${lineId}`,
      remainingQuantity: 1,
      totalQuantity: 1,
      lineItem: { id: `gid://shopify/LineItem/${lineId}` },
    })),
  },
  ...overrides,
})

const order = (lines: ShopifyOrderLine[], fulfillmentOrders: ShopifyFulfillmentOrder[], overrides: Partial<ShopifyOrderForSync> = {}): ShopifyOrderForSync => ({
  id: 'gid://shopify/Order/5001',
  legacyResourceId: '5001',
  name: '#1001',
  processedAt: '2026-10-14T18:00:00Z',
  createdAt: '2026-10-14T18:00:00Z',
  updatedAt: '2026-10-14T18:05:00Z',
  cancelledAt: null,
  cancelReason: null,
  closedAt: null,
  test: true,
  displayFinancialStatus: 'PAID',
  displayFulfillmentStatus: 'UNFULFILLED',
  currencyCode: 'MXN',
  sourceName: 'web',
  customer: { displayName: 'Ana López' },
  lineItems: { nodes: lines },
  fulfillmentOrders: { nodes: fulfillmentOrders },
  ...overrides,
})

const existingFor = (storeId: string, status: ExistingStoreOrder['status'], lineIds: number[], units: number): ExistingStoreOrder => ({
  storeId,
  status,
  units,
  lineGids: lineIds.map((id) => `gid://shopify/LineItem/${id}`),
})

describe('toCents / fromCents', () => {
  it('convierte sin errores de punto flotante', () => {
    expect(toCents('356.23')).toBe(35623)
    expect(toCents('0.1')).toBe(10)
    expect(toCents('255')).toBe(25500)
    expect(toCents('-12.5')).toBe(-1250)
    expect(toCents('1.005')).toBe(101)
    expect(fromCents(35623)).toBe('356.23')
    expect(fromCents(-1250)).toBe('-12.50')
    expect(fromCents(5)).toBe('0.05')
  })
})

describe('mapOrderForSync', () => {
  it('orden con varios proveedores: cada ferretería solo con sus líneas y montos', () => {
    const mapped = mapOrderForSync(
      order(
        [
          line(1, { quantity: 2, unit: '356.23', discountedUnit: '320.61' }),
          line(2, { vendor: 'Aldevaram', unit: '255.00' }),
          line(3, { vendor: '  otra   FERRETERÍA ', unit: '50.00', quantity: 3 }),
        ],
        [fulfillmentOrder(1, 'PICK_UP', [1]), fulfillmentOrder(2, 'SHIPPING', [2, 3])]
      ),
      STORES
    )

    expect(mapped.lines.map((l) => [l.gid.split('/').pop(), l.hardware_store_id])).toEqual([
      ['1', MERCADO],
      ['2', null],
      ['3', OTRA],
    ])

    const mercado = mapped.storeOrders.find((row) => row.hardware_store_id === MERCADO)!
    expect(mercado).toMatchObject({
      delivery_method: 'pickup',
      lines_count: 1,
      units: 2,
      gross_amount: '712.46',
      discount_amount: '71.24',
      refunded_amount: '0.00',
      net_amount: '641.22',
      customer_display_name: 'Ana López',
      is_test: true,
    })

    const otra = mapped.storeOrders.find((row) => row.hardware_store_id === OTRA)!
    expect(otra).toMatchObject({ delivery_method: 'shipping', units: 3, net_amount: '150.00' })
    expect(mapped.storeOrders).toHaveLength(2)
    expect(mapped.statusChanges).toEqual([])
  })

  it('proveedor sin ferretería: la línea queda con hardware_store_id null y no crea orden', () => {
    const mapped = mapOrderForSync(order([line(2, { vendor: 'Aldevaram' })], [fulfillmentOrder(1, 'SHIPPING', [2])]), STORES)
    expect(mapped.lines[0].hardware_store_id).toBeNull()
    expect(mapped.storeOrders).toEqual([])
  })

  it('pickup: guarda método, entrega y sucursal de la línea', () => {
    const mapped = mapOrderForSync(order([line(1)], [fulfillmentOrder(7, 'PICK_UP', [1])]), STORES)
    expect(mapped.lines[0]).toMatchObject({
      delivery_method: 'pickup',
      fulfillment_order_gid: 'gid://shopify/FulfillmentOrder/7',
      fulfillment_order_line_item_gid: 'gid://shopify/FulfillmentOrderLineItem/71',
      location_gid: 'gid://shopify/Location/85431091293',
    })
    expect(mapped.storeOrders[0].delivery_method).toBe('pickup')
  })

  it('envío: entrega local y punto de recogida cuentan como envío', () => {
    const local = mapOrderForSync(order([line(1)], [fulfillmentOrder(1, 'LOCAL', [1])]), STORES)
    expect(local.storeOrders[0].delivery_method).toBe('local_delivery')
    const point = mapOrderForSync(order([line(1)], [fulfillmentOrder(1, 'PICKUP_POINT', [1])]), STORES)
    expect(point.storeOrders[0].delivery_method).toBe('pickup_point')
  })

  it('métodos mezclados en la misma ferretería: gana pickup y se avisa', () => {
    const mapped = mapOrderForSync(
      order([line(1), line(2)], [fulfillmentOrder(1, 'PICK_UP', [1]), fulfillmentOrder(2, 'SHIPPING', [2])]),
      STORES
    )
    expect(mapped.storeOrders[0].delivery_method).toBe('pickup')
    expect(mapped.warnings.join(' ')).toMatch(/mezcla métodos/)
  })

  it('prefiere la entrega abierta cuando una línea aparece en varias', () => {
    const mapped = mapOrderForSync(
      order(
        [line(1)],
        [
          fulfillmentOrder(1, 'SHIPPING', [1], { status: 'CLOSED' }),
          fulfillmentOrder(2, 'PICK_UP', [1]),
        ]
      ),
      STORES
    )
    expect(mapped.lines[0].fulfillment_order_gid).toBe('gid://shopify/FulfillmentOrder/2')
    expect(mapped.lines[0].delivery_method).toBe('pickup')
  })

  it('reembolso parcial: baja la venta neta y registra devoluciones', () => {
    const mapped = mapOrderForSync(
      order(
        [line(1, { quantity: 4, currentQuantity: 3, unfulfilledQuantity: 3, unit: '50.00' })],
        [fulfillmentOrder(1, 'SHIPPING', [1])]
      ),
      STORES,
      [existingFor(MERCADO, 'ready_to_ship', [1], 4)]
    )
    expect(mapped.storeOrders[0]).toMatchObject({
      units: 3,
      gross_amount: '200.00',
      refunded_amount: '50.00',
      net_amount: '150.00',
    })
    expect(mapped.statusChanges).toEqual([])
  })

  it('reembolso total de sus líneas: pasa a Cancelado', () => {
    const mapped = mapOrderForSync(
      order([line(1, { quantity: 2, currentQuantity: 0, unfulfilledQuantity: 0 })], [fulfillmentOrder(1, 'SHIPPING', [1])]),
      STORES,
      [existingFor(MERCADO, 'preparing', [1], 2)]
    )
    expect(mapped.storeOrders[0]).toMatchObject({ units: 0, net_amount: '0.00', lines_count: 0 })
    expect(mapped.statusChanges).toEqual([
      expect.objectContaining({ storeId: MERCADO, from: 'preparing', to: 'cancelled' }),
    ])
  })

  it('cancelación: todas las ferreterías pasan a Cancelado desde cualquier estado', () => {
    const mapped = mapOrderForSync(
      order([line(1), line(3, { vendor: 'Otra Ferretería' })], [fulfillmentOrder(1, 'PICK_UP', [1, 3])], {
        cancelledAt: '2026-10-14T19:00:00Z',
        cancelReason: 'CUSTOMER',
      }),
      STORES,
      [existingFor(MERCADO, 'ready_for_pickup', [1], 1), existingFor(OTRA, 'completed', [3], 1)]
    )
    expect(mapped.order.cancelled_at).toBe('2026-10-14T19:00:00Z')
    expect(mapped.storeOrders.every((row) => row.order_cancelled_at === '2026-10-14T19:00:00Z')).toBe(true)
    expect(mapped.statusChanges.map((change) => [change.storeId, change.to])).toEqual([
      [MERCADO, 'cancelled'],
      [OTRA, 'cancelled'],
    ])
  })

  it('orden ya preparada por LaFerrey: pasa a Completado', () => {
    const mapped = mapOrderForSync(
      order(
        [line(1, { unfulfilledQuantity: 0 }), line(2, { vendor: 'Aldevaram' })],
        [fulfillmentOrder(1, 'SHIPPING', [1, 2], { status: 'CLOSED' })]
      ),
      STORES,
      [existingFor(MERCADO, 'ready_to_ship', [1], 1)]
    )
    expect(mapped.statusChanges).toEqual([
      expect.objectContaining({ storeId: MERCADO, from: 'ready_to_ship', to: 'completed' }),
    ])
  })

  it('una orden nueva que ya viene preparada se completa al sincronizar', () => {
    const mapped = mapOrderForSync(order([line(1, { unfulfilledQuantity: 0 })], [fulfillmentOrder(1, 'SHIPPING', [1])]), STORES)
    expect(mapped.statusChanges).toEqual([expect.objectContaining({ from: 'preparing', to: 'completed' })])
  })

  it('edición que agrega líneas a una orden lista: regresa a Preparando', () => {
    const mapped = mapOrderForSync(
      order([line(1), line(4)], [fulfillmentOrder(1, 'PICK_UP', [1, 4])]),
      STORES,
      [existingFor(MERCADO, 'ready_for_pickup', [1], 1)]
    )
    expect(mapped.statusChanges).toEqual([
      expect.objectContaining({ from: 'ready_for_pickup', to: 'preparing' }),
    ])
  })

  it('edición que sube unidades de una línea existente: regresa a Preparando', () => {
    const mapped = mapOrderForSync(
      order([line(1, { quantity: 1, currentQuantity: 3, unfulfilledQuantity: 3 })], [fulfillmentOrder(1, 'SHIPPING', [1])]),
      STORES,
      [existingFor(MERCADO, 'ready_to_ship', [1], 1)]
    )
    expect(mapped.statusChanges).toEqual([expect.objectContaining({ to: 'preparing' })])
  })

  it('Entregado desde el panel no se revierte aunque Shopify no tenga la entrega cerrada', () => {
    const mapped = mapOrderForSync(order([line(1)], [fulfillmentOrder(1, 'PICK_UP', [1])]), STORES, [
      existingFor(MERCADO, 'completed', [1], 1),
    ])
    expect(mapped.statusChanges).toEqual([])
  })

  it('una ferretería que perdió todas sus líneas queda en Cancelado con montos en cero', () => {
    const mapped = mapOrderForSync(order([line(2, { vendor: 'Aldevaram' })], [fulfillmentOrder(1, 'SHIPPING', [2])]), STORES, [
      existingFor(MERCADO, 'preparing', [1], 1),
    ])
    expect(mapped.storeOrders).toEqual([
      expect.objectContaining({ hardware_store_id: MERCADO, units: 0, net_amount: '0.00', delivery_method: 'none' }),
    ])
    expect(mapped.statusChanges).toEqual([expect.objectContaining({ to: 'cancelled' })])
  })

  it('no guarda el correo ni el teléfono cuando Shopify los usa como nombre (RN-16)', () => {
    const byEmail = mapOrderForSync(order([line(1)], [fulfillmentOrder(1, 'SHIPPING', [1])], { customer: { displayName: 'ana@example.com' } }), STORES)
    expect(byEmail.storeOrders[0].customer_display_name).toBeNull()
    expect(byEmail.order.customer_display_name).toBeNull()
    const byPhone = mapOrderForSync(order([line(1)], [fulfillmentOrder(1, 'SHIPPING', [1])], { customer: { displayName: '+52 81 1234 5678' } }), STORES)
    expect(byPhone.storeOrders[0].customer_display_name).toBeNull()
  })

  it('cliente sin permiso de datos protegidos: nombre en null', () => {
    const mapped = mapOrderForSync(order([line(1)], [fulfillmentOrder(1, 'SHIPPING', [1])], { customer: null }), STORES)
    expect(mapped.storeOrders[0].customer_display_name).toBeNull()
  })
})
