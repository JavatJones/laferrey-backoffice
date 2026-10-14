import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/shopify/format'

type Props = {
  page: number
  pageCount: number
  total: number
  hrefFor: (page: number) => string
  label?: string
}

export const OffsetPagination = ({ page, pageCount, total, hrefFor, label = 'resultados' }: Props) => {
  if (total === 0) return null

  return (
    <nav aria-label='Paginación' className='flex items-center justify-between gap-3'>
      <p className='text-sm text-muted-foreground'>
        Página {formatNumber(page)} de {formatNumber(pageCount)} · {formatNumber(total)} {label}
      </p>
      <div className='flex gap-2'>
        {page > 1 ? (
          <Button variant='outline' size='lg' nativeButton={false} render={<Link href={hrefFor(page - 1)} />}>
            <ChevronLeft data-icon='inline-start' />
            Anterior
          </Button>
        ) : (
          <Button variant='outline' size='lg' disabled>
            <ChevronLeft data-icon='inline-start' />
            Anterior
          </Button>
        )}
        {page < pageCount ? (
          <Button variant='outline' size='lg' nativeButton={false} render={<Link href={hrefFor(page + 1)} />}>
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
