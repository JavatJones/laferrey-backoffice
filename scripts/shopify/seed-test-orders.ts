// Crea órdenes de prueba en la tienda real para probar la sincronización.
// Solo desarrollo; necesita write_orders. Pide confirmación.
//   pnpm shopify:test-orders [--yes]
//   pnpm shopify:test-orders --clean [--yes]   borra las órdenes con la etiqueta backoffice-seed
//
// Las órdenes van con test: true, sin cobro, sin correos y sin mover inventario.
// orderCreate no puede simular pickup (y un borrador de orden tampoco aplica la opción de
// pickup): para probarlo haz una compra en la tienda eligiendo "Recoger en tienda".
import { shopifyAdminQuery } from '@/lib/shopify/client'
import type { UserError } from '@/lib/shopify/types'
import { confirm, hasFlag, run } from '../lib/cli'

const TAG = 'backoffice-seed'

type Variant = { id: string; productTitle: string; vendor: string }

const VARIANTS_QUERY = /* GraphQL */ `
  query SeedVariants($query: String!) {
    productVariants(first: 5, query: $query) {
      nodes { id product { title vendor } }
    }
  }
`

const ORDER_CREATE = /* GraphQL */ `
  mutation SeedOrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      order { id name }
      userErrors { field message }
    }
  }
`

const SEEDED_ORDERS_QUERY = /* GraphQL */ `
  query SeededOrders($query: String!) {
    orders(first: 100, query: $query) {
      nodes { id name test tags }
    }
  }
`

const ORDER_DELETE = /* GraphQL */ `
  mutation SeedOrderDelete($orderId: ID!) {
    orderDelete(orderId: $orderId) {
      deletedId
      userErrors { field message }
    }
  }
`

const findVariant = async (vendor: string): Promise<Variant> => {
  const { productVariants } = await shopifyAdminQuery<{
    productVariants: { nodes: { id: string; product: { title: string; vendor: string } }[] }
  }>(VARIANTS_QUERY, { query: `vendor:"${vendor}"` })
  const variant = productVariants.nodes.find((node) => node.product.vendor === vendor)
  if (!variant) throw new Error(`No hay variantes del proveedor ${vendor}`)
  return { id: variant.id, productTitle: variant.product.title, vendor }
}

const clean = async () => {
  const { orders } = await shopifyAdminQuery<{ orders: { nodes: { id: string; name: string; test: boolean; tags: string[] }[] } }>(
    SEEDED_ORDERS_QUERY,
    { query: `tag:${TAG}` }
  )
  // Doble verificación: solo órdenes de prueba con la etiqueta.
  const seeded = orders.nodes.filter((order) => order.test && order.tags.includes(TAG))
  if (seeded.length === 0) {
    console.log('No hay órdenes de prueba que borrar.')
    return
  }
  console.log(`Se borrarán ${seeded.length} órdenes: ${seeded.map((order) => order.name).join(', ')}`)
  if (!(await confirm('¿Borrar estas órdenes de prueba de la tienda real?'))) return

  for (const order of seeded) {
    const { orderDelete } = await shopifyAdminQuery<{ orderDelete: { deletedId: string | null; userErrors: UserError[] } }>(
      ORDER_DELETE,
      { orderId: order.id }
    )
    console.log(orderDelete.userErrors.length ? `  ✘ ${order.name}: ${orderDelete.userErrors[0].message}` : `  ✔ ${order.name}`)
  }
}

const seed = async () => {
  const wedo = await findVariant('Mercado Total Ferretero')
  const asfalto = await findVariant('Aldevaram')

  // Combinaciones: solo Mercado Total, mezcladas, solo Aldevaram; pagadas y pendientes.
  const plans: { lines: [Variant, number][]; financialStatus: 'PAID' | 'PENDING' }[] = [
    { lines: [[wedo, 1]], financialStatus: 'PAID' },
    { lines: [[wedo, 2], [asfalto, 1]], financialStatus: 'PAID' },
    { lines: [[wedo, 3]], financialStatus: 'PENDING' },
    { lines: [[asfalto, 2]], financialStatus: 'PAID' },
    { lines: [[wedo, 1], [asfalto, 3]], financialStatus: 'PENDING' },
    { lines: [[wedo, 5]], financialStatus: 'PAID' },
    { lines: [[wedo, 2], [asfalto, 2]], financialStatus: 'PAID' },
    { lines: [[wedo, 4]], financialStatus: 'PAID' },
  ]

  console.log(`Se crearán ${plans.length} órdenes de prueba con ${wedo.productTitle} y ${asfalto.productTitle}.`)
  if (!(await confirm('¿Crear estas órdenes de prueba en la tienda real?'))) return

  for (const [index, plan] of plans.entries()) {
    const { orderCreate } = await shopifyAdminQuery<{
      orderCreate: { order: { id: string; name: string } | null; userErrors: UserError[] }
    }>(ORDER_CREATE, {
      order: {
        test: true,
        tags: [TAG],
        currency: 'MXN',
        financialStatus: plan.financialStatus,
        note: `Orden de prueba ${index + 1} del backoffice`,
        // Forzamos envío: los productos de la tienda hoy no lo requieren y Shopify daría
        // por preparadas las órdenes pagadas al crearlas.
        lineItems: plan.lines.map(([variant, quantity]) => ({ variantId: variant.id, quantity, requiresShipping: true })),
        shippingLines: [
          { title: 'Envío estándar', code: 'backoffice-seed', priceSet: { shopMoney: { amount: '99.00', currencyCode: 'MXN' } } },
        ],
        shippingAddress: {
          firstName: 'Prueba',
          lastName: 'Backoffice',
          address1: 'Av. Constitución 100',
          city: 'Monterrey',
          provinceCode: 'NL',
          countryCode: 'MX',
          zip: '64000',
        },
      },
      options: { inventoryBehaviour: 'BYPASS', sendReceipt: false, sendFulfillmentReceipt: false },
    })
    const errors = orderCreate.userErrors
    console.log(errors.length ? `  ✘ orden ${index + 1}: ${errors.map((e) => e.message).join('; ')}` : `  ✔ ${orderCreate.order?.name}`)
  }

  console.log('\nListo. Ahora corre: pnpm sync:orders')
}

run(async () => {
  if (hasFlag('clean')) await clean()
  else await seed()
})
