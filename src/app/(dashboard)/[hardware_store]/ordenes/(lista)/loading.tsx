import { Skeleton } from '@/components/ui/skeleton'

// Solo envuelve la lista: el detalle queda fuera de este Suspense para poder
// responder 404 real cuando la orden no es de la ferretería.
const OrdersLoading = () => {
  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8' aria-busy='true'>
      <span className='sr-only'>Cargando órdenes…</span>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='h-8 w-40' />
      </div>
      <div className='flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10'>
        <Skeleton className='h-8 w-full max-w-xl' />
        <Skeleton className='h-9 w-full' />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className='h-12 w-full' />
        ))}
      </div>
    </div>
  )
}

export default OrdersLoading
