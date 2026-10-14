import 'server-only'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { normalizeVendor } from '@/lib/shopify/vendor'
import { createClient } from '@/lib/supabase/server'

// Capa de acceso a datos: cada página, server action y route handler autentica y
// autoriza aquí. El layout no basta, porque no se vuelve a ejecutar al navegar.

export const SIGN_IN_PATH = '/auth'
export const CHANGE_PASSWORD_PATH = '/auth/cambiar-contrasena'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export type SessionUser = { id: string; email: string | null }

// DTO de la ferretería: lo único que el resto de la app necesita saber de ella.
export type StoreDTO = {
  id: string
  slug: string
  name: string
  vendor: string
  vendorKey: string
  locationId: string | null
}

type StoreRow = {
  id: string
  slug: string
  name: string
  shopify_vendor: string
  shopify_location_id: string | null
}

const STORE_COLUMNS = 'id, slug, name, shopify_vendor, shopify_location_id'

const toStoreDTO = (row: StoreRow): StoreDTO => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  vendor: row.shopify_vendor,
  vendorKey: normalizeVendor(row.shopify_vendor),
  locationId: row.shopify_location_id,
})

// getClaims() verifica la firma del token; getSession() no, así que nunca se usa aquí.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
})

export const requireUser = async () => {
  const user = await getSessionUser()
  if (!user) redirect(SIGN_IN_PATH)
  return user
}

export const getMustChangePassword = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer el perfil: ${error.message}`)
  // Sin perfil no hay forma de saber si la contraseña es temporal: se exige cambiarla.
  return data?.must_change_password ?? true
})

// Ferretería de la cuenta (RN-04: por ahora una sola).
export const getUserStore = cache(async (): Promise<StoreDTO | null> => {
  const user = await getSessionUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hardware_store_members')
    .select(`hardware_stores (${STORE_COLUMNS}, is_active)`)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer la ferretería: ${error.message}`)

  const store = data?.hardware_stores
  return store && store.is_active ? toStoreDTO(store) : null
})

type StoreAccess = { user: SessionUser; store: StoreDTO }

type StoreAccessResult =
  | { ok: true; access: StoreAccess }
  | { ok: false; reason: 'unauthenticated' | 'must_change_password' | 'not_found' }

// Busca la ferretería con el cliente de la sesión: el RLS solo deja ver la propia,
// así que una ajena y una inexistente se ven igual ("no encontrado", RN-08).
const resolveStoreAccess = cache(async (slug: string): Promise<StoreAccessResult> => {
  const user = await getSessionUser()
  if (!user) return { ok: false, reason: 'unauthenticated' }
  if (!SLUG_PATTERN.test(slug)) return { ok: false, reason: 'not_found' }

  const supabase = await createClient()
  const { data: store, error } = await supabase
    .from('hardware_stores')
    .select(STORE_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer la ferretería: ${error.message}`)
  if (!store) return { ok: false, reason: 'not_found' }

  if (await getMustChangePassword(user.id)) return { ok: false, reason: 'must_change_password' }

  return { ok: true, access: { user, store: toStoreDTO(store) } }
})

// Para páginas y layouts: redirige o responde 404.
export const requireStoreAccess = async (slug: string): Promise<StoreAccess> => {
  const result = await resolveStoreAccess(slug)
  if (result.ok) return result.access
  if (result.reason === 'unauthenticated') redirect(SIGN_IN_PATH)
  if (result.reason === 'must_change_password') redirect(CHANGE_PASSWORD_PATH)
  notFound()
}

export class StoreAccessError extends Error {
  constructor(readonly reason: Exclude<StoreAccessResult, { ok: true }>['reason']) {
    super(reason)
    this.name = 'StoreAccessError'
  }
}

// Para server actions y route handlers: lanza StoreAccessError en lugar de redirigir,
// para que la acción responda con un error claro.
export const authorizeStore = async (slug: string): Promise<StoreAccess> => {
  const result = await resolveStoreAccess(slug)
  if (!result.ok) throw new StoreAccessError(result.reason)
  return result.access
}

export const describeStoreAccessError = (error: StoreAccessError) =>
  ({
    unauthenticated: 'Tu sesión terminó. Vuelve a iniciar sesión.',
    must_change_password: 'Cambia tu contraseña temporal antes de continuar.',
    not_found: 'No encontrado.',
  })[error.reason]
