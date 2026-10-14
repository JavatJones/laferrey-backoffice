import { cn } from '@/lib/utils'

export const Logo = ({ className }: { className?: string }) => {
  return <span className={cn('font-black tracking-tight', className)}>LaFerrey</span>
}
