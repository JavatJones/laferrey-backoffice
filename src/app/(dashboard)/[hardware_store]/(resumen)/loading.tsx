import { Skeleton } from '@/components/ui/skeleton'

const HardwareStoreLoading = () => {
  return (
    <div
      className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8'
      aria-busy='true'
      aria-live='polite'
    >
      <span className='sr-only'>Cargando…</span>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-8 w-56' />
      </div>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className='h-28 rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-96 rounded-xl' />
    </div>
  )
}

export default HardwareStoreLoading
