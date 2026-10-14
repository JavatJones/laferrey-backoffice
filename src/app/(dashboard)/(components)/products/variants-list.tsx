'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { ProductFormValues } from '@/lib/validations/product'
import { VariantFields } from './variant-fields'

type Props = { locationLabel: string; disabled?: boolean }

const variantName = (variant: ProductFormValues['variants'][number]) =>
  variant.optionValues.map((value) => value.name).join(' / ') || 'Variante'

export const VariantsList = ({ locationLabel, disabled }: Props) => {
  const { control, register, formState } = useFormContext<ProductFormValues>()
  const { fields } = useFieldArray({ control, name: 'variants', keyName: 'key' })
  const variants = useWatch({ control, name: 'variants' })
  const [editing, setEditing] = useState<number | null>(null)

  if (fields.length === 0 || variants.every((variant) => variant.optionValues.length === 0)) {
    return <p className='text-sm text-muted-foreground'>Agrega valores a las opciones para crear las variantes.</p>
  }

  return (
    <>
      <ul className='flex flex-col divide-y rounded-lg border'>
        <li className='hidden grid-cols-[minmax(0,1fr)_9rem_7rem_9rem_auto] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground md:grid'>
          <span>Variante</span>
          <span>Precio</span>
          <span>Existencias</span>
          <span>SKU</span>
          <span className='sr-only'>Más</span>
        </li>
        {fields.map((field, index) => {
          const variant = variants[index]
          const errors = formState.errors.variants?.[index]
          const name = variantName(variant)
          const hasHiddenErrors = Boolean(
            errors?.compareAtPrice || errors?.cost || errors?.barcode || errors?.weightValue || errors?.root || errors?.message
          )
          return (
            <li
              key={field.key}
              className='grid grid-cols-2 gap-3 p-3 md:grid-cols-[minmax(0,1fr)_9rem_7rem_9rem_auto] md:items-start'
            >
              <div className='col-span-2 flex flex-col md:col-span-1 md:pt-1.5'>
                <span className='font-medium'>{name}</span>
                {variant.id ? null : <span className='text-xs text-muted-foreground'>Nueva</span>}
                {(errors?.message || errors?.root?.message) && (
                  <FieldError>{errors?.message ?? errors?.root?.message}</FieldError>
                )}
              </div>
              <Field data-invalid={Boolean(errors?.price)} className='gap-1'>
                <FieldLabel htmlFor={`variant-row-${index}-price`} className='text-xs md:sr-only'>
                  Precio de {name}
                </FieldLabel>
                <Input
                  id={`variant-row-${index}-price`}
                  inputMode='decimal'
                  placeholder='0.00'
                  disabled={disabled}
                  aria-invalid={Boolean(errors?.price) || undefined}
                  {...register(`variants.${index}.price`)}
                />
                {errors?.price && <FieldError errors={[errors.price]} />}
              </Field>
              <Field data-invalid={Boolean(errors?.quantity)} className='gap-1'>
                <FieldLabel htmlFor={`variant-row-${index}-quantity`} className='text-xs md:sr-only'>
                  Existencias de {name}
                </FieldLabel>
                <Input
                  id={`variant-row-${index}-quantity`}
                  inputMode='numeric'
                  disabled={disabled || !variant.tracked}
                  placeholder={variant.tracked ? '0' : '—'}
                  aria-invalid={Boolean(errors?.quantity) || undefined}
                  {...register(`variants.${index}.quantity`)}
                />
                {errors?.quantity && <FieldError errors={[errors.quantity]} />}
              </Field>
              <Field data-invalid={Boolean(errors?.sku)} className='gap-1'>
                <FieldLabel htmlFor={`variant-row-${index}-sku`} className='text-xs md:sr-only'>
                  SKU de {name}
                </FieldLabel>
                <Input id={`variant-row-${index}-sku`} autoComplete='off' disabled={disabled} {...register(`variants.${index}.sku`)} />
              </Field>
              <Button
                type='button'
                variant={hasHiddenErrors ? 'destructive' : 'outline'}
                size='lg'
                className='self-end md:self-start'
                onClick={() => setEditing(index)}
              >
                <SlidersHorizontal data-icon='inline-start' />
                Más
                <span className='sr-only'> datos de {name}</span>
              </Button>
            </li>
          )
        })}
      </ul>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className='w-full overflow-y-auto sm:max-w-lg'>
          {editing !== null && variants[editing] && (
            <>
              <SheetHeader>
                <SheetTitle>{variantName(variants[editing])}</SheetTitle>
                <SheetDescription>Precio, inventario y envío de esta variante.</SheetDescription>
              </SheetHeader>
              <div className='px-4'>
                <VariantFields
                  index={editing}
                  sections={['price', 'inventory', 'shipping']}
                  locationLabel={locationLabel}
                  disabled={disabled}
                />
              </div>
              <SheetFooter>
                <Button type='button' size='lg' onClick={() => setEditing(null)}>
                  Listo
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
