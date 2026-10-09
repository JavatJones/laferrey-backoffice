import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  label: string
  value: string
  icon: LucideIcon
}

export const StatCard = ({ label, value, icon: Icon }: Props) => {
  return (
    <Card>
      <CardContent className='flex items-center justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <span className='text-sm text-muted-foreground'>{label}</span>
          <span className='text-3xl font-bold tracking-tight tabular-nums'>{value}</span>
        </div>
        <div className='rounded-lg bg-neutral-100 p-2.5 text-neutral-600'>
          <Icon size={20} />
        </div>
      </CardContent>
    </Card>
  )
}
