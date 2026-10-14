import 'server-only'
import { randomUUID } from 'node:crypto'
import type { StoreDTO } from '@/lib/auth/dal'
import { getShopifyEnv } from '@/lib/env'
import {
  DEFAULT_OPTION_NAME,
  DEFAULT_OPTION_VALUE,
  MAX_IMAGES,
  MAX_VARIANTS,
  type ImageUploadRequest,
  type ProductFormValues,
  type ProductStatus,
  type VariantValues,
} from '@/lib/validations/product'
import { shopifyAdminQuery } from './client'
import { sanitizeDescription } from './sanitize'
import { buildVendorProductQuery, type ProductStatusFilter } from './search-query'
import type { Count, Money, PageInfo, UserError } from './types'
import { normalizeVendor } from './vendor'

// Catálogo de la ferretería en Shopify (RN-09 a RN-13). El proveedor y la sucursal
// salen del DTO de la ferretería (base de datos), nunca del cliente. Después de cada
// consulta se vuelve a verificar el proveedor exacto (defensa en profundidad).

export const PRODUCTS_PAGE_SIZE = 20

const productGid = (id: string) => `gid://shopify/Product/${id}`

const belongsTo = (store: StoreDTO, vendor: string | null | undefined) => normalizeVendor(vendor) === store.vendorKey

export class ProductError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'ProductError'
  }
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------
const LIST_QUERY = /* GraphQL */ `
  query StoreProducts($first: Int, $last: Int, $after: String, $before: String, $query: String!) {
    products(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        legacyResourceId
        title
        status
        vendor
        productType
        totalInventory
        tracksInventory
        updatedAt
        featuredMedia { preview { image { url altText } } }
        priceRangeV2 {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        variantsCount { count }
        variants(first: 1) { nodes { sku } }
      }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
    productsCount(query: $query, limit: null) { count precision }
  }
`

type ProductListNode = {
  id: string
  legacyResourceId: string
  title: string
  status: ProductStatus
  vendor: string
  productType: string
  totalInventory: number | null
  tracksInventory: boolean
  updatedAt: string
  featuredMedia: { preview: { image: { url: string; altText: string | null } | null } | null } | null
  priceRangeV2: { minVariantPrice: Money; maxVariantPrice: Money }
  variantsCount: { count: number } | null
  variants: { nodes: { sku: string | null }[] }
}

export type StoreProductSummary = {
  id: string
  title: string
  status: ProductStatus
  productType: string
  imageUrl: string | null
  imageAlt: string | null
  minPrice: Money
  maxPrice: Money
  totalInventory: number | null
  tracksInventory: boolean
  variantsCount: number
  sku: string | null
  updatedAt: string
}

export const listStoreProducts = async (
  store: StoreDTO,
  { search, status, after, before }: { search?: string; status?: ProductStatusFilter; after?: string; before?: string }
) => {
  const query = buildVendorProductQuery(store.vendor, { search, status })
  const pagination = before ? { last: PRODUCTS_PAGE_SIZE, before } : { first: PRODUCTS_PAGE_SIZE, after: after ?? null }

  const { products, productsCount } = await shopifyAdminQuery<{
    products: { nodes: ProductListNode[]; pageInfo: PageInfo }
    productsCount: Count
  }>(LIST_QUERY, { ...pagination, query })

  return {
    products: products.nodes
      .filter((product) => belongsTo(store, product.vendor))
      .map(
        (product): StoreProductSummary => ({
          id: product.legacyResourceId,
          title: product.title,
          status: product.status,
          productType: product.productType,
          imageUrl: product.featuredMedia?.preview?.image?.url ?? null,
          imageAlt: product.featuredMedia?.preview?.image?.altText ?? null,
          minPrice: product.priceRangeV2.minVariantPrice,
          maxPrice: product.priceRangeV2.maxVariantPrice,
          totalInventory: product.totalInventory,
          tracksInventory: product.tracksInventory,
          variantsCount: product.variantsCount?.count ?? 0,
          sku: product.variants.nodes[0]?.sku || null,
          updatedAt: product.updatedAt,
        })
      ),
    pageInfo: products.pageInfo,
    count: productsCount,
  }
}

const COUNT_QUERY = /* GraphQL */ `
  query StoreProductsCount($query: String!) {
    productsCount(query: $query, limit: null) { count precision }
  }
`

export const countStoreProducts = async (store: StoreDTO, status?: ProductStatusFilter) => {
  const { productsCount } = await shopifyAdminQuery<{ productsCount: Count }>(COUNT_QUERY, {
    query: buildVendorProductQuery(store.vendor, { status }),
  })
  return productsCount
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------
const DETAIL_QUERY = /* GraphQL */ `
  query StoreProduct($id: ID!, $locationId: ID!) {
    product(id: $id) {
      id
      legacyResourceId
      title
      handle
      status
      vendor
      productType
      tags
      descriptionHtml
      updatedAt
      onlineStoreUrl
      seo { title description }
      options { id name position optionValues { id name hasVariants } }
      mediaCount { count }
      media(first: 20) {
        nodes { id alt mediaContentType preview { image { url altText } } }
      }
      variantsCount { count }
      variants(first: 100) {
        nodes {
          id
          position
          price
          compareAtPrice
          sku
          barcodes(first: 1) { nodes { value } }
          inventoryPolicy
          taxable
          selectedOptions { name value }
          inventoryItem {
            id
            tracked
            requiresShipping
            unitCost { amount }
            measurement { weight { value unit } }
            inventoryLevel(locationId: $locationId) { quantities(names: ["available"]) { name quantity } }
          }
        }
      }
    }
  }
`

type ProductDetailNode = {
  id: string
  legacyResourceId: string
  title: string
  handle: string
  status: ProductStatus
  vendor: string
  productType: string
  tags: string[]
  descriptionHtml: string
  updatedAt: string
  onlineStoreUrl: string | null
  seo: { title: string | null; description: string | null }
  options: { id: string; name: string; position: number; optionValues: { id: string; name: string; hasVariants: boolean }[] }[]
  mediaCount: { count: number } | null
  media: {
    nodes: {
      id: string
      alt: string | null
      mediaContentType: string
      preview: { image: { url: string; altText: string | null } | null } | null
    }[]
  }
  variantsCount: { count: number } | null
  variants: {
    nodes: {
      id: string
      position: number
      price: string
      compareAtPrice: string | null
      sku: string | null
      barcodes: { nodes: { value: string }[] }
      inventoryPolicy: 'DENY' | 'CONTINUE'
      taxable: boolean
      selectedOptions: { name: string; value: string }[]
      inventoryItem: {
        id: string
        tracked: boolean
        requiresShipping: boolean
        unitCost: { amount: string } | null
        measurement: { weight: { value: number; unit: VariantValues['weightUnit'] } | null } | null
        inventoryLevel: { quantities: { name: string; quantity: number }[] } | null
      }
    }[]
  }
}

export type StoreProductDetail = {
  id: string
  gid: string
  title: string
  status: ProductStatus
  onlineStoreUrl: string | null
  updatedAt: string
  // Si el producto tiene más variantes o imágenes de las que maneja el panel, esas
  // listas quedan de solo lectura: enviarlas incompletas a productSet las borraría.
  variantsEditable: boolean
  mediaEditable: boolean
  values: ProductFormValues
  raw: ProductDetailNode
}

const isDefaultOptions = (options: ProductDetailNode['options']) =>
  options.length === 1 &&
  options[0].name === DEFAULT_OPTION_NAME &&
  options[0].optionValues.length === 1 &&
  options[0].optionValues[0].name === DEFAULT_OPTION_VALUE

const toFormValues = (product: ProductDetailNode): ProductFormValues => {
  const hasVariants = !isDefaultOptions(product.options)

  return {
    title: product.title,
    // Se sanea antes de cargarla en el editor: pudo haberla escrito alguien fuera del panel.
    descriptionHtml: sanitizeDescription(product.descriptionHtml ?? ''),
    productType: product.productType ?? '',
    tags: product.tags,
    status: product.status,
    seo: { title: product.seo.title ?? '', description: product.seo.description ?? '' },
    hasVariants,
    options: hasVariants
      ? [...product.options]
          .sort((a, b) => a.position - b.position)
          .map((option) => ({
            name: option.name,
            values: option.optionValues.filter((value) => value.hasVariants).map((value) => value.name),
          }))
      : [],
    variants: [...product.variants.nodes]
      .sort((a, b) => a.position - b.position)
      .map((variant) => {
        const available = variant.inventoryItem.inventoryLevel?.quantities.find((q) => q.name === 'available')
        return {
          id: variant.id,
          initialQuantity: available?.quantity ?? null,
          optionValues: hasVariants
            ? variant.selectedOptions.map((option) => ({ optionName: option.name, name: option.value }))
            : [],
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? '',
          cost: variant.inventoryItem.unitCost?.amount ?? '',
          sku: variant.sku ?? '',
          barcode: variant.barcodes.nodes[0]?.value ?? '',
          tracked: variant.inventoryItem.tracked,
          inventoryPolicy: variant.inventoryPolicy,
          quantity: String(Math.max(available?.quantity ?? 0, 0)),
          weightValue: variant.inventoryItem.measurement?.weight?.value
            ? String(variant.inventoryItem.measurement.weight.value)
            : '',
          weightUnit: variant.inventoryItem.measurement?.weight?.unit ?? 'KILOGRAMS',
          requiresShipping: variant.inventoryItem.requiresShipping,
          taxable: variant.taxable,
        }
      }),
    media: product.media.nodes
      .filter((media) => media.mediaContentType === 'IMAGE')
      .map((media) => ({ id: media.id, previewUrl: media.preview?.image?.url ?? '', alt: media.alt ?? '' })),
  }
}

const fetchProduct = async (store: StoreDTO, id: string) => {
  if (!store.locationId) throw new ProductError('La ferretería no tiene sucursal de Shopify configurada.')
  const { product } = await shopifyAdminQuery<{ product: ProductDetailNode | null }>(DETAIL_QUERY, {
    id: productGid(id),
    locationId: store.locationId,
  })
  // Un producto de otro proveedor se trata igual que uno inexistente (RN-08, RN-11).
  if (!product || !belongsTo(store, product.vendor)) return null
  return product
}

// null si no existe o no es de la ferretería.
export const getStoreProduct = async (store: StoreDTO, id: string): Promise<StoreProductDetail | null> => {
  const product = await fetchProduct(store, id)
  if (!product) return null

  return {
    id: product.legacyResourceId,
    gid: product.id,
    title: product.title,
    status: product.status,
    onlineStoreUrl: product.onlineStoreUrl,
    updatedAt: product.updatedAt,
    variantsEditable: (product.variantsCount?.count ?? 0) <= MAX_VARIANTS,
    mediaEditable:
      (product.mediaCount?.count ?? 0) <= MAX_IMAGES &&
      product.media.nodes.every((media) => media.mediaContentType === 'IMAGE'),
    values: toFormValues(product),
    raw: product,
  }
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------
const PRODUCT_SET = /* GraphQL */ `
  mutation StoreProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
    productSet(input: $input, identifier: $identifier, synchronous: true) {
      product {
        id
        legacyResourceId
        vendor
        status
        variants(first: 100) {
          nodes { id inventoryItem { id } }
        }
      }
      userErrors { field message code }
    }
  }
`

const PRODUCT_UPDATE = /* GraphQL */ `
  mutation StoreProductStatus($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id status }
      userErrors { field message }
    }
  }
`

const PRODUCT_DELETE = /* GraphQL */ `
  mutation StoreProductDelete($input: ProductDeleteInput!) {
    productDelete(input: $input, synchronous: true) {
      deletedProductId
      userErrors { field message }
    }
  }
`

const PUBLISH = /* GraphQL */ `
  mutation StoreProductPublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`

const STAGED_UPLOADS = /* GraphQL */ `
  mutation StoreImageUploads($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`

const INVENTORY_SET = /* GraphQL */ `
  mutation StoreInventorySet($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
    inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      userErrors { field message code }
    }
  }
`

const INVENTORY_ACTIVATE = /* GraphQL */ `
  mutation StoreInventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int, $idempotencyKey: String!) {
    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available)
      @idempotent(key: $idempotencyKey) {
      userErrors { field message }
    }
  }
`

type ProductSetResult = {
  productSet: {
    product: {
      id: string
      legacyResourceId: string
      vendor: string
      status: ProductStatus
      variants: { nodes: { id: string; inventoryItem: { id: string } }[] }
    } | null
    userErrors: (UserError & { code?: string | null })[]
  }
}

// ["input", "variants", "0", "price"] → "variants.0.price" (ruta del formulario).
const FIELD_ALIASES: Record<string, string> = {
  productOptions: 'options',
  files: 'media',
  inventoryQuantities: 'quantity',
  compareAtPrice: 'compareAtPrice',
  barcodes: 'barcode',
}

const toFieldErrors = (errors: UserError[]) => {
  const fieldErrors: Record<string, string> = {}
  for (const error of errors) {
    const path = (error.field ?? []).filter((part) => part !== 'input' && part !== 'product' && part !== 'inventoryItem')
    const key = path.map((part) => FIELD_ALIASES[part] ?? part).join('.')
    if (key) fieldErrors[key] ??= error.message
  }
  return fieldErrors
}

const throwUserErrors = (errors: UserError[], fallback: string): never => {
  throw new ProductError(errors.map((error) => error.message).join(' · ') || fallback, toFieldErrors(errors))
}

const nullable = (value: string) => (value.trim() === '' ? null : value.trim())

const buildVariantInput = (
  variant: VariantValues,
  index: number,
  hasVariants: boolean,
  store: StoreDTO,
  isNew: boolean
) => ({
  ...(isNew ? {} : { id: variant.id }),
  position: index + 1,
  optionValues: hasVariants
    ? variant.optionValues.map((value) => ({ optionName: value.optionName, name: value.name }))
    : [{ optionName: DEFAULT_OPTION_NAME, name: DEFAULT_OPTION_VALUE }],
  price: variant.price,
  compareAtPrice: nullable(variant.compareAtPrice),
  sku: nullable(variant.sku),
  barcodes: variant.barcode.trim() ? [{ value: variant.barcode.trim() }] : [],
  inventoryPolicy: variant.inventoryPolicy,
  taxable: variant.taxable,
  inventoryItem: {
    tracked: variant.tracked,
    cost: nullable(variant.cost),
    requiresShipping: variant.requiresShipping,
    measurement: { weight: { value: variant.weightValue ? Number(variant.weightValue) : 0, unit: variant.weightUnit } },
  },
  // Al crear, las existencias van en la misma mutación. Al editar se usan
  // inventorySetQuantities con verificación (ver syncInventory).
  ...(isNew && variant.tracked
    ? { inventoryQuantities: [{ locationId: store.locationId, name: 'available', quantity: Number(variant.quantity) }] }
    : {}),
})

const buildOptionsInput = (values: ProductFormValues, existing?: ProductDetailNode['options']) => {
  if (!values.hasVariants) {
    const current = existing && isDefaultOptions(existing) ? existing[0] : undefined
    return [
      {
        ...(current ? { id: current.id } : {}),
        name: DEFAULT_OPTION_NAME,
        values: [{ ...(current ? { id: current.optionValues[0].id } : {}), name: DEFAULT_OPTION_VALUE }],
      },
    ]
  }

  return values.options.map((option, index) => {
    // Conserva los IDs de opciones y valores existentes para no recrearlos.
    const current = existing?.find((candidate) => candidate.name.toLowerCase() === option.name.toLowerCase())
    return {
      ...(current ? { id: current.id } : {}),
      name: option.name,
      position: index + 1,
      values: option.values.map((name) => {
        const value = current?.optionValues.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())
        return { ...(value ? { id: value.id } : {}), name }
      }),
    }
  })
}

const buildFilesInput = (values: ProductFormValues) =>
  values.media.map((media) =>
    'id' in media
      ? { id: media.id, alt: media.alt }
      : { originalSource: media.resourceUrl, alt: media.alt, contentType: 'IMAGE' }
  )

const baseProductInput = (values: ProductFormValues, store: StoreDTO) => ({
  title: values.title,
  descriptionHtml: sanitizeDescription(values.descriptionHtml),
  productType: values.productType,
  tags: values.tags,
  status: values.status,
  // RN-11: el proveedor siempre es el de la ferretería, nunca el del formulario.
  vendor: store.vendor,
  seo: { title: values.seo.title || null, description: values.seo.description || null },
})

// RN-12 / P-07: al activarse se publica en los canales que defina LaFerrey.
export const publishProduct = async (gid: string) => {
  const { publicationIds } = getShopifyEnv()
  const { publishablePublish } = await shopifyAdminQuery<{ publishablePublish: { userErrors: UserError[] } }>(PUBLISH, {
    id: gid,
    input: publicationIds.map((publicationId) => ({ publicationId })),
  })
  if (publishablePublish.userErrors.length > 0) {
    throwUserErrors(publishablePublish.userErrors, 'No se pudo publicar el producto.')
  }
}

export const createStoreProduct = async (store: StoreDTO, values: ProductFormValues) => {
  if (!store.locationId) throw new ProductError('La ferretería no tiene sucursal de Shopify configurada.')

  const { productSet } = await shopifyAdminQuery<ProductSetResult>(PRODUCT_SET, {
    input: {
      ...baseProductInput(values, store),
      productOptions: buildOptionsInput(values),
      files: buildFilesInput(values),
      variants: values.variants.map((variant, index) => buildVariantInput(variant, index, values.hasVariants, store, true)),
    },
  })
  if (!productSet.product) return throwUserErrors(productSet.userErrors, 'Shopify no creó el producto.')
  if (productSet.userErrors.length > 0) console.warn('[productos] productSet', productSet.userErrors)

  if (values.status === 'ACTIVE') await publishProduct(productSet.product.id)
  return { id: productSet.product.legacyResourceId }
}

// Edición: verifica la propiedad, envía las listas completas (lo que no se incluye se
// borra) y ajusta existencias con verificación de la cantidad previa.
export const updateStoreProduct = async (store: StoreDTO, id: string, values: ProductFormValues) => {
  const current = await getStoreProduct(store, id)
  if (!current) throw new ProductError('No encontrado.')

  const knownVariants = new Map(current.raw.variants.nodes.map((variant) => [variant.id, variant]))
  // Un id de variante que no es de este producto se trata como variante nueva.
  const variants = values.variants.map((variant) => ({
    variant,
    existing: variant.id ? knownVariants.get(variant.id) : undefined,
  }))

  const input: Record<string, unknown> = { ...baseProductInput(values, store) }
  if (current.variantsEditable) {
    input.productOptions = buildOptionsInput(values, current.raw.options)
    input.variants = variants.map(({ variant, existing }, index) =>
      buildVariantInput(variant, index, values.hasVariants, store, !existing)
    )
  }
  if (current.mediaEditable) input.files = buildFilesInput(values)

  const { productSet } = await shopifyAdminQuery<ProductSetResult>(PRODUCT_SET, {
    input,
    identifier: { id: current.gid },
  })
  if (!productSet.product) return throwUserErrors(productSet.userErrors, 'Shopify no guardó el producto.')
  if (productSet.userErrors.length > 0) return throwUserErrors(productSet.userErrors, 'Shopify no guardó el producto.')

  if (current.variantsEditable) await syncInventory(store, variants)
  if (values.status === 'ACTIVE') await publishProduct(current.gid)
  return { id }
}

const syncInventory = async (
  store: StoreDTO,
  variants: { variant: VariantValues; existing: ProductDetailNode['variants']['nodes'][number] | undefined }[]
) => {
  const changes: { inventoryItemId: string; locationId: string; quantity: number; changeFromQuantity: number }[] = []

  for (const { variant, existing } of variants) {
    if (!existing || !variant.tracked) continue
    const quantity = Number(variant.quantity)
    const level = existing.inventoryItem.inventoryLevel?.quantities.find((q) => q.name === 'available')

    if (!level) {
      // La variante aún no tiene existencias en la sucursal de la ferretería.
      if (quantity === 0) continue
      const { inventoryActivate } = await shopifyAdminQuery<{ inventoryActivate: { userErrors: UserError[] } }>(
        INVENTORY_ACTIVATE,
        {
          inventoryItemId: existing.inventoryItem.id,
          locationId: store.locationId,
          available: quantity,
          idempotencyKey: randomUUID(),
        }
      )
      if (inventoryActivate.userErrors.length > 0) throwUserErrors(inventoryActivate.userErrors, 'No se actualizaron las existencias.')
      continue
    }

    // Sin cambio pedido por el usuario: no se toca (aunque haya habido ventas).
    if (quantity === (variant.initialQuantity ?? level.quantity)) continue
    changes.push({
      inventoryItemId: existing.inventoryItem.id,
      locationId: store.locationId!,
      quantity,
      // Lo que había al abrir el formulario: si cambió (p. ej. una venta), Shopify rechaza.
      changeFromQuantity: variant.initialQuantity ?? level.quantity,
    })
  }

  if (changes.length === 0) return

  const { inventorySetQuantities } = await shopifyAdminQuery<{
    inventorySetQuantities: { userErrors: (UserError & { code?: string | null })[] }
  }>(INVENTORY_SET, {
    input: { name: 'available', reason: 'correction', quantities: changes },
    // Desde 2026-04 las mutaciones de inventario exigen una llave de idempotencia.
    idempotencyKey: randomUUID(),
  })
  const errors = inventorySetQuantities.userErrors
  if (errors.length > 0) {
    if (errors.some((error) => error.code === 'CHANGE_FROM_QUANTITY_STALE')) {
      throw new ProductError(
        'Las existencias cambiaron mientras editabas (quizá hubo una venta). Recarga la página y vuelve a intentarlo.'
      )
    }
    throwUserErrors(errors, 'No se actualizaron las existencias.')
  }
}

export const setStoreProductStatus = async (store: StoreDTO, id: string, status: ProductStatus) => {
  const current = await fetchProduct(store, id)
  if (!current) throw new ProductError('No encontrado.')

  const { productUpdate } = await shopifyAdminQuery<{
    productUpdate: { product: { id: string; status: ProductStatus } | null; userErrors: UserError[] }
  }>(PRODUCT_UPDATE, { product: { id: current.id, status } })
  if (!productUpdate.product) return throwUserErrors(productUpdate.userErrors, 'Shopify no cambió el estado.')

  if (status === 'ACTIVE') await publishProduct(current.id)
  return { status: productUpdate.product.status }
}

export const deleteStoreProduct = async (store: StoreDTO, id: string) => {
  const current = await fetchProduct(store, id)
  if (!current) throw new ProductError('No encontrado.')

  const { productDelete } = await shopifyAdminQuery<{
    productDelete: { deletedProductId: string | null; userErrors: UserError[] }
  }>(PRODUCT_DELETE, { input: { id: current.id } })
  if (!productDelete.deletedProductId) throwUserErrors(productDelete.userErrors, 'Shopify no eliminó el producto.')
}

export type ImageUploadTarget = { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }

export const createImageUploadTargets = async (files: ImageUploadRequest): Promise<ImageUploadTarget[]> => {
  const { stagedUploadsCreate } = await shopifyAdminQuery<{
    stagedUploadsCreate: { stagedTargets: ImageUploadTarget[]; userErrors: UserError[] }
  }>(STAGED_UPLOADS, {
    input: files.map((file) => ({
      resource: 'IMAGE',
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: String(file.fileSize),
      httpMethod: 'POST',
    })),
  })
  if (stagedUploadsCreate.userErrors.length > 0) {
    throwUserErrors(stagedUploadsCreate.userErrors, 'Shopify no preparó la subida de imágenes.')
  }
  return stagedUploadsCreate.stagedTargets
}
