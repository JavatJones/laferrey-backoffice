'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Save } from 'lucide-react'
import { Controller, FormProvider, useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  buildVariantsFromOptions,
  productFormSchema,
  type ProductFormValues,
  type ProductStatus,
} from '@/lib/validations/product'
import { createProduct, updateProduct } from '@/app/(dashboard)/[hardware_store]/productos/actions'
import { ImageManager } from './image-manager'
import { OptionsEditor } from './options-editor'
import { RichTextEditor } from './rich-text-editor'
import { TagsInput } from './tags-input'
import { VariantFields } from './variant-fields'
import { VariantsList } from './variants-list'

// RN-12: estados del producto.
const STATUS_ITEMS: { value: ProductStatus; label: string; description: string }[] = [
  { value: 'DRAFT', label: 'Borrador', description: 'No se ve en la tienda.' },
  { value: 'ACTIVE', label: 'Activo', description: 'A la venta en la tienda en línea.' },
  { value: 'UNLISTED', label: 'No listado', description: 'Se abre con su enlace, pero no aparece en búsquedas ni colecciones.' },
  { value: 'ARCHIVED', label: 'Archivado', description: 'Oculto, pero se conserva.' },
]

type Props = {
  slug: string
  mode: 'create' | 'edit'
  productId?: string
  defaultValues: ProductFormValues
  locationLabel: string
  variantsEditable?: boolean
  mediaEditable?: boolean
}

export const ProductForm = ({
  slug,
  mode,
  productId,
  defaultValues,
  locationLabel,
  variantsEditable = true,
  mediaEditable = true,
}: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmSimple, setConfirmSimple] = useState(false)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { control, register, formState, getValues, setValue, reset } = form
  const { replace: replaceVariants } = useFieldArray({ control, name: 'variants', keyName: 'key' })
  const [hasVariants, status, seoTitle, seoDescription] = useWatch({
    control,
    name: ['hasVariants', 'status', 'seo.title', 'seo.description'],
  })

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!formState.isDirty || isPending) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [formState.isDirty, isPending])

  const rebuildVariants = (options: ProductFormValues['options'], rename?: { from: string; to: string }) => {
    let current = getValues('variants')
    if (rename?.from) {
      current = current.map((variant) => ({
        ...variant,
        optionValues: variant.optionValues.map((value) =>
          value.optionName === rename.from ? { ...value, optionName: rename.to } : value
        ),
      }))
    }
    replaceVariants(buildVariantsFromOptions(options, current))
  }

  const enableVariants = () => {
    setValue('hasVariants', true, { shouldDirty: true })
    setValue('options', [{ name: '', values: [] }], { shouldDirty: true })
  }

  const disableVariants = () => {
    const [first] = getValues('variants')
    setValue('hasVariants', false, { shouldDirty: true })
    setValue('options', [], { shouldDirty: true })
    replaceVariants([{ ...first, optionValues: [] }])
    setConfirmSimple(false)
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    startTransition(async () => {
      const result =
        mode === 'create' ? await createProduct(slug, values) : await updateProduct(slug, productId!, values)

      if (!result.ok) {
        setFormError(result.error)
        const entries = Object.entries(result.fieldErrors ?? {})
        for (const [path, message] of entries) {
          form.setError(path as FieldPath<ProductFormValues>, { type: 'server', message })
        }
        if (entries[0]) form.setFocus(entries[0][0] as FieldPath<ProductFormValues>)
        toast.add({ type: 'error', title: 'No se guardó el producto', description: result.error })
        return
      }

      if (mode === 'create') {
        toast.add({ type: 'success', title: 'Producto creado', description: 'Ya está en Shopify con tu proveedor.' })
        reset(values)
        router.push(`/${slug}/productos/${result.id}`)
      } else {
        toast.add({ type: 'success', title: 'Cambios guardados' })
        reset(values)
        router.refresh()
      }
    })
  })

  const errors = formState.errors
  const statusInfo = STATUS_ITEMS.find((item) => item.value === status)

  return (
    <FormProvider {...form}>
      <form id='product-form' onSubmit={onSubmit} noValidate className='flex flex-col gap-6'>
        {formError && (
          <Alert variant='destructive'>
            <CircleAlert />
            <AlertTitle>No se guardó el producto</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
          <div className='flex min-w-0 flex-col gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field data-invalid={Boolean(errors.title)}>
                    <FieldLabel htmlFor='product-title'>Título</FieldLabel>
                    <Input
                      id='product-title'
                      placeholder='Ej. Martillo de uña 16 oz'
                      aria-invalid={Boolean(errors.title) || undefined}
                      {...register('title')}
                    />
                    {errors.title && <FieldError errors={[errors.title]} />}
                  </Field>
                  <Controller
                    name='descriptionHtml'
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel id='product-description-label' htmlFor='product-description'>
                          Descripción
                        </FieldLabel>
                        <RichTextEditor
                          id='product-description'
                          labelledBy='product-description-label'
                          describedBy='product-description-help'
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          invalid={fieldState.invalid}
                        />
                        <FieldDescription id='product-description-help'>
                          Usos, medidas y materiales. Al pegar se inserta solo el texto.
                        </FieldDescription>
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Imágenes</CardTitle>
                {!mediaEditable && (
                  <CardDescription>
                    Este producto tiene más imágenes o archivos de los que maneja el panel; edítalos desde Shopify.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <ImageManager slug={slug} disabled={!mediaEditable || isPending} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Variantes</CardTitle>
                <CardDescription>
                  {variantsEditable
                    ? 'Usa opciones si vendes el mismo producto en varios tamaños, colores o presentaciones.'
                    : 'Este producto tiene más de 100 variantes; edítalas desde Shopify.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field orientation='horizontal'>
                    <Switch
                      id='product-has-variants'
                      checked={hasVariants}
                      disabled={!variantsEditable || isPending}
                      onCheckedChange={(checked) => {
                        if (checked) enableVariants()
                        else if (getValues('variants').length > 1) setConfirmSimple(true)
                        else disableVariants()
                      }}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor='product-has-variants'>Este producto tiene opciones</FieldLabel>
                      <FieldDescription>Por ejemplo tamaño, color o medida.</FieldDescription>
                    </FieldContent>
                  </Field>
                  {hasVariants ? (
                    <>
                      <OptionsEditor disabled={!variantsEditable || isPending} onOptionsChange={rebuildVariants} />
                      <VariantsList locationLabel={locationLabel} disabled={!variantsEditable || isPending} />
                    </>
                  ) : (
                    <VariantFields
                      index={0}
                      sections={['price', 'inventory', 'shipping']}
                      locationLabel={locationLabel}
                      disabled={!variantsEditable || isPending}
                    />
                  )}
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          <div className='flex flex-col gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name='status'
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor='product-status' className='sr-only'>
                        Estado
                      </FieldLabel>
                      <Select
                        items={STATUS_ITEMS}
                        value={field.value}
                        onValueChange={(value) => value && field.onChange(value)}
                        disabled={isPending}
                      >
                        <SelectTrigger id='product-status' className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {STATUS_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {statusInfo?.description}
                        {status === 'ACTIVE' && ' Se publica en la tienda en línea.'}
                      </FieldDescription>
                    </Field>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organización</CardTitle>
                <CardDescription>Las colecciones las maneja LaFerrey.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field data-invalid={Boolean(errors.productType)}>
                    <FieldLabel htmlFor='product-type'>Tipo de producto</FieldLabel>
                    <Input id='product-type' placeholder='Ej. Herramientas manuales' {...register('productType')} />
                    {errors.productType && <FieldError errors={[errors.productType]} />}
                  </Field>
                  <Controller
                    name='tags'
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor='product-tags'>Etiquetas</FieldLabel>
                        <TagsInput
                          id='product-tags'
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder='Escribe y presiona Enter'
                          invalid={fieldState.invalid}
                          removeLabel={(tag) => `Quitar la etiqueta ${tag}`}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
                <CardDescription>Cómo se ve el producto en buscadores. Si lo dejas vacío, se usan el título y la descripción.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field data-invalid={Boolean(errors.seo?.title)}>
                    <FieldLabel htmlFor='product-seo-title'>Título de la página</FieldLabel>
                    <Input id='product-seo-title' {...register('seo.title')} />
                    <FieldDescription className='tabular-nums'>{seoTitle.length}/70</FieldDescription>
                    {errors.seo?.title && <FieldError errors={[errors.seo.title]} />}
                  </Field>
                  <Field data-invalid={Boolean(errors.seo?.description)}>
                    <FieldLabel htmlFor='product-seo-description'>Descripción</FieldLabel>
                    <Textarea id='product-seo-description' rows={4} {...register('seo.description')} />
                    <FieldDescription className='tabular-nums'>{seoDescription.length}/320</FieldDescription>
                    {errors.seo?.description && <FieldError errors={[errors.seo.description]} />}
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className='sticky bottom-0 z-20 -mx-4 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6'>
          <div className='flex items-center justify-between gap-3 px-4 py-3 sm:px-6'>
            <p className='text-sm text-muted-foreground' aria-live='polite'>
              {formState.isDirty ? 'Tienes cambios sin guardar.' : mode === 'create' ? 'Nuevo producto.' : 'Sin cambios.'}
            </p>
            <div className='flex gap-2'>
              {mode === 'edit' && formState.isDirty && (
                <Button type='button' variant='outline' size='lg' disabled={isPending} onClick={() => reset()}>
                  Descartar
                </Button>
              )}
              <Button type='submit' size='lg' disabled={isPending || (mode === 'edit' && !formState.isDirty)}>
                {isPending ? <Spinner data-icon='inline-start' /> : <Save data-icon='inline-start' />}
                {isPending ? 'Guardando…' : mode === 'create' ? 'Crear producto' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmSimple} onOpenChange={setConfirmSimple}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar las opciones?</AlertDialogTitle>
            <AlertDialogDescription>
              Se conservará solo la primera variante. Al guardar, las demás se eliminan de Shopify.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant='destructive' onClick={disableVariants}>
              Quitar opciones
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  )
}
