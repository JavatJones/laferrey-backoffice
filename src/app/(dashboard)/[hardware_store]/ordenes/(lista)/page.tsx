import type { Metadata } from 'next'
import Link from 'next/link'
import { ReceiptText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { requireStoreAccess } from '@/lib/auth/dal'
import { countStoreOrdersByTab, listStoreOrders } from '@/lib/orders/queries'
import { formatNumber } from '@/lib/shopify/format'
import { cn } from '@/lib/utils'
import { orderListSearchSchema, type OrderListFilters, type OrderTab } from '@/lib/validations/order'
import { OrderFilters } from '../../../(components)/orders/order-filters'
import { OrderStatusActions } from '../../../(components)/orders/order-status-actions'
import { OrdersTable } from '../../../(components)/orders/orders-table'
import { OffsetPagination } from '../../../(components)/shared/offset-pagination'
import { PageContainer } from '../../../(components)/shared/page-container'
import { PageHeader } from '../../../(components)/shared/page-header'

export const metadata: Metadata = { title: 'Órdenes' }

const TABS: { id: OrderTab; label: string; empty: string }[] = [
  { id: 'por-preparar', label: 'Por preparar', empty: 'No tienes órdenes por preparar.' },
  { id: 'listas', label: 'Listas', empty: 'No hay órdenes listas para recoger o enviar.' },
  { id: 'completadas', label: 'Completadas', empty: 'Aún no hay órdenes entregadas o enviadas.' },
  { id: 'canceladas', label: 'Canceladas', empty: 'No hay órdenes canceladas.' },
  { id: 'todas', label: 'Todas', empty: 'Aún no hay órdenes con tus productos.' },
]

const buildHref = (base: string, filters: Partial<OrderListFilters>) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '' && !(key === 'pagina' && value === 1)) {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

const OrdersPage = async ({ params, searchParams }: PageProps<'/[hardware_store]/ordenes'>) => {
  const { hardware_store } = await params
  const { store } = await requireStoreAccess(hardware_store)
  const filters = orderListSearchSchema.parse(await searchParams)
  const base = `/${store.slug}/ordenes`

  const [counts, result] = await Promise.all([countStoreOrdersByTab(store.id), listStoreOrders(store.id, filters)])
  const activeTab = TABS.find((tab) => tab.id === filters.estado)!
  const filtered = Boolean(filters.q || filters.desde || filters.hasta || filters.metodo)

  return (
    <PageContainer>
      <PageHeader
        title='Órdenes'
        description='Solo ves tus productos dentro de cada orden, con sus montos.'
        breadcrumbs={[{ label: 'Resumen', href: `/${store.slug}` }, { label: 'Órdenes' }]}
      />

      <Card className='gap-0 py-0'>
        <CardHeader className='flex flex-col gap-4 border-b p-4'>
          <nav aria-label='Estado de las órdenes' className='-mx-1 overflow-x-auto px-1 pb-1'>
            <div className='inline-flex w-fit items-center gap-0.5 rounded-lg bg-muted p-[3px] text-muted-foreground'>
              {TABS.map((tab) => {
                const active = tab.id === filters.estado
                return (
                  <Link
                    key={tab.id}
                    href={buildHref(base, { estado: tab.id, metodo: filters.metodo })}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-7 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11',
                      active && 'bg-background text-foreground shadow-sm'
                    )}
                  >
                    {tab.label}
                    <Badge variant='secondary' className='h-5 min-w-5 px-1.5 tabular-nums'>
                      {formatNumber(counts[tab.id])}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          </nav>
          <OrderFilters filters={filters} />
        </CardHeader>
        <CardContent className='px-0'>
          {result.orders.length > 0 ? (
            <OrdersTable
              orders={result.orders}
              slug={store.slug}
              renderAction={(order) => (
                <OrderStatusActions
                  slug={store.slug}
                  orderId={order.orderId}
                  orderName={order.name}
                  customerName={order.customerName}
                  status={order.status}
                  method={order.deliveryMethod}
                  variant='quick'
                  className='justify-end'
                />
              )}
            />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <ReceiptText />
                </EmptyMedia>
                <EmptyTitle>Sin órdenes</EmptyTitle>
                <EmptyDescription>
                  {filtered ? 'Ninguna orden coincide con los filtros.' : activeTab.empty}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
        {result.pageCount > 1 && (
          <div className='border-t p-4'>
            <OffsetPagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              label='órdenes'
              hrefFor={(page) => buildHref(base, { ...filters, pagina: page })}
            />
          </div>
        )}
      </Card>
    </PageContainer>
  )
}

export default OrdersPage
