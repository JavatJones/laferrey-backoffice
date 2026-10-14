import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  href?: string
}

export const StatCard = ({ label, value, icon: Icon, hint, href }: Props) => {
  const card = (
    <Card className={cn('h-full gap-2', href && 'transition-colors hover:bg-accent/60')}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className='text-2xl font-bold tracking-tight tabular-nums sm:text-3xl'>{value}</CardTitle>
        <CardAction>
          <span className='flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
            <Icon className='size-4' aria-hidden />
          </span>
        </CardAction>
        {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
      </CardHeader>
    </Card>
  )

  if (!href) return card

  return (
    <Link href={href} className='rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'>
      {card}
    </Link>
  )
}
