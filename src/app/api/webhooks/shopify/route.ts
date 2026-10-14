import { after } from 'next/server'
import { getShopifyEnv } from '@/lib/env'
import { deleteSyncedOrder, syncOrderById } from '@/lib/shopify/orders-sync'
import { normalizeShopDomain, resolveWebhookTarget, verifyShopifyHmac } from '@/lib/shopify/webhooks'
import { createAdminClient } from '@/lib/supabase/admin'

// Webhooks de órdenes de Shopify. Se autentica con la firma HMAC (el proxy no corre
// en /api/webhooks). Responde 200 rápido y sincroniza después con after().
export const maxDuration = 60

const text = (status: number, body: string) => new Response(body, { status })

export const POST = async (request: Request) => {
  const rawBody = await request.text()
  const { clientSecret, storeDomain } = getShopifyEnv()

  if (!verifyShopifyHmac(rawBody, request.headers.get('x-shopify-hmac-sha256'), clientSecret)) {
    return text(401, 'Firma inválida')
  }

  const shopDomain = normalizeShopDomain(request.headers.get('x-shopify-shop-domain'))
  if (shopDomain !== normalizeShopDomain(storeDomain)) return text(401, 'Tienda desconocida')

  const topic = request.headers.get('x-shopify-topic')
  const eventId = request.headers.get('x-shopify-event-id') ?? request.headers.get('x-shopify-webhook-id')
  if (!topic || !eventId) return text(400, 'Faltan encabezados de Shopify')

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return text(400, 'Cuerpo inválido')
  }

  const target = resolveWebhookTarget(topic, payload)
  const resourceGid =
    target.kind === 'sync' ? target.orderGid : target.kind === 'delete' ? `gid://shopify/Order/${target.orderId}` : null

  const admin = createAdminClient()

  // Idempotencia: cada evento se registra una vez; si ya se procesó, no se repite.
  const { data: inserted, error: insertError } = await admin
    .from('shopify_webhook_events')
    .upsert(
      { event_id: eventId, topic, shop_domain: shopDomain, resource_gid: resourceGid },
      { onConflict: 'event_id', ignoreDuplicates: true }
    )
    .select('event_id')
  if (insertError) {
    console.error('[webhook] no se pudo registrar el evento', insertError)
    return text(500, 'Error interno')
  }

  if (inserted.length === 0) {
    const { data: existing } = await admin
      .from('shopify_webhook_events')
      .select('status')
      .eq('event_id', eventId)
      .maybeSingle()
    if (existing?.status === 'processed') return text(200, 'Evento ya procesado')
  }

  const finish = async (status: 'processed' | 'failed', error: string | null = null) => {
    await admin
      .from('shopify_webhook_events')
      .update({ status, error, processed_at: new Date().toISOString() })
      .eq('event_id', eventId)
  }

  if (target.kind === 'ignore') {
    await finish('processed', target.reason)
    return text(200, 'Ignorado')
  }

  after(async () => {
    try {
      if (target.kind === 'sync') await syncOrderById(target.orderGid)
      else await deleteSyncedOrder(target.orderId)
      await finish('processed')
    } catch (error) {
      // La reconciliación del cron recoge lo que falle aquí.
      console.error(`[webhook] ${topic} ${resourceGid}`, error)
      await finish('failed', error instanceof Error ? error.message : String(error))
    }
  })

  return text(200, 'Recibido')
}
