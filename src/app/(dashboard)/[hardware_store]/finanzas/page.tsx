import type { Metadata } from 'next'
import { Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireStoreAccess } from '@/lib/auth/dal'
import { formatCalendarDate, todayInZone, zonedRange } from '@/lib/dates'
import { getAppEnv } from '@/lib/env'
import { getSalesSummary, getSalesTimeseries, getTopProducts } from '@/lib/finance/queries'
import { bucketsInRange, fillSeries, percentChange, resolveRange } from '@/lib/finance/range'
import { formatCurrency, formatNumber } from '@/lib/shopify/format'
import { financeSearchSchema } from '@/lib/validations/finance'
import { DeliverySplit } from '../../(components)/finance/delivery-split'
import { KpiTile } from '../../(components)/finance/kpi-tile'
import { RangePicker } from '../../(components)/finance/range-picker'
import { SalesChart, type SalesChartPoint } from '../../(components)/finance/sales-chart'
import { TopProducts } from '../../(components)/finance/top-products'
import { PageContainer } from '../../(components)/shared/page-container'
import { PageHeader } from '../../(components)/shared/page-header'

export const metadata: Metadata = { title: 'Finanzas' }

const BUCKET_LABELS = {
  day: { short: { day: 'numeric', month: 'short' }, long: { dateStyle: 'full' } },
  week: { short: { day: 'numeric', month: 'short' }, long: { dateStyle: 'long' } },
  month: { short: { month: 'short', year: '2-digit' }, long: { month: 'long', year: 'numeric' } },
} as const satisfies Record<string, { short: Intl.DateTimeFormatOptions; long: Intl.DateTimeFormatOptions }>

const FinancePage = async ({ params, searchParams }: PageProps<'/[hardware_store]/finanzas'>) => {
  const { hardware_store } = await params
  const { store } = await requireStoreAccess(hardware_store)
  const range = resolveRange(financeSearchSchema.parse(await searchParams), todayInZone())
  const current = zonedRange(range.from, range.to)
  const previous = zonedRange(range.previous.from, range.previous.to)

  const [summary, previousSummary, series, topProducts] = await Promise.all([
    getSalesSummary(store.id, current),
    getSalesSummary(store.id, previous),
    getSalesTimeseries(store.id, current, range.bucket),
    getTopProducts(store.id, current, 50),
  ])

  const labels = BUCKET_LABELS[range.bucket]
  const points: SalesChartPoint[] = fillSeries(
    series,
    bucketsInRange(range.from, range.to, range.bucket),
    (bucket) => ({ bucket, netAmount: 0, pickupNet: 0, shippingNet: 0, orders: 0 })
  ).map((point) => ({
    ...point,
    label: formatCalendarDate(point.bucket, labels.short),
    longLabel:
      range.bucket === 'week'
        ? `Semana del ${formatCalendarDate(point.bucket, labels.long)}`
        : formatCalendarDate(point.bucket, labels.long),
  }))

  const csvQuery = new URLSearchParams({ desde: range.from, hasta: range.to }).toString()
  const { includeTestOrders } = getAppEnv()
  const best = points.reduce<SalesChartPoint | null>((top, point) => (!top || point.netAmount > top.netAmount ? point : top), null)
  const chartSummary =
    summary.netAmount > 0
      ? `Venta neta de ${formatCurrency(summary.netAmount)} en ${range.label}: ${formatCurrency(summary.pickupNet)} por pickup y ${formatCurrency(summary.shippingNet)} por envío.${best ? ` El mejor periodo fue ${best.longLabel} con ${formatCurrency(best.netAmount)}.` : ''}`
      : `Sin ventas en ${range.label}.`

  return (
    <PageContainer>
      <PageHeader
        title='Finanzas'
        description={`Solo tus productos · ${range.label}`}
        breadcrumbs={[{ label: 'Resumen', href: `/${store.slug}` }, { label: 'Finanzas' }]}
        actions={
          <Button
            variant='outline'
            size='lg'
            nativeButton={false}
            render={<a href={`/${store.slug}/finanzas/csv?${csvQuery}`} download />}
          >
            <Download data-icon='inline-start' />
            Exportar CSV
          </Button>
        }
      />

      <RangePicker key={`${range.preset}-${range.from}-${range.to}`} preset={range.preset} from={range.from} to={range.to} />

      <section className='grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4' aria-label='Indicadores'>
        <KpiTile
          label='Venta neta'
          value={formatCurrency(summary.netAmount)}
          change={percentChange(summary.netAmount, previousSummary.netAmount)}
          hint={previousSummary.netAmount > 0 ? 'vs. periodo anterior' : 'Sin ventas en el periodo anterior'}
          emphasis
        />
        <KpiTile label='Venta bruta' value={formatCurrency(summary.grossAmount)} hint='Precio original × cantidad' />
        <KpiTile
          label='Descuentos'
          value={formatCurrency(summary.discountAmount)}
          change={percentChange(summary.discountAmount, previousSummary.discountAmount)}
          invert
        />
        <KpiTile
          label='Devoluciones y ajustes'
          value={formatCurrency(summary.refundedAmount)}
          change={percentChange(summary.refundedAmount, previousSummary.refundedAmount)}
          invert
        />
        <KpiTile
          label='Órdenes'
          value={formatNumber(summary.orders)}
          change={percentChange(summary.orders, previousSummary.orders)}
        />
        <KpiTile label='Unidades' value={formatNumber(summary.units)} change={percentChange(summary.units, previousSummary.units)} />
        <KpiTile
          label='Ticket promedio'
          value={formatCurrency(summary.avgTicket)}
          change={percentChange(summary.avgTicket, previousSummary.avgTicket)}
        />
        <KpiTile label='Por cobrar' value={formatCurrency(summary.pendingPaymentNet)} hint='Pago pendiente, autorizado o parcial' />
      </section>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]'>
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle>Venta neta por {range.bucket === 'day' ? 'día' : range.bucket === 'week' ? 'semana' : 'mes'}</CardTitle>
            <CardDescription>Separada por método de entrega.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart points={points} summary={chartSummary} />
          </CardContent>
        </Card>
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle>Pickup contra envío</CardTitle>
            <CardDescription>Venta neta y órdenes del periodo.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeliverySplit summary={summary} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos más vendidos</CardTitle>
          <CardDescription>Top 10 del periodo.</CardDescription>
        </CardHeader>
        <CardContent>
          <TopProducts products={topProducts} />
        </CardContent>
      </Card>

      <p className='flex items-start gap-2 text-xs text-muted-foreground'>
        <Info className='mt-0.5 size-3.5 shrink-0' aria-hidden />
        <span>
          Solo cuentan tus productos, por fecha de la orden en hora de Monterrey. No incluye costos de envío, propinas ni
          productos de otros proveedores, y excluye órdenes canceladas
          {includeTestOrders ? '. En este entorno se incluyen las órdenes de prueba' : ' y de prueba'}. Los montos se muestran
          como los registra Shopify. Sin comisiones de LaFerrey en esta versión.
        </span>
      </p>
    </PageContainer>
  )
}

export default FinancePage
