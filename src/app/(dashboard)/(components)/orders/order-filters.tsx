'use client'

import { useTransition } from 'react'
import Form from 'next/form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Store, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { OrderListFilters } from '@/lib/validations/order'

// Los filtros viven en la URL: se pueden compartir y sobreviven a recargar.
export const OrderFilters = ({ filters }: { filters: OrderListFilters }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setMethod = (method: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (method) params.set('metodo', method)
    else params.delete('metodo')
    params.delete('pagina')
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }))
  }

  const hasFilters = Boolean(filters.q || filters.desde || filters.hasta || filters.metodo)

  return (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
      <ToggleGroup
        variant='outline'
        spacing={0}
        value={filters.metodo ? [filters.metodo] : []}
        onValueChange={(value) => setMethod(value[0] ?? null)}
        aria-label='Método de entrega'
      >
        <ToggleGroupItem value='pickup' aria-label='Solo pickup'>
          <Store data-icon='inline-start' aria-hidden />
          Pickup
        </ToggleGroupItem>
        <ToggleGroupItem value='envio' aria-label='Solo envío'>
          <Truck data-icon='inline-start' aria-hidden />
          Envío
        </ToggleGroupItem>
      </ToggleGroup>

      <Form action={pathname} className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end'>
        <input type='hidden' name='estado' value={filters.estado} />
        {filters.metodo && <input type='hidden' name='metodo' value={filters.metodo} />}
        <Field className='sm:w-64'>
          <FieldLabel htmlFor='orders-search' className='sr-only'>
            Buscar por número de orden o cliente
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='orders-search'
              name='q'
              type='search'
              defaultValue={filters.q}
              placeholder='Número de orden o cliente'
              autoComplete='off'
            />
            <InputGroupAddon>{isPending ? <Spinner /> : <Search aria-hidden />}</InputGroupAddon>
          </InputGroup>
        </Field>
        <div className='flex gap-2'>
          <Field className='flex-1 gap-1 sm:w-40'>
            <FieldLabel htmlFor='orders-from' className='text-xs text-muted-foreground'>
              Desde
            </FieldLabel>
            <Input id='orders-from' name='desde' type='date' defaultValue={filters.desde} />
          </Field>
          <Field className='flex-1 gap-1 sm:w-40'>
            <FieldLabel htmlFor='orders-to' className='text-xs text-muted-foreground'>
              Hasta
            </FieldLabel>
            <Input id='orders-to' name='hasta' type='date' defaultValue={filters.hasta} />
          </Field>
        </div>
        <div className='flex gap-2'>
          <Button type='submit' variant='secondary' size='lg'>
            Filtrar
          </Button>
          {hasFilters && (
            <Button
              type='button'
              variant='ghost'
              size='lg'
              onClick={() => startTransition(() => router.replace(`${pathname}?estado=${filters.estado}`))}
            >
              <X data-icon='inline-start' aria-hidden />
              Limpiar
            </Button>
          )}
        </div>
      </Form>
    </div>
  )
}
