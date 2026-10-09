import { badgeVariants } from '@/components/ui/badge'
import type { StatusTone } from '@/lib/shopify/format'
import { cn } from '@/lib/utils'

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  neutral: 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-500/20',
}

export const StatusBadge = ({ label, tone }: { label: string; tone: StatusTone }) => {
  return <span className={cn(badgeVariants({ variant: 'secondary' }), TONE_CLASSES[tone])}>{label}</span>
}
