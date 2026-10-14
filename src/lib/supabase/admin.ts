import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminEnv } from '@/lib/env'
import type { Database } from './database.types'

// Cliente con la secret key: ignora RLS. Solo para sincronización, webhooks, cron,
// el script de la cuenta inicial y el cambio de must_change_password.
export const createAdminClient = () => {
  const { url, secretKey } = getSupabaseAdminEnv()

  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
