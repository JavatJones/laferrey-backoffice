import { Store, Truck } from 'lucide-react'
import type { SalesSummary } from '@/lib/finance/queries'
import { formatCurrency, formatNumber } from '@/lib/shopify/format'

// Comparativo de venta y órdenes entre pickup y envío.
export const DeliverySplit = ({ summary }: { summary: SalesSummary }) => {
  const rows = [
    { key: 'pickup', label: 'Pickup', icon: Store, net: summary.pickupNet, orders: summary.pickupOrders, color: 'bg-chart-1' },
    { key: 'shipping', label: 'Envío', icon: Truck, net: summary.shippingNet, orders: summary.shippingOrders, color: 'bg-chart-2' },
  ]
  const total = summary.pickupNet + summary.shippingNet

  return (
    <div className='flex flex-col gap-5'>
      {total > 0 && (
        <div className='flex h-3 gap-0.5 overflow-hidden rounded-full' aria-hidden>
          {rows.map((row) =>
            row.net > 0 ? <span key={row.key} className={row.color} style={{ flexGrow: row.net }} /> : null
          )}
        </div>
      )}
      <dl className='grid gap-4 sm:grid-cols-2'>
        {rows.map(({ key, label, icon: Icon, net, orders, color }) => (
          <div key={key} className='flex flex-col gap-1'>
            <dt className='flex items-center gap-2 text-sm text-muted-foreground'>
              <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
              <Icon className='size-4' aria-hidden />
              {label}
            </dt>
            <dd className='text-xl font-semibold tabular-nums'>{formatCurrency(net)}</dd>
            <dd className='text-xs text-muted-foreground tabular-nums'>
              {formatNumber(orders)} {orders === 1 ? 'orden' : 'órdenes'}
              {total > 0 && ` · ${Math.round((net / total) * 100)} % de la venta`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
