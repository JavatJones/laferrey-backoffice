import { Check, X } from 'lucide-react'
import { progressSteps, statusLabel, type DeliveryMethod, type PreparationStatus } from '@/lib/orders/status'
import { cn } from '@/lib/utils'

// Línea de progreso: Preparando → Listo → Entregado/Enviado.
export const StatusProgress = ({ status, method }: { status: PreparationStatus; method: DeliveryMethod }) => {
  if (status === 'cancelled') {
    return (
      <div className='flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive'>
        <X className='size-4' aria-hidden />
        Orden cancelada
      </div>
    )
  }

  const steps = progressSteps(method)
  const currentIndex = steps.indexOf(status)

  return (
    <ol className='grid grid-cols-3 gap-2' aria-label='Progreso de preparación'>
      {steps.map((step, index) => {
        const done = index < currentIndex || status === 'completed'
        const current = index === currentIndex && status !== 'completed'
        return (
          <li key={step} className='flex flex-col gap-2' aria-current={current ? 'step' : undefined}>
            <span
              className={cn(
                'h-1.5 rounded-full bg-muted',
                done && 'bg-success',
                current && 'bg-primary'
              )}
            />
            <span
              className={cn(
                'flex items-center gap-1 text-xs text-muted-foreground sm:text-sm',
                (done || current) && 'font-medium text-foreground'
              )}
            >
              {done && <Check className='size-3.5 text-success' aria-hidden />}
              {statusLabel(step, method)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
