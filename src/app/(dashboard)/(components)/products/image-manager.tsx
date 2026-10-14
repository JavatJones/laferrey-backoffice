'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, type ProductFormValues } from '@/lib/validations/product'
import { cn } from '@/lib/utils'
import { createImageUploadTargets } from '@/app/(dashboard)/[hardware_store]/productos/actions'

type Props = { slug: string; disabled?: boolean }

const ACCEPT = IMAGE_MIME_TYPES.join(',')

// Las imágenes se suben directo del navegador a la URL temporal de Shopify
// (stagedUploadsCreate); al guardar, el producto las toma de esa URL.
export const ImageManager = ({ slug, disabled }: Props) => {
  const { control, register, formState } = useFormContext<ProductFormValues>()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'media', keyName: 'key' })
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [dragging, setDragging] = useState(false)

  const upload = async (files: File[]) => {
    const rejected = files.filter(
      (file) => !(IMAGE_MIME_TYPES as readonly string[]).includes(file.type) || file.size > MAX_IMAGE_BYTES
    )
    if (rejected.length > 0) {
      toast.add({
        type: 'error',
        title: 'Algunas imágenes no se agregaron',
        description: 'Solo JPG, PNG o WebP de 20 MB o menos.',
      })
    }

    const room = MAX_IMAGES - fields.length
    const batch = files.filter((file) => !rejected.includes(file)).slice(0, room)
    if (files.length - rejected.length > room) {
      toast.add({ type: 'warning', title: `Máximo ${MAX_IMAGES} imágenes por producto` })
    }
    if (batch.length === 0) return

    setUploading(batch.length)
    try {
      const result = await createImageUploadTargets(
        slug,
        batch.map((file) => ({ filename: file.name, mimeType: file.type as (typeof IMAGE_MIME_TYPES)[number], fileSize: file.size }))
      )
      if (!result.ok) {
        toast.add({ type: 'error', title: 'No se pudieron subir las imágenes', description: result.error })
        return
      }

      const uploaded = await Promise.allSettled(
        batch.map(async (file, index) => {
          const target = result.targets[index]
          const body = new FormData()
          for (const parameter of target.parameters) body.append(parameter.name, parameter.value)
          body.append('file', file)
          const response = await fetch(target.url, { method: 'POST', body })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return { resourceUrl: target.resourceUrl, previewUrl: URL.createObjectURL(file), alt: '' }
        })
      )

      for (const item of uploaded) if (item.status === 'fulfilled') append(item.value)
      const failed = uploaded.filter((item) => item.status === 'rejected').length
      if (failed > 0) toast.add({ type: 'error', title: `${failed} imagen(es) no se pudieron subir` })
    } finally {
      setUploading(0)
    }
  }

  const mediaError = formState.errors.media
  const full = fields.length >= MAX_IMAGES

  return (
    <div className='flex flex-col gap-4'>
      {fields.length > 0 && (
        <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
          {fields.map((field, index) => {
            const altError = formState.errors.media?.[index]?.alt
            return (
              <li key={field.key} className='flex flex-col gap-2 rounded-lg border p-2'>
                <div className='relative aspect-square overflow-hidden rounded-md bg-muted'>
                  {field.previewUrl ? (
                    // Vista previa local (blob:) o del CDN de Shopify: no requiere optimización.
                    <Image src={field.previewUrl} alt={field.alt} fill unoptimized sizes='200px' className='object-cover' />
                  ) : (
                    // Shopify procesa las imágenes unos segundos después de guardarlas.
                    <span className='flex size-full items-center justify-center text-xs text-muted-foreground'>
                      Procesando…
                    </span>
                  )}
                  {index === 0 && (
                    <Badge className='absolute top-1.5 left-1.5 gap-1'>
                      <Star data-icon='inline-start' aria-hidden />
                      Principal
                    </Badge>
                  )}
                  {'resourceUrl' in field && (
                    <Badge variant='secondary' className='absolute top-1.5 right-1.5'>
                      Nueva
                    </Badge>
                  )}
                </div>
                <Field data-invalid={Boolean(altError)} className='gap-1'>
                  <FieldLabel htmlFor={`media-${index}-alt`} className='text-xs'>
                    Texto alternativo
                  </FieldLabel>
                  <Input
                    id={`media-${index}-alt`}
                    placeholder='Qué se ve en la imagen'
                    disabled={disabled}
                    aria-invalid={Boolean(altError) || undefined}
                    {...register(`media.${index}.alt`)}
                  />
                  {altError && <FieldError errors={[altError]} />}
                </Field>
                <div className='flex items-center justify-between gap-1'>
                  <div className='flex gap-1'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label='Mover antes'
                      disabled={disabled || index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowLeft />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label='Mover después'
                      disabled={disabled || index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowRight />
                    </Button>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Quitar imagen'
                    disabled={disabled}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!disabled && !full && (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void upload(Array.from(event.dataTransfer.files))
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors',
            dragging && 'border-primary bg-accent'
          )}
        >
          <ImagePlus className='size-6 text-muted-foreground' aria-hidden />
          <p className='text-sm text-muted-foreground'>Arrastra imágenes aquí o</p>
          <Button type='button' variant='outline' size='lg' disabled={uploading > 0} onClick={() => inputRef.current?.click()}>
            {uploading > 0 && <Spinner data-icon='inline-start' />}
            {uploading > 0 ? `Subiendo ${uploading}…` : 'Elegir imágenes'}
          </Button>
          <input
            ref={inputRef}
            type='file'
            accept={ACCEPT}
            multiple
            hidden
            onChange={(event) => {
              void upload(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
          <FieldDescription>
            JPG, PNG o WebP de hasta 20 MB. Hasta {MAX_IMAGES} imágenes; la primera es la principal.
          </FieldDescription>
        </div>
      )}
      {mediaError?.message && <FieldError>{mediaError.message}</FieldError>}
    </div>
  )
}
