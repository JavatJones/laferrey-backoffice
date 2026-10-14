'use client'

import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MAX_OPTIONS, type ProductFormValues } from '@/lib/validations/product'
import { TagsInput } from './tags-input'

type Props = {
  disabled?: boolean
  // Se llama cuando cambian las opciones para regenerar las variantes.
  onOptionsChange: (options: ProductFormValues['options'], rename?: { from: string; to: string }) => void
}

export const OptionsEditor = ({ disabled, onOptionsChange }: Props) => {
  const { control, getValues, formState } = useFormContext<ProductFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const nameAtFocus = useRef<string>('')
  const optionsError = formState.errors.options

  return (
    <FieldGroup>
      {fields.map((field, index) => {
        const errors = formState.errors.options?.[index]
        return (
          <div key={field.id} className='flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start'>
            <Controller
              name={`options.${index}.name`}
              control={control}
              render={({ field: nameField, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='sm:w-48'>
                  <FieldLabel htmlFor={`option-${index}-name`}>Opción</FieldLabel>
                  <Input
                    id={`option-${index}-name`}
                    placeholder='Tamaño, Color…'
                    autoComplete='off'
                    disabled={disabled}
                    aria-invalid={fieldState.invalid || undefined}
                    {...nameField}
                    onFocus={() => {
                      nameAtFocus.current = nameField.value
                    }}
                    onBlur={() => {
                      nameField.onBlur()
                      const to = nameField.value.trim()
                      if (to !== nameAtFocus.current) onOptionsChange(getValues('options'), { from: nameAtFocus.current, to })
                    }}
                  />
                  {errors?.name && <FieldError errors={[errors.name]} />}
                </Field>
              )}
            />
            <Controller
              name={`options.${index}.values`}
              control={control}
              render={({ field: valuesField, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='flex-1'>
                  <FieldLabel htmlFor={`option-${index}-values`}>Valores</FieldLabel>
                  <TagsInput
                    id={`option-${index}-values`}
                    value={valuesField.value}
                    placeholder='Escribe un valor y presiona Enter'
                    invalid={fieldState.invalid}
                    removeLabel={(value) => `Quitar el valor ${value}`}
                    onBlur={valuesField.onBlur}
                    onChange={(values) => {
                      valuesField.onChange(values)
                      onOptionsChange(getValues('options'))
                    }}
                  />
                  {errors?.values && <FieldError errors={[errors.values.root ?? errors.values]} />}
                </Field>
              )}
            />
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='self-end sm:mt-6 sm:self-start'
              aria-label={`Quitar la opción ${field.name || index + 1}`}
              disabled={disabled || fields.length === 1}
              onClick={() => {
                remove(index)
                onOptionsChange(getValues('options'))
              }}
            >
              <Trash2 />
            </Button>
          </div>
        )
      })}
      {optionsError?.message && <FieldError>{optionsError.message}</FieldError>}
      <div className='flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          variant='outline'
          size='lg'
          disabled={disabled || fields.length >= MAX_OPTIONS}
          onClick={() => append({ name: '', values: [] })}
        >
          <Plus data-icon='inline-start' />
          Agregar opción
        </Button>
        <FieldDescription>Hasta {MAX_OPTIONS} opciones. Se crea una variante por cada combinación.</FieldDescription>
      </div>
    </FieldGroup>
  )
}
