import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { normalizeShopDomain, resolveWebhookTarget, safeEqual, verifyShopifyHmac } from './webhooks'

const SECRET = 'shpss_test_secret'
const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(body, 'utf8').digest('base64')

describe('verifyShopifyHmac', () => {
  const body = '{"id":5001,"admin_graphql_api_id":"gid://shopify/Order/5001"}'

  it('acepta la firma correcta', () => {
    expect(verifyShopifyHmac(body, sign(body), SECRET)).toBe(true)
  })

  it('rechaza cuerpo alterado, otra llave o firma ausente', () => {
    expect(verifyShopifyHmac(`${body} `, sign(body), SECRET)).toBe(false)
    expect(verifyShopifyHmac(body, sign(body, 'otra'), SECRET)).toBe(false)
    expect(verifyShopifyHmac(body, null, SECRET)).toBe(false)
    expect(verifyShopifyHmac(body, 'no-es-base64!!', SECRET)).toBe(false)
    expect(verifyShopifyHmac(body, sign(body), '')).toBe(false)
  })
})

describe('safeEqual', () => {
  it('compara secretos', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('normalizeShopDomain', () => {
  it('normaliza el dominio', () => {
    expect(normalizeShopDomain(' UBIQAT-WZ.myshopify.com ')).toBe('ubiqat-wz.myshopify.com')
    expect(normalizeShopDomain(null)).toBe('')
  })
})

describe('resolveWebhookTarget', () => {
  it('órdenes: usa admin_graphql_api_id', () => {
    expect(resolveWebhookTarget('orders/updated', { admin_graphql_api_id: 'gid://shopify/Order/5001' })).toEqual({
      kind: 'sync',
      orderGid: 'gid://shopify/Order/5001',
    })
  })

  it('reembolsos y ediciones: sincronizan la orden padre', () => {
    expect(resolveWebhookTarget('refunds/create', { order_id: 5001, admin_graphql_api_id: 'gid://shopify/Refund/9' })).toEqual({
      kind: 'sync',
      orderGid: 'gid://shopify/Order/5001',
    })
    expect(resolveWebhookTarget('orders/edited', { order_edit: { order_id: 5001 } })).toEqual({
      kind: 'sync',
      orderGid: 'gid://shopify/Order/5001',
    })
  })

  it('borrado de orden', () => {
    expect(resolveWebhookTarget('orders/delete', { id: 5001 })).toEqual({ kind: 'delete', orderId: 5001 })
  })

  it('ignora topics y cuerpos desconocidos', () => {
    expect(resolveWebhookTarget('products/update', { id: 1 }).kind).toBe('ignore')
    expect(resolveWebhookTarget('orders/updated', { admin_graphql_api_id: 'gid://shopify/Product/1' }).kind).toBe('ignore')
  })
})
