import { Skeleton } from '@/components/ui/skeleton'

const FinanceLoading = () => {
  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8' aria-busy='true'>
      <span className='sr-only'>Cargando finanzas…</span>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='h-8 w-40' />
      </div>
      <Skeleton className='h-9 w-52' />
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className='h-28 rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-96 rounded-xl' />
    </div>
  )
}

export default FinanceLoading
