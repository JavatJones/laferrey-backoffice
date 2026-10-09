import Image from 'next/image'
import { ImageOff, PackageSearch } from 'lucide-react'
import { formatNumber, formatPriceRange, productStatus } from '@/lib/shopify/format'
import type { Product } from '@/lib/shopify/queries'
import { StatusBadge } from './status-badge'

type Props = {
  products: Product[]
  // Handle de la tienda (lo que va antes de .myshopify.com), para abrir el producto en el admin.
  storeHandle: string
  search?: string
}

const inventoryLabel = ({ tracksInventory, totalInventory }: Product) => {
  if (!tracksInventory || totalInventory === null) return 'Inventario no rastreado'
  if (totalInventory <= 0) return 'Sin existencias'
  return `${formatNumber(totalInventory)} en existencia`
}

export const ProductsGrid = ({ products, storeHandle, search }: Props) => {
  if (products.length === 0) {
    return (
      <div className='flex flex-col items-center gap-2 py-16 text-center text-muted-foreground'>
        <PackageSearch size={32} />
        <p>{search ? `No hay productos que coincidan con “${search}”.` : 'Todavía no hay productos en la tienda.'}</p>
      </div>
    )
  }

  return (
    <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
      {products.map((product) => {
        const image = product.featuredMedia?.preview?.image
        const status = productStatus(product.status)
        const variants = product.variantsCount?.count ?? 0
        const outOfStock = product.tracksInventory && (product.totalInventory ?? 0) <= 0

        return (
          <li key={product.id}>
            <a
              href={`https://admin.shopify.com/store/${storeHandle}/products/${product.legacyResourceId}`}
              target='_blank'
              rel='noreferrer'
              className='group flex h-full flex-col overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10 transition-shadow hover:shadow-md'
            >
              <div className='relative aspect-square bg-neutral-100'>
                {image ? (
                  <Image
                    src={image.url}
                    alt={image.altText ?? product.title}
                    fill
                    sizes='(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
                    className='object-cover transition-transform group-hover:scale-105'
                  />
                ) : (
                  <div className='flex h-full items-center justify-center text-muted-foreground'>
                    <ImageOff size={28} />
                  </div>
                )}
                {status.tone !== 'success' && (
                  <div className='absolute top-2 left-2'>
                    <StatusBadge {...status} />
                  </div>
                )}
              </div>
              <div className='flex flex-1 flex-col gap-1 p-3'>
                <p className='line-clamp-2 leading-snug font-medium'>{product.title}</p>
                {(product.vendor || product.productType) && (
                  <p className='truncate text-xs text-muted-foreground'>
                    {[product.vendor, product.productType].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className='mt-auto pt-2 font-semibold tabular-nums'>
                  {formatPriceRange(product.priceRangeV2.minVariantPrice, product.priceRangeV2.maxVariantPrice)}
                </p>
                <p className={outOfStock ? 'text-xs text-red-700' : 'text-xs text-muted-foreground'}>
                  {inventoryLabel(product)}
                  {variants > 1 && ` · ${variants} variantes`}
                </p>
              </div>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
