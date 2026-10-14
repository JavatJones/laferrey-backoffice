import { createHmac, timingSafeEqual } from 'node:crypto'

// X-Shopify-Hmac-Sha256 es el base64 del HMAC-SHA256 del cuerpo crudo con el
// client secret de la app. Se compara en tiempo constante.
export const verifyShopifyHmac = (rawBody: string, hmacHeader: string | null, secret: string) => {
  if (!hmacHeader || !secret) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  let received: Buffer
  try {
    received = Buffer.from(hmacHeader, 'base64')
  } catch {
    return false
  }
  return received.length === expected.length && timingSafeEqual(received, expected)
}

// Comparación en tiempo constante de secretos en texto (p. ej. CRON_SECRET).
export const safeEqual = (a: string, b: string) => {
  const left = createHmac('sha256', 'compare').update(a).digest()
  const right = createHmac('sha256', 'compare').update(b).digest()
  return timingSafeEqual(left, right) && a.length === b.length
}

export const normalizeShopDomain = (domain: string | null) =>
  (domain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

export type WebhookTarget =
  | { kind: 'sync'; orderGid: string }
  | { kind: 'delete'; orderId: number }
  | { kind: 'ignore'; reason: string }

const ORDER_GID = /^gid:\/\/shopify\/Order\/\d+$/

const numericId = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : typeof value === 'string' && /^\d{1,20}$/.test(value)
      ? Number(value)
      : null

// Qué orden toca cada topic. El cuerpo ya pasó la verificación HMAC.
export const resolveWebhookTarget = (topic: string, payload: unknown): WebhookTarget => {
  const body = (payload ?? {}) as Record<string, unknown>

  switch (topic) {
    case 'orders/create':
    case 'orders/updated':
    case 'orders/cancelled': {
      const gid = body.admin_graphql_api_id
      if (typeof gid === 'string' && ORDER_GID.test(gid)) return { kind: 'sync', orderGid: gid }
      const id = numericId(body.id)
      return id ? { kind: 'sync', orderGid: `gid://shopify/Order/${id}` } : { kind: 'ignore', reason: 'sin id de orden' }
    }
    case 'orders/edited': {
      const id = numericId((body.order_edit as Record<string, unknown> | undefined)?.order_id)
      return id ? { kind: 'sync', orderGid: `gid://shopify/Order/${id}` } : { kind: 'ignore', reason: 'sin order_edit.order_id' }
    }
    case 'refunds/create': {
      const id = numericId(body.order_id)
      return id ? { kind: 'sync', orderGid: `gid://shopify/Order/${id}` } : { kind: 'ignore', reason: 'sin order_id' }
    }
    case 'orders/delete': {
      const id = numericId(body.id)
      return id ? { kind: 'delete', orderId: id } : { kind: 'ignore', reason: 'sin id' }
    }
    default:
      return { kind: 'ignore', reason: `topic no manejado: ${topic}` }
  }
}
