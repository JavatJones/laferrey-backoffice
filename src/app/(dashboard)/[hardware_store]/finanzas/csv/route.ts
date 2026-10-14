import { StoreAccessError, authorizeStore } from '@/lib/auth/dal'
import { todayInZone, zonedRange } from '@/lib/dates'
import { getAppEnv } from '@/lib/env'
import { resolveRange } from '@/lib/finance/range'
import { deliveryLabel, statusLabel } from '@/lib/orders/status'
import { financialStatus } from '@/lib/shopify/format'
import { createClient } from '@/lib/supabase/server'
import { financeSearchSchema } from '@/lib/validations/finance'

// Exportación de las órdenes de la ferretería del periodo. Pasa por el DAL y lee con
// la sesión del usuario, así que el RLS limita a sus filas.

const MAX_ROWS = 10_000

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value)
  // Evita inyección de fórmulas al abrir el CSV en Excel.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const GET = async (request: Request, { params }: RouteContext<'/[hardware_store]/finanzas/csv'>) => {
  const { hardware_store } = await params

  let store
  try {
    ;({ store } = await authorizeStore(hardware_store))
  } catch (error) {
    if (error instanceof StoreAccessError) {
      return new Response('No encontrado', { status: error.reason === 'unauthenticated' ? 401 : 404 })
    }
    throw error
  }

  const url = new URL(request.url)
  const range = resolveRange(financeSearchSchema.parse(Object.fromEntries(url.searchParams)), todayInZone())
  const { from, to } = zonedRange(range.from, range.to)

  const supabase = await createClient()
  let query = supabase
    .from('store_orders')
    .select(
      'order_name, processed_at, customer_display_name, delivery_method, status, financial_status, is_test, units, gross_amount, discount_amount, refunded_amount, net_amount'
    )
    .eq('hardware_store_id', store.id)
    .gte('processed_at', from.toISOString())
    .lt('processed_at', to.toISOString())
    .order('processed_at')
    .limit(MAX_ROWS)
  if (!getAppEnv().includeTestOrders) query = query.eq('is_test', false)

  const { data, error } = await query
  if (error) return new Response('No se pudo generar el archivo', { status: 500 })

  const header = [
    'Orden',
    'Fecha',
    'Cliente',
    'Método',
    'Estado',
    'Pago',
    'Prueba',
    'Unidades',
    'Venta bruta',
    'Descuentos',
    'Devoluciones',
    'Venta neta',
  ]
  const dateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Monterrey' })
  const rows = data.map((row) => [
    row.order_name,
    dateFormat.format(new Date(row.processed_at)),
    row.customer_display_name,
    deliveryLabel(row.delivery_method),
    statusLabel(row.status, row.delivery_method),
    financialStatus(row.financial_status)?.label ?? '',
    row.is_test ? 'Sí' : 'No',
    row.units,
    row.gross_amount,
    row.discount_amount,
    row.refunded_amount,
    row.net_amount,
  ])

  // BOM para que Excel abra el archivo en UTF-8 (acentos).
  const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ventas-${store.slug}-${range.from}-a-${range.to}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
