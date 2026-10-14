import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { requireStoreAccess } from '@/lib/auth/dal'
import { getStoreOrder } from '@/lib/orders/queries'
import { getPickupStatus } from '@/lib/pickup/service'
import { deliveryKind, panelTransitionsFrom } from '@/lib/orders/status'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/shopify/format'
import { shopifyIdSchema } from '@/lib/validations/order'
import { DeliveryBadge, OrderStatusBadge, PaymentBadge, TestBadge } from '../../../(components)/orders/order-badges'
import { OrderHistory } from '../../../(components)/orders/order-history'
import { OrderLines } from '../../../(components)/orders/order-lines'
import { OrderStatusActions } from '../../../(components)/orders/order-status-actions'
import { PickupCodePanel } from '../../../(components)/orders/pickup-code-panel'
import { ShopifySyncNotice } from '../../../(components)/orders/shopify-sync-notice'
import { StatusProgress } from '../../../(components)/orders/status-progress'
import { PageContainer } from '../../../(components)/shared/page-container'
import { PageHeader } from '../../../(components)/shared/page-header'

export const metadata: Metadata = { title: 'Orden' }

const NEXT_STEP_HINT = {
  pickup: {
    preparing: 'Junta los productos y márcala lista: el cliente recibirá por correo el aviso con su código de recogida.',
    ready_for_pickup: 'Cuando el cliente llegue, pídele su código de recogida y márcala como entregada.',
  },
  shipping: {
    preparing: 'Junta y empaca los productos y márcala lista para enviar.',
    ready_to_ship: 'LaFerrey recogerá el paquete y lo enviará desde Shopify.',
  },
} as const

const OrderDetailPage = async ({ params }: PageProps<'/[hardware_store]/ordenes/[order_id]'>) => {
  const { hardware_store, order_id } = await params
  const { user, store } = await requireStoreAccess(hardware_store)
  if (!shopifyIdSchema.safeParse(order_id).success) notFound()

  const order = await getStoreOrder(store.id, order_id)
  if (!order) notFound()

  const kind = deliveryKind(order.deliveryMethod)
  // RN-27: el estado del código se lee en el servidor; la ferretería nunca ve el código.
  const pickupStatus = kind === 'pickup' ? await getPickupStatus(store.id, Number(order.orderId)) : null
  const hint = (NEXT_STEP_HINT[kind] as Record<string, string>)[order.status]

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className='flex flex-wrap items-center gap-2'>
            <span className='font-mono'>{order.name}</span>
            {order.isTest && <TestBadge />}
          </span>
        }
        description={`${formatDateTime(order.processedAt)} · ${order.customerName ?? 'Cliente sin nombre'}`}
        breadcrumbs={[
          { label: 'Resumen', href: `/${store.slug}` },
          { label: 'Órdenes', href: `/${store.slug}/ordenes` },
          { label: order.name },
        ]}
      />

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <div className='flex min-w-0 flex-col gap-6'>
          <Card>
            <CardHeader>
              <CardTitle>Preparación</CardTitle>
              <CardDescription className='flex flex-wrap items-center gap-2'>
                <DeliveryBadge method={order.deliveryMethod} />
                <OrderStatusBadge status={order.status} method={order.deliveryMethod} />
                <PaymentBadge status={order.financialStatus} />
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <StatusProgress status={order.status} method={order.deliveryMethod} />
              {hint && <p className='text-sm text-muted-foreground'>{hint}</p>}
              {kind === 'pickup' && (
                <PickupCodePanel
                  slug={store.slug}
                  orderId={order.orderId}
                  status={pickupStatus}
                  ready={order.status === 'ready_for_pickup'}
                />
              )}
              <ShopifySyncNotice
                slug={store.slug}
                orderId={order.orderId}
                status={order.shopifyPushStatus}
                message={order.shopifyPushError}
              />
            </CardContent>
            {panelTransitionsFrom(order.status, order.deliveryMethod).length > 0 && (
              <CardFooter>
                <OrderStatusActions
                  slug={store.slug}
                  orderId={order.orderId}
                  orderName={order.name}
                  customerName={order.customerName}
                  status={order.status}
                  method={order.deliveryMethod}
                />
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tus productos</CardTitle>
              <CardDescription>
                {formatNumber(order.units)} {order.units === 1 ? 'unidad' : 'unidades'} en esta orden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderLines lines={order.lines} currency={order.currency} />
            </CardContent>
            <CardFooter className='flex-col items-stretch gap-2 text-sm'>
              <div className='flex justify-between text-muted-foreground'>
                <span>Subtotal</span>
                <span className='tabular-nums'>{formatCurrency(order.grossAmount, order.currency)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className='flex justify-between text-muted-foreground'>
                  <span>Descuentos</span>
                  <span className='tabular-nums'>−{formatCurrency(order.discountAmount, order.currency)}</span>
                </div>
              )}
              {order.refundedAmount > 0 && (
                <div className='flex justify-between text-muted-foreground'>
                  <span>Devoluciones y ajustes</span>
                  <span className='tabular-nums'>−{formatCurrency(order.refundedAmount, order.currency)}</span>
                </div>
              )}
              <Separator />
              <div className='flex justify-between font-semibold'>
                <span>Total de tus productos</span>
                <span className='tabular-nums'>{formatCurrency(order.netAmount, order.currency)}</span>
              </div>
            </CardFooter>
          </Card>
        </div>

        <Card className='h-fit'>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderHistory
              events={order.events}
              method={order.deliveryMethod}
              currentUserId={user.id}
              currentUserEmail={user.email}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

export default OrderDetailPage
