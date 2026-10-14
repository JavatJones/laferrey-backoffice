import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { PageContainer } from '../(components)/shared/page-container'

// Mismo mensaje para lo que no existe y para lo ajeno: no revela si existe (RN-08).
const HardwareStoreNotFound = () => {
  return (
    <PageContainer>
      <Empty className='bg-card ring-1 ring-foreground/10'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No encontrado</EmptyTitle>
          <EmptyDescription>Lo que buscas no existe o no pertenece a tu ferretería.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href='/' className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Volver al resumen
          </Link>
        </EmptyContent>
      </Empty>
    </PageContainer>
  )
}

export default HardwareStoreNotFound
