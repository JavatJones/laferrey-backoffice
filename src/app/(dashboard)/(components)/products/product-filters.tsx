'use client'

import { useTransition } from 'react'
import Form from 'next/form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ProductListFilters } from '@/lib/validations/product'

const STATUS_OPTIONS = [
  { value: 'activo', label: 'Activos' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'archivado', label: 'Archivados' },
  { value: 'no-listado', label: 'No listados' },
] as const

export const ProductFilters = ({ filters }: { filters: ProductListFilters }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setStatus = (status: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (status) params.set('estado', status)
    else params.delete('estado')
    // Cambiar el filtro reinicia la paginación por cursor.
    params.delete('despues')
    params.delete('antes')
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }))
  }

  return (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='-mx-1 overflow-x-auto px-1'>
        <ToggleGroup
          variant='outline'
          spacing={0}
          value={filters.estado ? [filters.estado] : []}
          onValueChange={(value) => setStatus(value[0] ?? null)}
          aria-label='Filtrar por estado'
        >
          {STATUS_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Form action={pathname} className='w-full lg:w-72'>
        {filters.estado && <input type='hidden' name='estado' value={filters.estado} />}
        <Field>
          <FieldLabel htmlFor='products-search' className='sr-only'>
            Buscar productos
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='products-search'
              name='q'
              type='search'
              defaultValue={filters.q}
              placeholder='Buscar por título, SKU…'
              autoComplete='off'
            />
            <InputGroupAddon>{isPending ? <Spinner /> : <Search aria-hidden />}</InputGroupAddon>
          </InputGroup>
        </Field>
      </Form>
    </div>
  )
}
