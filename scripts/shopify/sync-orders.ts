// Sincroniza órdenes de Shopify a Supabase.
//   pnpm sync:orders            desde el último cursor
//   pnpm sync:orders --full     todas (sin read_all_orders, solo las de los últimos 60 días)
//   pnpm sync:orders --order 1234567890
import { orderGid, syncOrderById, syncOrdersUpdatedSince } from '@/lib/shopify/orders-sync'
import { flagValue, hasFlag, run } from '../lib/cli'

run(async () => {
  const orderId = flagValue('order')
  if (orderId) {
    if (!/^\d+$/.test(orderId)) throw new Error('--order debe ser el ID numérico de la orden')
    console.log(await syncOrderById(orderGid(orderId)))
    return
  }

  const full = hasFlag('full')
  console.log(full ? 'Sincronización completa…' : 'Sincronizando desde el último cursor…')
  const summary = await syncOrdersUpdatedSince({ full })
  console.log(
    `Órdenes: ${summary.orders} · cambios de estado: ${summary.statusChanges} · cursor: ${summary.cursor ?? '—'}`
  )
  for (const failure of summary.failures) console.error(`  ✘ ${failure.name}: ${failure.error}`)
  if (summary.failures.length > 0) process.exitCode = 1
})
