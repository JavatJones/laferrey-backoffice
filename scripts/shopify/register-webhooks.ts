// Registra los webhooks de órdenes que falten.
//   pnpm shopify:webhooks --url https://mi-dominio.com [--prune] [--yes]
// Necesita una URL pública (el despliegue o un túnel). Pide confirmación.
// --prune borra las suscripciones de estos mismos topics que apunten a otra URL del
// backoffice (por ejemplo, tras cambiar de dominio), para no recibir eventos dobles.
import { shopifyAdminQuery } from '@/lib/shopify/client'
import type { UserError } from '@/lib/shopify/types'
import { confirm, flagValue, hasFlag, run } from '../lib/cli'

const TOPICS = [
  'ORDERS_CREATE',
  'ORDERS_UPDATED',
  'ORDERS_CANCELLED',
  'ORDERS_DELETE',
  'ORDERS_EDITED',
  'REFUNDS_CREATE',
] as const

const LIST_QUERY = /* GraphQL */ `
  query WebhookSubscriptions {
    webhookSubscriptions(first: 100) {
      nodes { id topic uri format }
    }
  }
`

const DELETE_MUTATION = /* GraphQL */ `
  mutation WebhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors { field message }
    }
  }
`

const CREATE_MUTATION = /* GraphQL */ `
  mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id topic uri }
      userErrors { field message }
    }
  }
`

run(async () => {
  const base = flagValue('url')
  if (!base || !/^https:\/\/[^/]+/.test(base)) throw new Error('Usa --url https://<host público>')
  const uri = `${base.replace(/\/+$/, '')}/api/webhooks/shopify`

  const { webhookSubscriptions } = await shopifyAdminQuery<{
    webhookSubscriptions: { nodes: { id: string; topic: string; uri: string; format: string }[] }
  }>(LIST_QUERY)

  console.log('Suscripciones actuales:')
  for (const sub of webhookSubscriptions.nodes) console.log(`  ${sub.topic.padEnd(18)} ${sub.uri}`)
  if (webhookSubscriptions.nodes.length === 0) console.log('  (ninguna)')

  // Suscripciones del backoffice a otra URL (dominio anterior).
  const stale = webhookSubscriptions.nodes.filter(
    (sub) =>
      (TOPICS as readonly string[]).includes(sub.topic) && sub.uri !== uri && sub.uri.endsWith('/api/webhooks/shopify')
  )
  if (stale.length > 0 && hasFlag('prune')) {
    console.log(`\nSe borrarán ${stale.length} suscripciones a otras URL:`)
    for (const sub of stale) console.log(`  ${sub.topic.padEnd(18)} ${sub.uri}`)
    if (await confirm('¿Borrar estas suscripciones?')) {
      for (const sub of stale) {
        const { webhookSubscriptionDelete } = await shopifyAdminQuery<{
          webhookSubscriptionDelete: { deletedWebhookSubscriptionId: string | null; userErrors: UserError[] }
        }>(DELETE_MUTATION, { id: sub.id })
        const errors = webhookSubscriptionDelete.userErrors
        console.log(errors.length ? `  ✘ ${sub.topic}: ${errors.map((e) => e.message).join('; ')}` : `  ✔ borrada ${sub.topic}`)
      }
    }
  } else if (stale.length > 0) {
    console.log(`\nHay ${stale.length} suscripciones a otra URL del backoffice; usa --prune para borrarlas.`)
  }

  const missing = TOPICS.filter(
    (topic) => !webhookSubscriptions.nodes.some((sub) => sub.topic === topic && sub.uri === uri)
  )
  if (missing.length === 0) {
    console.log(`Todo listo: los ${TOPICS.length} webhooks apuntan a ${uri}`)
    return
  }

  console.log(`\nFaltan ${missing.length}: ${missing.join(', ')}\nDestino: ${uri}`)
  if (!(await confirm('¿Crear estas suscripciones en la tienda real?'))) {
    console.log('Cancelado.')
    return
  }

  for (const topic of missing) {
    const { webhookSubscriptionCreate } = await shopifyAdminQuery<{
      webhookSubscriptionCreate: { webhookSubscription: { id: string } | null; userErrors: UserError[] }
    }>(CREATE_MUTATION, { topic, webhookSubscription: { uri, format: 'JSON' } })
    const errors = webhookSubscriptionCreate.userErrors
    console.log(errors.length ? `  ✘ ${topic}: ${errors.map((e) => e.message).join('; ')}` : `  ✔ ${topic}`)
  }
})
