import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Logo } from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

const NotFound = () => {
  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10'>
      <Logo className='text-4xl' />
      <Empty className='w-full max-w-md bg-card ring-1 ring-foreground/10'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No encontrado</EmptyTitle>
          <EmptyDescription>La página que buscas no existe o no tienes acceso a ella.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href='/' className={buttonVariants({ size: 'lg' })}>
            Ir a mi panel
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  )
}

export default NotFound
