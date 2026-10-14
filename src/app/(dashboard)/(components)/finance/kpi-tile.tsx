import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  hint?: string
  // Variación porcentual contra el periodo anterior; null si no hay base.
  change?: number | null
  // Para métricas donde subir es malo (descuentos, devoluciones).
  invert?: boolean
  emphasis?: boolean
}

export const KpiTile = ({ label, value, hint, change, invert, emphasis }: Props) => {
  const direction = change === undefined || change === null ? null : Math.abs(change) < 0.5 ? 0 : Math.sign(change)
  const good = direction === null || direction === 0 ? null : invert ? direction < 0 : direction > 0
  const Icon = direction === 1 ? ArrowUpRight : direction === -1 ? ArrowDownRight : Minus

  return (
    <Card className={cn('h-full gap-1', emphasis && 'col-span-2 ring-2 ring-primary/80 xl:col-span-1')}>
      <CardHeader className='gap-1'>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('font-bold tracking-tight tabular-nums', emphasis ? 'text-3xl' : 'text-xl sm:text-2xl')}>
          {value}
        </CardTitle>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
          {direction !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium tabular-nums',
                good === true && 'text-success',
                good === false && 'text-destructive'
              )}
            >
              <Icon className='size-3.5' aria-hidden />
              {change! > 0 ? '+' : ''}
              {change!.toFixed(0)} %
              <span className='sr-only'> contra el periodo anterior</span>
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      </CardHeader>
    </Card>
  )
}
