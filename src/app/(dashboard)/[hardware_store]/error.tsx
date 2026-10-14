'use client'

import { useEffect } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

const HardwareStoreError = ({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8'>
      <Empty className='bg-card ring-1 ring-foreground/10'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>No se pudo cargar esta sección</EmptyTitle>
          <EmptyDescription>
            Puede ser un problema temporal con Shopify o con la base de datos. Intenta de nuevo.
            {error.digest && <span className='mt-2 block font-mono text-xs'>Código: {error.digest}</span>}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size='lg' onClick={() => retry()}>
            <RotateCw data-icon='inline-start' />
            Reintentar
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

export default HardwareStoreError
