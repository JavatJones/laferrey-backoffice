import type { Count, Money } from './types'

const LOCALE = 'es-MX'

// RN-26: zona horaria de la tienda.
export const STORE_TIME_ZONE = 'America/Monterrey'
export const STORE_CURRENCY = 'MXN'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

type StatusInfo = { label: string; tone: StatusTone }

const FINANCIAL_STATUS: Record<string, StatusInfo> = {
  PAID: { label: 'Pagado', tone: 'success' },
  PENDING: { label: 'Pendiente', tone: 'warning' },
  AUTHORIZED: { label: 'Autorizado', tone: 'warning' },
  PARTIALLY_PAID: { label: 'Pago parcial', tone: 'warning' },
  PARTIALLY_REFUNDED: { label: 'Reembolso parcial', tone: 'neutral' },
  REFUNDED: { label: 'Reembolsado', tone: 'neutral' },
  VOIDED: { label: 'Anulado', tone: 'danger' },
  EXPIRED: { label: 'Vencido', tone: 'danger' },
}

const FULFILLMENT_STATUS: Record<string, StatusInfo> = {
  FULFILLED: { label: 'Preparado', tone: 'success' },
  PARTIALLY_FULFILLED: { label: 'Parcial', tone: 'warning' },
  IN_PROGRESS: { label: 'En proceso', tone: 'warning' },
  PENDING_FULFILLMENT: { label: 'Pendiente', tone: 'warning' },
  OPEN: { label: 'Abierto', tone: 'warning' },
  SCHEDULED: { label: 'Programado', tone: 'neutral' },
  ON_HOLD: { label: 'En espera', tone: 'neutral' },
  UNFULFILLED: { label: 'Sin preparar', tone: 'warning' },
  RESTOCKED: { label: 'Reabastecido', tone: 'neutral' },
  REQUEST_DECLINED: { label: 'Rechazado', tone: 'danger' },
}

const PRODUCT_STATUS: Record<string, StatusInfo> = {
  ACTIVE: { label: 'Activo', tone: 'success' },
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  ARCHIVED: { label: 'Archivado', tone: 'neutral' },
  UNLISTED: { label: 'No listado', tone: 'neutral' },
}

// Para valores nuevos que Shopify agregue en el futuro: "SOME_STATUS" -> "Some status".
const fallbackStatus = (value: string): StatusInfo => ({
  label: value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' '),
  tone: 'neutral',
})

export const financialStatus = (value: string | null) =>
  value ? (FINANCIAL_STATUS[value] ?? fallbackStatus(value)) : null

export const fulfillmentStatus = (value: string) => FULFILLMENT_STATUS[value] ?? fallbackStatus(value)

export const productStatus = (value: string) => PRODUCT_STATUS[value] ?? fallbackStatus(value)

export const formatCurrency = (amount: number | string, currency = STORE_CURRENCY) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(Number(amount))

export const formatMoney = ({ amount, currencyCode }: Money) => formatCurrency(amount, currencyCode)

export const formatPriceRange = (min: Money, max: Money) =>
  min.amount === max.amount ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`

export const formatDateTime = (iso: string, timeZone = STORE_TIME_ZONE) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
    new Date(iso)
  )

export const formatDate = (iso: string, timeZone = STORE_TIME_ZONE) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone }).format(new Date(iso))

export const formatNumber = (value: number) => value.toLocaleString(LOCALE)

export const formatCount = ({ count, precision }: Count) =>
  `${formatNumber(count)}${precision === 'AT_LEAST' ? '+' : ''}`
