import 'server-only'
import { getAppEnv } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import type { TimeBucket } from './range'

// Funciones SQL security invoker: el RLS sigue aplicando (ver migración finance_functions).

export type DateRange = { from: Date; to: Date }

export type SalesSummary = {
  netAmount: number
  grossAmount: number
  discountAmount: number
  refundedAmount: number
  orders: number
  units: number
  avgTicket: number
  pickupNet: number
  pickupOrders: number
  shippingNet: number
  shippingOrders: number
  pendingPaymentNet: number
}

export type SalesPoint = {
  bucket: string
  netAmount: number
  pickupNet: number
  shippingNet: number
  orders: number
}

export type TopProduct = {
  productGid: string | null
  title: string
  units: number
  netAmount: number
}

const rangeParams = (storeId: string, range: DateRange) => ({
  p_store_id: storeId,
  p_from: range.from.toISOString(),
  p_to: range.to.toISOString(),
  // RN-18: las órdenes de prueba no cuentan en producción.
  p_include_test: getAppEnv().includeTestOrders,
})

export const getSalesSummary = async (storeId: string, range: DateRange): Promise<SalesSummary> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('store_sales_summary', rangeParams(storeId, range)).single()
  if (error) throw new Error(`No se pudo calcular el resumen de ventas: ${error.message}`)

  return {
    netAmount: Number(data.net_amount),
    grossAmount: Number(data.gross_amount),
    discountAmount: Number(data.discount_amount),
    refundedAmount: Number(data.refunded_amount),
    orders: Number(data.orders),
    units: Number(data.units),
    avgTicket: Number(data.avg_ticket),
    pickupNet: Number(data.pickup_net),
    pickupOrders: Number(data.pickup_orders),
    shippingNet: Number(data.shipping_net),
    shippingOrders: Number(data.shipping_orders),
    pendingPaymentNet: Number(data.pending_payment_net),
  }
}

export const getSalesTimeseries = async (
  storeId: string,
  range: DateRange,
  bucket: TimeBucket
): Promise<SalesPoint[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('store_sales_timeseries', {
    ...rangeParams(storeId, range),
    p_bucket: bucket,
  })
  if (error) throw new Error(`No se pudo calcular la serie de ventas: ${error.message}`)

  return (data ?? []).map((row) => ({
    bucket: row.bucket,
    netAmount: Number(row.net_amount),
    pickupNet: Number(row.pickup_net),
    shippingNet: Number(row.shipping_net),
    orders: Number(row.orders),
  }))
}

export const getTopProducts = async (storeId: string, range: DateRange, limit = 10): Promise<TopProduct[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('store_top_products', { ...rangeParams(storeId, range), p_limit: limit })
  if (error) throw new Error(`No se pudieron calcular los productos más vendidos: ${error.message}`)

  return (data ?? []).map((row) => ({
    productGid: row.product_gid,
    title: row.title,
    units: Number(row.units),
    netAmount: Number(row.net_amount),
  }))
}
