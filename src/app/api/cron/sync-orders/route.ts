import { EnvError, getCronSecret } from '@/lib/env'
import { syncOrdersUpdatedSince } from '@/lib/shopify/orders-sync'
import { safeEqual } from '@/lib/shopify/webhooks'

// Reconciliación periódica de órdenes. Requiere Authorization: Bearer <CRON_SECRET>
// (el proxy no corre en /api/cron).
export const maxDuration = 300

export const GET = async (request: Request) => {
  let secret: string
  try {
    secret = getCronSecret()
  } catch (error) {
    if (error instanceof EnvError) {
      console.error('[cron] sync-orders', error.message)
      return Response.json({ error: 'El servidor no tiene CRON_SECRET configurado' }, { status: 503 })
    }
    throw error
  }

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!safeEqual(token, secret)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const summary = await syncOrdersUpdatedSince()
    return Response.json(summary, { status: summary.failures.length > 0 ? 207 : 200 })
  } catch (error) {
    console.error('[cron] sync-orders', error)
    return Response.json({ error: 'La sincronización falló' }, { status: 500 })
  }
}
