import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PageInfo } from '@/lib/shopify/types'

type Props = {
  pageInfo: PageInfo
  hrefFor: (cursor: { despues: string } | { antes: string }) => string
  summary?: React.ReactNode
}

// Shopify pagina con cursores: "después" avanza y "antes" retrocede.
export const CursorPagination = ({ pageInfo, hrefFor, summary }: Props) => {
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = pageInfo
  if (!hasPreviousPage && !hasNextPage) return summary ? <p className='text-sm text-muted-foreground'>{summary}</p> : null

  return (
    <nav aria-label='Paginación' className='flex items-center justify-between gap-3'>
      <p className='text-sm text-muted-foreground'>{summary}</p>
      <div className='flex gap-2'>
        {hasPreviousPage && startCursor ? (
          <Button variant='outline' size='lg' nativeButton={false} render={<Link href={hrefFor({ antes: startCursor })} />}>
            <ChevronLeft data-icon='inline-start' />
            Anterior
          </Button>
        ) : (
          <Button variant='outline' size='lg' disabled>
            <ChevronLeft data-icon='inline-start' />
            Anterior
          </Button>
        )}
        {hasNextPage && endCursor ? (
          <Button variant='outline' size='lg' nativeButton={false} render={<Link href={hrefFor({ despues: endCursor })} />}>
            Siguiente
            <ChevronRight data-icon='inline-end' />
          </Button>
        ) : (
          <Button variant='outline' size='lg' disabled>
            Siguiente
            <ChevronRight data-icon='inline-end' />
          </Button>
        )}
      </div>
    </nav>
  )
}
