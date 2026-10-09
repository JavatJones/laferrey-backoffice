import React from 'react'
import { cn } from '@/lib/utils'

const Skeleton = ({ className }: { className: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-neutral-200', className)} />
)

const HardwareStoreLoading = () => {
  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8' aria-busy>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-7 w-56' />
        <Skeleton className='h-4 w-40' />
      </div>
      <div className='grid gap-4 sm:grid-cols-3'>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className='h-24 rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-[480px] rounded-xl' />
    </div>
  )
}

export default HardwareStoreLoading
