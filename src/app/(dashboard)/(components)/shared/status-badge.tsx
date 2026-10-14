import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatusTone } from '@/lib/shopify/format'
import { cn } from '@/lib/utils'

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  danger: 'bg-destructive/10 text-destructive ring-destructive/20',
  info: 'bg-info/10 text-info ring-info/20',
  neutral: 'bg-muted text-muted-foreground ring-foreground/10',
}

type Props = {
  label: string
  tone: StatusTone
  icon?: LucideIcon
  className?: string
}

// El color nunca va solo: la insignia siempre lleva texto.
export const StatusBadge = ({ label, tone, icon: Icon, className }: Props) => {
  return (
    <Badge variant='secondary' className={cn('ring-1 ring-inset', TONE_CLASSES[tone], className)}>
      {Icon && <Icon data-icon='inline-start' aria-hidden />}
      {label}
    </Badge>
  )
}
