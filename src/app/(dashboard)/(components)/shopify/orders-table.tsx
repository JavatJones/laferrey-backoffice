import Link from 'next/link'
import { Receipt } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { financialStatus, formatDateTime, formatMoney, fulfillmentStatus } from '@/lib/shopify/format'
import type { Order } from '@/lib/shopify/queries'
import { StatusBadge } from './status-badge'

type Props = {
  orders: Order[]
  hardwareStore: string
  timeZone: string
}

export const OrdersTable = ({ orders, hardwareStore, timeZone }: Props) => {
  if (orders.length === 0) {
    return (
      <div className='flex flex-col items-center gap-2 py-16 text-center text-muted-foreground'>
        <Receipt size={32} />
        <p>Todavía no hay órdenes en la tienda.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead className='pl-4'>Orden</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Pago</TableHead>
          <TableHead>Preparación</TableHead>
          <TableHead className='text-right'>Artículos</TableHead>
          <TableHead className='pr-4 text-right'>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const payment = financialStatus(order.displayFinancialStatus)
          const fulfillment = fulfillmentStatus(order.displayFulfillmentStatus)

          return (
            <TableRow key={order.id} className={order.cancelledAt ? 'text-muted-foreground' : undefined}>
              <TableCell className='pl-4 font-medium'>
                <Link href={`/${hardwareStore}/${order.legacyResourceId}`} className='hover:underline'>
                  {order.name}
                </Link>
                {order.test && <span className='ml-2 text-xs text-muted-foreground'>Prueba</span>}
              </TableCell>
              <TableCell>{formatDateTime(order.createdAt, timeZone)}</TableCell>
              <TableCell>{order.customer?.displayName ?? '—'}</TableCell>
              <TableCell>
                {order.cancelledAt ? (
                  <StatusBadge label='Cancelada' tone='danger' />
                ) : (
                  payment && <StatusBadge {...payment} />
                )}
              </TableCell>
              <TableCell>
                <StatusBadge {...fulfillment} />
              </TableCell>
              <TableCell className='text-right tabular-nums'>{order.currentSubtotalLineItemsQuantity}</TableCell>
              <TableCell className='pr-4 text-right font-medium tabular-nums'>
                {formatMoney(order.currentTotalPriceSet.shopMoney)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
