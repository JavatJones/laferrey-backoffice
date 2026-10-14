'use client'

import { useState, useTransition } from 'react'
import { CircleCheck, PackageCheck, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import {
  panelTransitionsFrom,
  quickTransitionLabel,
  transitionLabel,
  type DeliveryMethod,
  type PreparationStatus,
} from '@/lib/orders/status'
import { cn } from '@/lib/utils'
import { updateOrderStatus } from '@/app/(dashboard)/[hardware_store]/ordenes/actions'
import { DeliverPickupDialog } from './deliver-pickup-dialog'

type Props = {
  slug: string
  orderId: string
  orderName: string
  customerName: string | null
  status: PreparationStatus
  method: DeliveryMethod
  // quick: solo la siguiente acción, para la fila de la lista.
  variant?: 'full' | 'quick'
  className?: string
}

const ICONS: Partial<Record<PreparationStatus, typeof CircleCheck>> = {
  ready_for_pickup: PackageCheck,
  ready_to_ship: PackageCheck,
  completed: CircleCheck,
  preparing: Undo2,
}

// Solo muestra las transiciones válidas (RN-19); la base de datos vuelve a validarlas.
// Entregado abre la verificación del cliente con su código (RN-27).
export const OrderStatusActions = ({
  slug,
  orderId,
  orderName,
  customerName,
  status,
  method,
  variant = 'full',
  className,
}: Props) => {
  const [isPending, startTransition] = useTransition()
  const [pendingTo, setPendingTo] = useState<PreparationStatus | null>(null)
  const [deliverOpen, setDeliverOpen] = useState(false)

  const transitions = panelTransitionsFrom(status, method)
  const forward = transitions.filter((to) => to !== 'preparing')
  const visible = variant === 'quick' ? forward.slice(0, 1) : transitions
  if (visible.length === 0) return null

  const run = (to: PreparationStatus) => {
    setPendingTo(to)
    startTransition(async () => {
      const result = await updateOrderStatus({ slug, orderId, to })
      setPendingTo(null)
      if (!result.ok) {
        toast.add({ type: 'error', title: 'No se pudo cambiar el estado', description: result.error })
        return
      }
      if (result.pickup?.sent) {
        toast.add({
          type: 'success',
          title: `${orderName}: ${result.label}`,
          description: `Se envió el código de recogida a ${result.pickup.sentToMasked}.`,
        })
      } else if (result.pickup && !result.pickup.sent) {
        toast.add({
          type: 'warning',
          title: `${orderName}: ${result.label}, pero sin código`,
          description: result.pickup.error,
        })
      } else {
        toast.add({ type: 'success', title: `${orderName}: ${result.label}` })
      }
      if (result.push?.status === 'failed') {
        toast.add({
          type: 'warning',
          title: 'No se reflejó en Shopify',
          description: 'El estado se guardó. Puedes reintentar desde el detalle de la orden.',
        })
      }
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {visible.map((to) => {
        const Icon = ICONS[to]
        const isRevert = to === 'preparing'
        const busy = isPending && pendingTo === to
        return (
          <Button
            key={to}
            variant={isRevert ? 'outline' : 'default'}
            size={variant === 'quick' ? 'default' : 'lg'}
            disabled={isPending}
            aria-label={variant === 'quick' ? `${transitionLabel(to, method)} ${orderName}` : undefined}
            onClick={() => (to === 'completed' ? setDeliverOpen(true) : run(to))}
          >
            {busy ? <Spinner data-icon='inline-start' /> : Icon && <Icon data-icon='inline-start' aria-hidden />}
            {variant === 'quick' ? quickTransitionLabel(to, method) : transitionLabel(to, method)}
          </Button>
        )
      })}

      {transitions.includes('completed') && (
        <DeliverPickupDialog
          slug={slug}
          orderId={orderId}
          orderName={orderName}
          customerName={customerName}
          open={deliverOpen}
          onOpenChange={setDeliverOpen}
        />
      )}
    </div>
  )
}
