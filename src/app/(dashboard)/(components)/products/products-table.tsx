import Image from 'next/image'
import Link from 'next/link'
import { ImageOff } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber, formatPriceRange } from '@/lib/shopify/format'
import type { StoreProductSummary } from '@/lib/shopify/products'
import { cn } from '@/lib/utils'
import { ProductActionsMenu } from './product-actions-menu'
import { ProductStatusBadge } from './product-status-badge'

const stockLabel = (product: StoreProductSummary) => {
  if (!product.tracksInventory || product.totalInventory === null) return 'Sin seguimiento'
  return `${formatNumber(product.totalInventory)} en existencia`
}

const Thumbnail = ({ product, size }: { product: StoreProductSummary; size: 40 | 56 }) => (
  <div className={cn('relative shrink-0 overflow-hidden rounded-lg bg-muted', size === 40 ? 'size-10' : 'size-14')}>
    {product.imageUrl ? (
      <Image src={product.imageUrl} alt={product.imageAlt ?? ''} fill sizes={`${size}px`} className='object-cover' />
    ) : (
      <span className='flex size-full items-center justify-center text-muted-foreground'>
        <ImageOff className='size-4' aria-hidden />
      </span>
    )}
  </div>
)

export const ProductsTable = ({ products, slug }: { products: StoreProductSummary[]; slug: string }) => {
  const href = (product: StoreProductSummary) => `/${slug}/productos/${product.id}`

  return (
    <>
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='pl-4'>Producto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className='text-right'>Precio</TableHead>
              <TableHead>Existencias</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className='pr-4'>
                <span className='sr-only'>Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className='pl-4'>
                  <Link href={href(product)} className='flex items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'>
                    <Thumbnail product={product} size={40} />
                    <span className='flex min-w-0 flex-col'>
                      <span className='line-clamp-1 max-w-80 font-medium underline-offset-4 hover:underline'>{product.title}</span>
                      <span className='text-xs text-muted-foreground'>
                        {[product.productType, product.variantsCount > 1 && `${product.variantsCount} variantes`]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <ProductStatusBadge status={product.status} />
                </TableCell>
                <TableCell className='text-right tabular-nums'>{formatPriceRange(product.minPrice, product.maxPrice)}</TableCell>
                <TableCell
                  className={cn(
                    'tabular-nums',
                    product.tracksInventory && (product.totalInventory ?? 0) <= 0 && 'text-destructive'
                  )}
                >
                  {stockLabel(product)}
                </TableCell>
                <TableCell className='font-mono text-xs'>{product.sku ?? '—'}</TableCell>
                <TableCell className='text-muted-foreground'>{formatDate(product.updatedAt)}</TableCell>
                <TableCell className='pr-4 text-right'>
                  <ProductActionsMenu slug={slug} productId={product.id} title={product.title} status={product.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className='flex flex-col divide-y md:hidden'>
        {products.map((product) => (
          <li key={product.id} className='flex items-start gap-3 p-4'>
            <Link href={href(product)} className='flex min-w-0 flex-1 gap-3'>
              <Thumbnail product={product} size={56} />
              <span className='flex min-w-0 flex-col gap-1'>
                <span className='line-clamp-2 text-sm font-medium'>{product.title}</span>
                <span className='flex flex-wrap items-center gap-2'>
                  <ProductStatusBadge status={product.status} />
                  <span className='text-sm font-semibold tabular-nums'>
                    {formatPriceRange(product.minPrice, product.maxPrice)}
                  </span>
                </span>
                <span className='text-xs text-muted-foreground'>{stockLabel(product)}</span>
              </span>
            </Link>
            <ProductActionsMenu slug={slug} productId={product.id} title={product.title} status={product.status} />
          </li>
        ))}
      </ul>
    </>
  )
}
