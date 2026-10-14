import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Banknote, ClipboardList, Package, PackageCheck, ReceiptText } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { requireStoreAccess } from '@/lib/auth/dal'
import { startOfMonth, todayInZone, zonedRange } from '@/lib/dates'
import { getSalesSummary } from '@/lib/finance/queries'
import { countStoreOrdersByTab, listRecentStoreOrders } from '@/lib/orders/queries'
import { formatCount, formatCurrency, formatNumber } from '@/lib/shopify/format'
import { countStoreProducts } from '@/lib/shopify/products'
import { OrdersTable } from '../../(components)/orders/orders-table'
import { PageContainer } from '../../(components)/shared/page-container'
import { PageHeader } from '../../(components)/shared/page-header'
import { StatCard } from '../../(components)/shared/stat-card'

export const metadata: Metadata = { title: 'Resumen' }

const OverviewPage = async ({ params }: PageProps<'/[hardware_store]'>) => {
  const { hardware_store } = await params
  const { store } = await requireStoreAccess(hardware_store)

  const today = todayInZone()
  const month = zonedRange(startOfMonth(today), today)
  const base = `/${store.slug}`

  const [counts, monthSales, activeProducts, recentOrders] = await Promise.all([
    countStoreOrdersByTab(store.id),
    getSalesSummary(store.id, month),
    // Si Shopify no responde, el resumen se muestra igual.
    countStoreProducts(store, 'ACTIVE').catch((error) => {
      console.error('[resumen] productsCount', error)
      return null
    }),
    listRecentStoreOrders(store.id),
  ])

  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'UTC' }).format(
    new Date(`${startOfMonth(today)}T12:00:00Z`)
  )

  return (
    <PageContainer>
      <PageHeader title='Resumen' description={store.name} />

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4' aria-label='Indicadores'>
        <StatCard
          label='Por preparar'
          value={formatNumber(counts['por-preparar'])}
          icon={ClipboardList}
          hint='Órdenes en Preparando'
          href={`${base}/ordenes?estado=por-preparar`}
        />
        <StatCard
          label='Listas'
          value={formatNumber(counts.listas)}
          icon={PackageCheck}
          hint='Para recoger o para enviar'
          href={`${base}/ordenes?estado=listas`}
        />
        <StatCard
          label='Venta neta del mes'
          value={formatCurrency(monthSales.netAmount)}
          icon={Banknote}
          hint={`${formatNumber(monthSales.orders)} órdenes en ${monthName}`}
          href={`${base}/finanzas`}
        />
        <StatCard
          label='Productos activos'
          value={activeProducts ? formatCount(activeProducts) : '—'}
          icon={Package}
          hint={activeProducts ? 'A la venta en la tienda en línea' : 'No se pudo consultar Shopify'}
          href={`${base}/productos?estado=activo`}
        />
      </section>

      <Card className='gap-0 pb-0'>
        <CardHeader className='border-b pb-4'>
          <CardTitle>Órdenes recientes</CardTitle>
          <CardDescription>Solo tus productos dentro de cada orden.</CardDescription>
          <CardAction>
            <Link href={`${base}/ordenes?estado=todas`} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Ver todas
              <ArrowRight data-icon='inline-end' />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className='px-0'>
          {recentOrders.length > 0 ? (
            <OrdersTable orders={recentOrders} slug={store.slug} compact />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <ReceiptText />
                </EmptyMedia>
                <EmptyTitle>Aún no hay órdenes</EmptyTitle>
                <EmptyDescription>Aquí aparecerán las órdenes que incluyan tus productos.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default OverviewPage
