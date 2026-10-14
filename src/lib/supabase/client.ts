import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Cliente del navegador. Solo usa la URL y la llave publicable; todo pasa por RLS.
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
