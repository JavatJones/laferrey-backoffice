import { Bot, User } from 'lucide-react'
import type { StoreOrderEvent } from '@/lib/orders/queries'
import { statusLabel, type DeliveryMethod } from '@/lib/orders/status'
import { formatDateTime } from '@/lib/shopify/format'

type Props = {
  events: StoreOrderEvent[]
  method: DeliveryMethod
  currentUserId: string
  currentUserEmail: string | null
}

// RN-22: quién, cuándo, de qué estado a cuál y si vino del panel o de Shopify.
export const OrderHistory = ({ events, method, currentUserId, currentUserEmail }: Props) => {
  if (events.length === 0) return <p className='text-sm text-muted-foreground'>Sin cambios registrados.</p>

  return (
    <ol className='flex flex-col gap-4'>
      {events.map((event) => {
        const fromShopify = event.source === 'shopify'
        const actor = fromShopify
          ? 'Shopify'
          : event.changedBy === currentUserId
            ? (currentUserEmail ?? 'Tú')
            : 'Otro usuario de la ferretería'
        const Icon = fromShopify ? Bot : User
        return (
          <li key={event.id} className='flex gap-3'>
            <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'>
              <Icon className='size-3.5' aria-hidden />
            </span>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <p className='text-sm'>
                {event.from ? (
                  <>
                    {statusLabel(event.from, method)} → <span className='font-medium'>{statusLabel(event.to, method)}</span>
                  </>
                ) : (
                  <>
                    Llegó la orden: <span className='font-medium'>{statusLabel(event.to, method)}</span>
                  </>
                )}
              </p>
              <p className='truncate text-xs text-muted-foreground'>
                {actor} · {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
