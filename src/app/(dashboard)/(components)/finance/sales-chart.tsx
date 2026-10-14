'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatNumber } from '@/lib/shopify/format'

export type SalesChartPoint = {
  bucket: string
  label: string
  longLabel: string
  pickupNet: number
  shippingNet: number
  netAmount: number
  orders: number
}

// Colores validados con la skill dataviz (ver design-system/laferrey-backoffice/MASTER.md).
const chartConfig = {
  pickupNet: { label: 'Pickup', color: 'var(--chart-1)' },
  shippingNet: { label: 'Envío', color: 'var(--chart-2)' },
} satisfies ChartConfig

const compactCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 }).format(value)

type Props = { points: SalesChartPoint[]; summary: string }

export const SalesChart = ({ points, summary }: Props) => {
  const hasSales = points.some((point) => point.netAmount > 0)

  return (
    <Tabs defaultValue='grafica'>
      <TabsList>
        <TabsTrigger value='grafica'>Gráfica</TabsTrigger>
        <TabsTrigger value='tabla'>Tabla</TabsTrigger>
      </TabsList>
      <TabsContent value='grafica' className='pt-2'>
        {hasSales ? (
          <ChartContainer config={chartConfig} className='aspect-auto h-72 w-full' role='img' aria-label={summary}>
            <BarChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis dataKey='label' tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) => compactCurrency(value)}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.longLabel ?? ''}
                    valueFormatter={(value) => formatCurrency(value)}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey='pickupNet' stackId='venta' fill='var(--color-pickupNet)' stroke='var(--card)' strokeWidth={2} />
              <Bar
                dataKey='shippingNet'
                stackId='venta'
                fill='var(--color-shippingNet)'
                stroke='var(--card)'
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className='flex h-72 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground'>
            Sin ventas en este periodo.
          </p>
        )}
        <p className='sr-only'>{summary}</p>
      </TabsContent>
      <TabsContent value='tabla' className='pt-2'>
        <div className='max-h-80 overflow-y-auto rounded-lg border'>
          <Table>
            <TableHeader className='sticky top-0 bg-card'>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead className='text-right'>Pickup</TableHead>
                <TableHead className='text-right'>Envío</TableHead>
                <TableHead className='text-right'>Venta neta</TableHead>
                <TableHead className='text-right'>Órdenes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((point) => (
                <TableRow key={point.bucket}>
                  <TableCell>{point.longLabel}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatCurrency(point.pickupNet)}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatCurrency(point.shippingNet)}</TableCell>
                  <TableCell className='text-right font-medium tabular-nums'>{formatCurrency(point.netAmount)}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatNumber(point.orders)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
