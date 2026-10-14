import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { StoreOrderSummary } from '@/lib/orders/queries'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/shopify/format'
import { DeliveryBadge, OrderStatusBadge, PaymentBadge, TestBadge } from './order-badges'

type Props = {
  orders: StoreOrderSummary[]
  slug: string
  // Acción rápida por fila (Fase 5); se renderiza al final de cada fila o tarjeta.
  renderAction?: (order: StoreOrderSummary) => React.ReactNode
  compact?: boolean
}

const orderHref = (slug: string, order: StoreOrderSummary) => `/${slug}/ordenes/${order.orderId}`

// Tabla en escritorio y tarjetas en celular.
export const OrdersTable = ({ orders, slug, renderAction, compact }: Props) => {
  return (
    <>
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='pl-4'>Orden</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              {!compact && <TableHead>Pago</TableHead>}
              {!compact && <TableHead className='text-right'>Unidades</TableHead>}
              <TableHead className='text-right'>Total</TableHead>
              {renderAction && <TableHead className='pr-4 text-right'>Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.orderId} className='group'>
                <TableCell className='pl-4'>
                  <div className='flex items-center gap-2'>
                    <Link
                      href={orderHref(slug, order)}
                      className='font-mono font-medium underline-offset-4 hover:underline focus-visible:underline'
                    >
                      {order.name}
                    </Link>
                    {order.isTest && <TestBadge />}
                  </div>
                </TableCell>
                <TableCell className='text-muted-foreground'>{formatDateTime(order.processedAt)}</TableCell>
                <TableCell className='max-w-48 truncate'>{order.customerName ?? '—'}</TableCell>
                <TableCell>
                  <DeliveryBadge method={order.deliveryMethod} />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} method={order.deliveryMethod} />
                </TableCell>
                {!compact && (
                  <TableCell>
                    <PaymentBadge status={order.financialStatus} />
                  </TableCell>
                )}
                {!compact && <TableCell className='text-right tabular-nums'>{formatNumber(order.units)}</TableCell>}
                <TableCell className='text-right font-medium tabular-nums'>
                  {formatCurrency(order.netAmount, order.currency)}
                </TableCell>
                {renderAction && <TableCell className='pr-4 text-right'>{renderAction(order)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className='flex flex-col divide-y md:hidden'>
        {orders.map((order) => (
          <li key={order.orderId} className='flex flex-col gap-3 p-4'>
            <Link href={orderHref(slug, order)} className='flex items-start justify-between gap-3'>
              <div className='flex min-w-0 flex-col gap-1'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono font-semibold'>{order.name}</span>
                  {order.isTest && <TestBadge />}
                </div>
                <span className='truncate text-sm'>{order.customerName ?? '—'}</span>
                <span className='text-xs text-muted-foreground'>{formatDateTime(order.processedAt)}</span>
              </div>
              <div className='flex shrink-0 items-center gap-1'>
                <span className='font-semibold tabular-nums'>{formatCurrency(order.netAmount, order.currency)}</span>
                <ChevronRight className='size-4 text-muted-foreground' aria-hidden />
              </div>
            </Link>
            <div className='flex flex-wrap items-center gap-2'>
              <DeliveryBadge method={order.deliveryMethod} />
              <OrderStatusBadge status={order.status} method={order.deliveryMethod} />
              {!compact && <PaymentBadge status={order.financialStatus} />}
              {!compact && (
                <span className='text-xs text-muted-foreground'>{formatNumber(order.units)} u.</span>
              )}
            </div>
            {renderAction && <div className='flex'>{renderAction(order)}</div>}
          </li>
        ))}
      </ul>
    </>
  )
}
