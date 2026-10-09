import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { PageInfo } from '@/lib/shopify/queries'
import { cn } from '@/lib/utils'

type Props = {
  pageInfo: PageInfo
  // Construye la URL de la página destino a partir del cursor.
  hrefFor: (cursor: { after: string } | { before: string }) => string
  className?: string
}

export const Pagination = ({ pageInfo, hrefFor, className }: Props) => {
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = pageInfo

  if (!hasPreviousPage && !hasNextPage) return null

  const linkClass = buttonVariants({ variant: 'outline', size: 'lg' })
  const disabledClass = cn(linkClass, 'pointer-events-none opacity-50')

  return (
    <nav className={cn('flex items-center justify-end gap-2', className)} aria-label='Paginación'>
      {hasPreviousPage && startCursor ? (
        <Link href={hrefFor({ before: startCursor })} className={linkClass}>
          <ChevronLeft /> Anterior
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled>
          <ChevronLeft /> Anterior
        </span>
      )}
      {hasNextPage && endCursor ? (
        <Link href={hrefFor({ after: endCursor })} className={linkClass}>
          Siguiente <ChevronRight />
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled>
          Siguiente <ChevronRight />
        </span>
      )}
    </nav>
  )
}
