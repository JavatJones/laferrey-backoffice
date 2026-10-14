'use client'

import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/shopify/format'
import { WEIGHT_UNITS, type ProductFormValues } from '@/lib/validations/product'

const WEIGHT_LABELS: Record<(typeof WEIGHT_UNITS)[number], string> = {
  KILOGRAMS: 'kg',
  GRAMS: 'g',
  POUNDS: 'lb',
  OUNCES: 'oz',
}

const weightItems = WEIGHT_UNITS.map((unit) => ({ value: unit, label: WEIGHT_LABELS[unit] }))

type Section = 'price' | 'inventory' | 'shipping'

type Props = {
  index: number
  sections: Section[]
  // Nombre de la sucursal para explicar dónde viven las existencias.
  locationLabel: string
  disabled?: boolean
}

const MoneyInput = ({ id, invalid, ...props }: React.ComponentProps<typeof InputGroupInput> & { invalid?: boolean }) => (
  <InputGroup>
    <InputGroupAddon>
      <InputGroupText>$</InputGroupText>
    </InputGroupAddon>
    <InputGroupInput id={id} inputMode='decimal' autoComplete='off' placeholder='0.00' aria-invalid={invalid || undefined} {...props} />
    <InputGroupAddon align='inline-end'>
      <InputGroupText>MXN</InputGroupText>
    </InputGroupAddon>
  </InputGroup>
)

export const VariantFields = ({ index, sections, locationLabel, disabled }: Props) => {
  const { control, register, formState } = useFormContext<ProductFormValues>()
  const errors = formState.errors.variants?.[index]
  const prefix = `variant-${index}`
  const [price, cost, tracked] = useWatch({
    control,
    name: [`variants.${index}.price`, `variants.${index}.cost`, `variants.${index}.tracked`],
  })

  const margin =
    Number(price) > 0 && cost !== '' && Number(cost) >= 0
      ? { amount: Number(price) - Number(cost), percent: ((Number(price) - Number(cost)) / Number(price)) * 100 }
      : null

  return (
    <FieldGroup>
      {sections.includes('price') && (
        <FieldSet>
          <FieldLegend>Precio</FieldLegend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field data-invalid={Boolean(errors?.price)}>
              <FieldLabel htmlFor={`${prefix}-price`}>Precio</FieldLabel>
              <MoneyInput id={`${prefix}-price`} invalid={Boolean(errors?.price)} disabled={disabled} {...register(`variants.${index}.price`)} />
              {errors?.price && <FieldError errors={[errors.price]} />}
            </Field>
            <Field data-invalid={Boolean(errors?.compareAtPrice)}>
              <FieldLabel htmlFor={`${prefix}-compare`}>Precio de comparación</FieldLabel>
              <MoneyInput
                id={`${prefix}-compare`}
                invalid={Boolean(errors?.compareAtPrice)}
                disabled={disabled}
                {...register(`variants.${index}.compareAtPrice`)}
              />
              <FieldDescription>Precio anterior, tachado en la tienda. Opcional.</FieldDescription>
              {errors?.compareAtPrice && <FieldError errors={[errors.compareAtPrice]} />}
            </Field>
            <Field data-invalid={Boolean(errors?.cost)}>
              <FieldLabel htmlFor={`${prefix}-cost`}>Costo por artículo</FieldLabel>
              <MoneyInput id={`${prefix}-cost`} invalid={Boolean(errors?.cost)} disabled={disabled} {...register(`variants.${index}.cost`)} />
              <FieldDescription>
                {margin
                  ? `Margen: ${formatCurrency(margin.amount)} (${margin.percent.toFixed(0)} %). Los clientes no lo ven.`
                  : 'Los clientes no lo ven.'}
              </FieldDescription>
              {errors?.cost && <FieldError errors={[errors.cost]} />}
            </Field>
          </div>
          <Controller
            name={`variants.${index}.taxable`}
            control={control}
            render={({ field }) => (
              <Field orientation='horizontal'>
                <Checkbox
                  id={`${prefix}-taxable`}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  disabled={disabled}
                />
                <FieldLabel htmlFor={`${prefix}-taxable`} className='font-normal'>
                  Cobrar impuestos
                </FieldLabel>
              </Field>
            )}
          />
        </FieldSet>
      )}

      {sections.includes('inventory') && (
        <FieldSet>
          <FieldLegend>Inventario</FieldLegend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field data-invalid={Boolean(errors?.sku)}>
              <FieldLabel htmlFor={`${prefix}-sku`}>SKU</FieldLabel>
              <Input id={`${prefix}-sku`} autoComplete='off' disabled={disabled} aria-invalid={Boolean(errors?.sku) || undefined} {...register(`variants.${index}.sku`)} />
              {errors?.sku && <FieldError errors={[errors.sku]} />}
            </Field>
            <Field data-invalid={Boolean(errors?.barcode)}>
              <FieldLabel htmlFor={`${prefix}-barcode`}>Código de barras</FieldLabel>
              <Input
                id={`${prefix}-barcode`}
                inputMode='numeric'
                autoComplete='off'
                placeholder='EAN, UPC…'
                disabled={disabled}
                aria-invalid={Boolean(errors?.barcode) || undefined}
                {...register(`variants.${index}.barcode`)}
              />
              {errors?.barcode && <FieldError errors={[errors.barcode]} />}
            </Field>
          </div>
          <Controller
            name={`variants.${index}.tracked`}
            control={control}
            render={({ field }) => (
              <Field orientation='horizontal'>
                <Switch
                  id={`${prefix}-tracked`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <FieldContent>
                  <FieldLabel htmlFor={`${prefix}-tracked`}>Llevar control de existencias</FieldLabel>
                  <FieldDescription>Shopify descuenta las unidades con cada venta.</FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
          {tracked && (
            <>
              <Field data-invalid={Boolean(errors?.quantity)} className='sm:max-w-xs'>
                <FieldLabel htmlFor={`${prefix}-quantity`}>Existencias en {locationLabel}</FieldLabel>
                <Input
                  id={`${prefix}-quantity`}
                  inputMode='numeric'
                  autoComplete='off'
                  disabled={disabled}
                  aria-invalid={Boolean(errors?.quantity) || undefined}
                  {...register(`variants.${index}.quantity`)}
                />
                {errors?.quantity && <FieldError errors={[errors.quantity]} />}
              </Field>
              <Controller
                name={`variants.${index}.inventoryPolicy`}
                control={control}
                render={({ field }) => (
                  <Field orientation='horizontal'>
                    <Checkbox
                      id={`${prefix}-policy`}
                      checked={field.value === 'CONTINUE'}
                      onCheckedChange={(checked) => field.onChange(checked === true ? 'CONTINUE' : 'DENY')}
                      disabled={disabled}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={`${prefix}-policy`} className='font-normal'>
                        Vender aunque no haya existencias
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                )}
              />
            </>
          )}
        </FieldSet>
      )}

      {sections.includes('shipping') && (
        <FieldSet>
          <FieldLegend>Envío</FieldLegend>
          <Controller
            name={`variants.${index}.requiresShipping`}
            control={control}
            render={({ field }) => (
              <Field orientation='horizontal'>
                <Switch
                  id={`${prefix}-shipping`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <FieldContent>
                  <FieldLabel htmlFor={`${prefix}-shipping`}>Es un producto físico</FieldLabel>
                  <FieldDescription>Requiere envío o recogida. Desactívalo solo para servicios.</FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
          <div className='flex gap-2 sm:max-w-xs'>
            <Field data-invalid={Boolean(errors?.weightValue)} className='flex-1'>
              <FieldLabel htmlFor={`${prefix}-weight`}>Peso</FieldLabel>
              <Input
                id={`${prefix}-weight`}
                inputMode='decimal'
                autoComplete='off'
                placeholder='0.0'
                disabled={disabled}
                aria-invalid={Boolean(errors?.weightValue) || undefined}
                {...register(`variants.${index}.weightValue`)}
              />
              {errors?.weightValue && <FieldError errors={[errors.weightValue]} />}
            </Field>
            <Controller
              name={`variants.${index}.weightUnit`}
              control={control}
              render={({ field }) => (
                <Field className='w-24'>
                  <FieldLabel htmlFor={`${prefix}-weight-unit`}>Unidad</FieldLabel>
                  <Select items={weightItems} value={field.value} onValueChange={(value) => value && field.onChange(value)} disabled={disabled}>
                    <SelectTrigger id={`${prefix}-weight-unit`} className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {weightItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
        </FieldSet>
      )}
    </FieldGroup>
  )
}
