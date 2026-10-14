import { Logo } from '@/components/logo'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export const SiteHeader = ({ storeName }: { storeName: string }) => {
  return (
    <header className='sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80'>
      <SidebarTrigger className='-ml-1' />
      <Separator orientation='vertical' className='mr-2 data-vertical:h-4' />
      <div className='flex min-w-0 items-center gap-2 text-sm'>
        <Logo className='md:hidden' />
        <span className='truncate text-muted-foreground'>{storeName}</span>
      </div>
    </header>
  )
}
