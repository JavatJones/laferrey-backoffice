import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import type { StoreOrderLine } from '@/lib/orders/queries'
import { formatCurrency, formatNumber } from '@/lib/shopify/format'

export const OrderLines = ({ lines, currency }: { lines: StoreOrderLine[]; currency: string }) => {
  return (
    <ul className='flex flex-col divide-y'>
      {lines.map((line) => {
        const removed = line.quantity - line.currentQuantity
        return (
          <li key={line.id} className='flex gap-3 py-3 first:pt-0 last:pb-0'>
            <div className='relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted'>
              {line.imageUrl ? (
                <Image src={line.imageUrl} alt='' fill sizes='56px' className='object-cover' />
              ) : (
                <span className='flex size-full items-center justify-center text-muted-foreground'>
                  <ImageOff className='size-4' aria-hidden />
                </span>
              )}
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <p className='line-clamp-2 text-sm font-medium'>{line.title}</p>
              <p className='text-xs text-muted-foreground'>
                {[line.variantTitle, line.sku && `SKU ${line.sku}`].filter(Boolean).join(' · ') || '—'}
              </p>
              <p className='text-xs text-muted-foreground tabular-nums'>
                {formatNumber(line.currentQuantity)} × {formatCurrency(line.discountedUnitPrice, currency)}
                {line.discountedUnitPrice < line.originalUnitPrice && (
                  <span className='ml-1 line-through'>{formatCurrency(line.originalUnitPrice, currency)}</span>
                )}
                {removed > 0 && <span className='ml-1 text-warning'>({formatNumber(removed)} reembolsadas o quitadas)</span>}
              </p>
            </div>
            <p className='shrink-0 text-sm font-medium tabular-nums'>{formatCurrency(line.netTotal, currency)}</p>
          </li>
        )
      })}
    </ul>
  )
}
