import { describe, expect, it } from 'vitest'
import { buildVariantsFromOptions, emptyProduct, emptyVariant, productFormSchema, type ProductFormValues } from './product'

const simple = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...emptyProduct(),
  title: 'Martillo',
  variants: [emptyVariant({ price: '189.50' })],
  ...overrides,
})

const errorsOf = (values: ProductFormValues) => {
  const result = productFormSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('productFormSchema', () => {
  it('acepta un producto simple en Borrador', () => {
    expect(errorsOf(simple())).toEqual([])
    expect(emptyProduct().status).toBe('DRAFT')
  })

  it('valida precio, precio de comparación y cantidades', () => {
    expect(errorsOf(simple({ variants: [emptyVariant({ price: '0' })] }))).toEqual([
      'variants.0.price: El precio debe ser mayor a 0',
    ])
    expect(errorsOf(simple({ variants: [emptyVariant({ price: '1,200' })] }))[0]).toMatch(/sin comas/)
    expect(errorsOf(simple({ variants: [emptyVariant({ price: '100', compareAtPrice: '90' })] }))).toEqual([
      'variants.0.compareAtPrice: Debe ser mayor que el precio',
    ])
    expect(errorsOf(simple({ variants: [emptyVariant({ price: '100', quantity: '-1' })] }))[0]).toMatch(/entero/)
  })

  it('exige opciones coherentes con las variantes', () => {
    const options = [{ name: 'Tamaño', values: ['Chico', 'Grande'] }]
    const variants = buildVariantsFromOptions(options, [emptyVariant({ price: '10' })])
    expect(errorsOf(simple({ hasVariants: true, options, variants }))).toEqual([])
    expect(errorsOf(simple({ hasVariants: true, options: [], variants }))).toContain(
      'options: Agrega al menos una opción, como Tamaño o Color'
    )
    expect(errorsOf(simple({ hasVariants: true, options, variants: [variants[0], variants[0]] }))).toContain(
      'variants.1: Variante repetida'
    )
  })

  it('rechaza más de 10 imágenes y SEO largo', () => {
    const media = Array.from({ length: 11 }, (_, i) => ({ resourceUrl: `https://example.com/${i}.jpg`, previewUrl: '', alt: '' }))
    expect(errorsOf(simple({ media }))[0]).toMatch(/10 imágenes/)
    expect(errorsOf(simple({ seo: { title: 'x'.repeat(71), description: '' } }))[0]).toMatch(/70/)
  })
})

describe('buildVariantsFromOptions', () => {
  it('genera todas las combinaciones y conserva las existentes', () => {
    const existing = emptyVariant({
      id: 'gid://shopify/ProductVariant/1',
      price: '50',
      sku: 'CH-ROJO',
      optionValues: [
        { optionName: 'Tamaño', name: 'Chico' },
        { optionName: 'Color', name: 'Rojo' },
      ],
    })
    const variants = buildVariantsFromOptions(
      [
        { name: 'Tamaño', values: ['Chico', 'Grande'] },
        { name: 'Color', values: ['Rojo', 'Azul'] },
      ],
      [existing]
    )
    expect(variants).toHaveLength(4)
    expect(variants[0]).toMatchObject({ id: 'gid://shopify/ProductVariant/1', sku: 'CH-ROJO' })
    expect(variants[1]).toMatchObject({ price: '50', sku: '' })
    expect(variants[1].id).toBeUndefined()
  })

  it('sin opciones deja una sola variante', () => {
    expect(buildVariantsFromOptions([], [emptyVariant({ price: '5' }), emptyVariant()])).toHaveLength(1)
  })
})
