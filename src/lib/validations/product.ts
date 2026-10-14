import { z } from 'zod'

// Esquema del formulario de productos, compartido por el cliente (experiencia de uso)
// y el servidor (siempre se vuelve a validar). Los montos y cantidades viajan como texto
// para no pasar por float; el servidor los convierte al armar la mutación.

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED', 'UNLISTED'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const WEIGHT_UNITS = ['KILOGRAMS', 'GRAMS', 'POUNDS', 'OUNCES'] as const
export const INVENTORY_POLICIES = ['DENY', 'CONTINUE'] as const

export const MAX_OPTIONS = 3
export const MAX_VARIANTS = 100
export const MAX_IMAGES = 10
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// Producto sin opciones: Shopify lo modela con una opción "Title" y el valor "Default Title".
export const DEFAULT_OPTION_NAME = 'Title'
export const DEFAULT_OPTION_VALUE = 'Default Title'

const MONEY = /^\d{1,9}(\.\d{1,2})?$/
const INTEGER = /^\d{1,7}$/
const WEIGHT = /^\d{1,7}(\.\d{1,3})?$/

const optionalMoney = z
  .string()
  .trim()
  .refine((value) => value === '' || MONEY.test(value), 'Usa un monto con hasta 2 decimales, sin comas')

export const variantSchema = z.object({
  id: z
    .string()
    .regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/)
    .optional(),
  // Cantidad que tenía al abrir el formulario: el servidor la usa como verificación
  // (si alguien vendió mientras editabas, no se sobrescriben las existencias).
  initialQuantity: z.number().int().nullable().optional(),
  optionValues: z.array(z.object({ optionName: z.string().min(1).max(255), name: z.string().min(1).max(255) })).max(MAX_OPTIONS),
  price: z
    .string()
    .trim()
    .regex(MONEY, 'Usa un monto con hasta 2 decimales, sin comas')
    .refine((value) => Number(value) > 0, 'El precio debe ser mayor a 0'),
  compareAtPrice: optionalMoney,
  cost: optionalMoney,
  sku: z.string().trim().max(255, 'Máximo 255 caracteres'),
  barcode: z.string().trim().max(255, 'Máximo 255 caracteres'),
  tracked: z.boolean(),
  inventoryPolicy: z.enum(INVENTORY_POLICIES),
  quantity: z.string().trim().regex(INTEGER, 'Usa un número entero, 0 o mayor'),
  weightValue: z
    .string()
    .trim()
    .refine((value) => value === '' || WEIGHT.test(value), 'Usa un número con hasta 3 decimales'),
  weightUnit: z.enum(WEIGHT_UNITS),
  requiresShipping: z.boolean(),
  taxable: z.boolean(),
})

export type VariantValues = z.infer<typeof variantSchema>

export const mediaSchema = z.union([
  z.object({
    id: z.string().regex(/^gid:\/\/shopify\/(MediaImage|Video|ExternalVideo|Model3d)\/\d+$/),
    previewUrl: z.string().max(2048),
    alt: z.string().trim().max(512, 'Máximo 512 caracteres'),
  }),
  z.object({
    // URL temporal que devuelve stagedUploadsCreate.
    resourceUrl: z.url().max(2048),
    previewUrl: z.string().max(2048),
    alt: z.string().trim().max(512, 'Máximo 512 caracteres'),
  }),
])

export type MediaValues = z.infer<typeof mediaSchema>

export const productFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Escribe el título').max(255, 'Máximo 255 caracteres'),
    descriptionHtml: z.string().max(65_000, 'La descripción es demasiado larga'),
    productType: z.string().trim().max(255, 'Máximo 255 caracteres'),
    tags: z.array(z.string().trim().min(1).max(255)).max(250, 'Máximo 250 etiquetas'),
    status: z.enum(PRODUCT_STATUSES),
    seo: z.object({
      title: z.string().trim().max(70, 'Máximo 70 caracteres'),
      description: z.string().trim().max(320, 'Máximo 320 caracteres'),
    }),
    hasVariants: z.boolean(),
    options: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Escribe el nombre de la opción').max(255),
          values: z
            .array(z.string().trim().min(1).max(255))
            .min(1, 'Agrega al menos un valor')
            .max(MAX_VARIANTS, 'Demasiados valores'),
        })
      )
      .max(MAX_OPTIONS, `Máximo ${MAX_OPTIONS} opciones`),
    variants: z.array(variantSchema).min(1).max(MAX_VARIANTS, `Máximo ${MAX_VARIANTS} variantes`),
    media: z.array(mediaSchema).max(MAX_IMAGES, `Máximo ${MAX_IMAGES} imágenes`),
  })
  .superRefine((values, ctx) => {
    values.variants.forEach((variant, index) => {
      if (variant.compareAtPrice && Number(variant.compareAtPrice) <= Number(variant.price)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'compareAtPrice'],
          message: 'Debe ser mayor que el precio',
        })
      }
    })

    if (!values.hasVariants) {
      if (values.variants.length !== 1) {
        ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Un producto sin variantes tiene un solo precio' })
      }
      return
    }

    if (values.options.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Agrega al menos una opción, como Tamaño o Color' })
    }

    const optionNames = values.options.map((option) => option.name.toLowerCase())
    values.options.forEach((option, index) => {
      if (optionNames.indexOf(option.name.toLowerCase()) !== index) {
        ctx.addIssue({ code: 'custom', path: ['options', index, 'name'], message: 'Ya hay una opción con ese nombre' })
      }
      if (new Set(option.values.map((value) => value.toLowerCase())).size !== option.values.length) {
        ctx.addIssue({ code: 'custom', path: ['options', index, 'values'], message: 'Hay valores repetidos' })
      }
    })

    const combos = new Set<string>()
    values.variants.forEach((variant, index) => {
      const valid =
        variant.optionValues.length === values.options.length &&
        values.options.every((option) =>
          variant.optionValues.some((value) => value.optionName === option.name && option.values.includes(value.name))
        )
      if (!valid) {
        ctx.addIssue({ code: 'custom', path: ['variants', index], message: 'La variante no coincide con las opciones' })
        return
      }
      const key = values.options
        .map((option) => variant.optionValues.find((value) => value.optionName === option.name)!.name.toLowerCase())
        .join('\u0000')
      if (combos.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index], message: 'Variante repetida' })
      }
      combos.add(key)
    })
  })

export type ProductFormValues = z.infer<typeof productFormSchema>

export const productIdSchema = z.string().regex(/^\d{1,20}$/, 'ID inválido')

export const imageUploadRequestSchema = z
  .array(
    z.object({
      filename: z.string().trim().min(1).max(255),
      mimeType: z.enum(IMAGE_MIME_TYPES, { error: 'Solo imágenes JPG, PNG o WebP' }),
      fileSize: z
        .number()
        .int()
        .positive()
        .max(MAX_IMAGE_BYTES, 'Cada imagen debe pesar 20 MB o menos'),
    })
  )
  .min(1)
  .max(MAX_IMAGES)

export type ImageUploadRequest = z.infer<typeof imageUploadRequestSchema>

// Filtros de /{slug}/productos.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)

export const PRODUCT_STATUS_FILTERS = ['activo', 'borrador', 'archivado', 'no-listado'] as const

export const productStatusFromFilter = {
  activo: 'ACTIVE',
  borrador: 'DRAFT',
  archivado: 'ARCHIVED',
  'no-listado': 'UNLISTED',
} as const satisfies Record<(typeof PRODUCT_STATUS_FILTERS)[number], ProductStatus>

export const productListSearchSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  estado: z.preprocess(first, z.enum(PRODUCT_STATUS_FILTERS).optional().catch(undefined)),
  despues: z.preprocess(first, z.string().max(512).optional().catch(undefined)),
  antes: z.preprocess(first, z.string().max(512).optional().catch(undefined)),
})

export type ProductListFilters = z.infer<typeof productListSearchSchema>

export const emptyVariant = (overrides: Partial<VariantValues> = {}): VariantValues => ({
  optionValues: [],
  price: '',
  compareAtPrice: '',
  cost: '',
  sku: '',
  barcode: '',
  tracked: true,
  inventoryPolicy: 'DENY',
  quantity: '0',
  weightValue: '',
  weightUnit: 'KILOGRAMS',
  requiresShipping: true,
  taxable: true,
  ...overrides,
})

export const emptyProduct = (): ProductFormValues => ({
  title: '',
  descriptionHtml: '',
  productType: '',
  tags: [],
  // RN-12 y P-03: un producto nuevo se crea en Borrador salvo que se elija Activo.
  status: 'DRAFT',
  seo: { title: '', description: '' },
  hasVariants: false,
  options: [],
  variants: [emptyVariant()],
  media: [],
})

// Todas las combinaciones de valores de las opciones, conservando los datos de las
// variantes que ya existían con la misma combinación.
export const buildVariantsFromOptions = (
  options: ProductFormValues['options'],
  current: VariantValues[]
): VariantValues[] => {
  const usable = options.filter((option) => option.name.trim() && option.values.length > 0)
  if (usable.length === 0) return current.slice(0, 1).map((variant) => ({ ...variant, optionValues: [] }))

  const combos = usable.reduce<{ optionName: string; name: string }[][]>(
    (acc, option) => acc.flatMap((combo) => option.values.map((name) => [...combo, { optionName: option.name, name }])),
    [[]]
  )

  const keyOf = (values: { optionName: string; name: string }[]) =>
    values
      .map((value) => `${value.optionName.toLowerCase()}=${value.name.toLowerCase()}`)
      .sort()
      .join('|')
  const existing = new Map(current.map((variant) => [keyOf(variant.optionValues), variant]))
  const template = current[0] ?? emptyVariant()

  return combos.slice(0, MAX_VARIANTS).map((optionValues) => {
    const match = existing.get(keyOf(optionValues))
    if (match) return { ...match, optionValues }
    return emptyVariant({
      optionValues,
      price: template.price,
      compareAtPrice: template.compareAtPrice,
      cost: template.cost,
      tracked: template.tracked,
      inventoryPolicy: template.inventoryPolicy,
      weightValue: template.weightValue,
      weightUnit: template.weightUnit,
      requiresShipping: template.requiresShipping,
      taxable: template.taxable,
    })
  })
}
