import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export const proxy = async (request: NextRequest) => updateSession(request)

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, imágenes y las rutas que se autentican solas
    // (webhooks con HMAC y cron con CRON_SECRET).
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
