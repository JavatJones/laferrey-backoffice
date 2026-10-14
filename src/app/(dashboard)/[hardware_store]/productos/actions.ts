'use server'

import { revalidatePath } from 'next/cache'
import { StoreAccessError, authorizeStore, describeStoreAccessError, type StoreDTO } from '@/lib/auth/dal'
import { ShopifyError } from '@/lib/shopify/client'
import {
  ProductError,
  createImageUploadTargets as createTargets,
  createStoreProduct,
  deleteStoreProduct,
  setStoreProductStatus,
  updateStoreProduct,
  type ImageUploadTarget,
} from '@/lib/shopify/products'
import {
  PRODUCT_STATUSES,
  imageUploadRequestSchema,
  productFormSchema,
  productIdSchema,
  type ImageUploadRequest,
  type ProductFormValues,
  type ProductStatus,
} from '@/lib/validations/product'
import { z } from 'zod'

// Cada acción: autoriza la ferretería, valida con Zod, verifica la propiedad del
// producto (en lib/shopify/products) y usa el proveedor y la sucursal de la base de
// datos, nunca los del cliente.

export type ProductActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

const slugSchema = z.string().min(1).max(100)

const withStore = async <T,>(
  slug: unknown,
  run: (store: StoreDTO) => Promise<ProductActionResult<T>>
): Promise<ProductActionResult<T>> => {
  const parsedSlug = slugSchema.safeParse(slug)
  if (!parsedSlug.success) return { ok: false, error: 'Solicitud inválida.' }

  try {
    const { store } = await authorizeStore(parsedSlug.data)
    return await run(store)
  } catch (error) {
    if (error instanceof StoreAccessError) return { ok: false, error: describeStoreAccessError(error) }
    if (error instanceof ProductError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors }
    if (error instanceof ShopifyError) {
      console.error('[productos]', error)
      return { ok: false, error: 'Shopify no respondió como esperábamos. Intenta de nuevo en unos segundos.' }
    }
    throw error
  }
}

const zodFieldErrors = (error: z.ZodError) =>
  Object.fromEntries(error.issues.map((issue) => [issue.path.join('.'), issue.message]))

const revalidateProducts = (slug: string, id?: string) => {
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/productos`)
  if (id) revalidatePath(`/${slug}/productos/${id}`)
}

export const createProduct = async (slug: string, values: ProductFormValues) =>
  withStore<{ id: string }>(slug, async (store) => {
    const parsed = productFormSchema.safeParse(values)
    if (!parsed.success) return { ok: false, error: 'Revisa los campos marcados.', fieldErrors: zodFieldErrors(parsed.error) }

    const { id } = await createStoreProduct(store, parsed.data)
    revalidateProducts(store.slug, id)
    return { ok: true, id }
  })

export const updateProduct = async (slug: string, productId: string, values: ProductFormValues) =>
  withStore<{ id: string }>(slug, async (store) => {
    const id = productIdSchema.safeParse(productId)
    if (!id.success) return { ok: false, error: 'No encontrado.' }
    const parsed = productFormSchema.safeParse(values)
    if (!parsed.success) return { ok: false, error: 'Revisa los campos marcados.', fieldErrors: zodFieldErrors(parsed.error) }

    await updateStoreProduct(store, id.data, parsed.data)
    revalidateProducts(store.slug, id.data)
    return { ok: true, id: id.data }
  })

export const setProductStatus = async (slug: string, productId: string, status: ProductStatus) =>
  withStore<{ status: ProductStatus }>(slug, async (store) => {
    const id = productIdSchema.safeParse(productId)
    const parsedStatus = z.enum(PRODUCT_STATUSES).safeParse(status)
    if (!id.success || !parsedStatus.success) return { ok: false, error: 'Solicitud inválida.' }

    const result = await setStoreProductStatus(store, id.data, parsedStatus.data)
    revalidateProducts(store.slug, id.data)
    return { ok: true, status: result.status }
  })

export const deleteProduct = async (slug: string, productId: string) =>
  withStore<object>(slug, async (store): Promise<ProductActionResult> => {
    const id = productIdSchema.safeParse(productId)
    if (!id.success) return { ok: false, error: 'No encontrado.' }

    await deleteStoreProduct(store, id.data)
    revalidateProducts(store.slug)
    return { ok: true }
  })

export const createImageUploadTargets = async (slug: string, files: ImageUploadRequest) =>
  withStore<{ targets: ImageUploadTarget[] }>(slug, async () => {
    const parsed = imageUploadRequestSchema.safeParse(files)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Imagen inválida.' }
    return { ok: true, targets: await createTargets(parsed.data) }
  })
