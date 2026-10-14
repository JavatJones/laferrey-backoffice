import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/env'
import type { Database } from './database.types'

// Cliente con la sesión del usuario: todas sus consultas pasan por RLS.
export const createClient = async () => {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabaseEnv()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component, que no puede escribir cookies.
          // El proxy refresca la sesión en cada solicitud.
        }
      },
    },
  })
}
