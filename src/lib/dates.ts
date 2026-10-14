import { STORE_TIME_ZONE } from '@/lib/shopify/format'

// Fechas de calendario (YYYY-MM-DD) en la zona horaria de la tienda (RN-26).

export type CalendarDate = string

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const isCalendarDate = (value: string): value is CalendarDate => {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

const parts = (date: CalendarDate) => {
  const [, y, m, d] = DATE_PATTERN.exec(date)!.map(Number)
  return { y, m, d }
}

const pad = (value: number) => String(value).padStart(2, '0')

const fromUtcParts = (date: Date): CalendarDate =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

// Diferencia en ms entre la hora local de `timeZone` y UTC en ese instante.
const offsetAt = (instant: number, timeZone: string) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(instant))
      .map(({ type, value }) => [type, Number(value)])
  )
  const asUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second)
  return asUtc - Math.floor(instant / 1000) * 1000
}

// Instante en que empieza `date` (00:00) en la zona de la tienda.
export const startOfDayInZone = (date: CalendarDate, timeZone = STORE_TIME_ZONE): Date => {
  const { y, m, d } = parts(date)
  const naive = Date.UTC(y, m - 1, d)
  let instant = naive - offsetAt(naive, timeZone)
  // Una segunda pasada corrige el caso en que el desfase cambia ese día (horario de verano).
  instant = naive - offsetAt(instant, timeZone)
  return new Date(instant)
}

export const todayInZone = (now = new Date(), timeZone = STORE_TIME_ZONE): CalendarDate =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

export const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const { y, m, d } = parts(date)
  return fromUtcParts(new Date(Date.UTC(y, m - 1, d + days)))
}

export const startOfMonth = (date: CalendarDate): CalendarDate => `${date.slice(0, 7)}-01`

export const addMonths = (date: CalendarDate, months: number): CalendarDate => {
  const { y, m } = parts(date)
  return fromUtcParts(new Date(Date.UTC(y, m - 1 + months, 1)))
}

export const startOfYear = (date: CalendarDate): CalendarDate => `${date.slice(0, 4)}-01-01`

export const daysBetween = (from: CalendarDate, to: CalendarDate) => {
  const a = parts(from)
  const b = parts(to)
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000)
}

// Rango [desde, hasta] inclusivo en días locales → instantes [from, to) para consultar.
export const zonedRange = (from: CalendarDate, to: CalendarDate, timeZone = STORE_TIME_ZONE) => ({
  from: startOfDayInZone(from, timeZone),
  to: startOfDayInZone(addDays(to, 1), timeZone),
})

export const formatCalendarDate = (date: CalendarDate, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => {
  const { y, m, d } = parts(date)
  return new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}
