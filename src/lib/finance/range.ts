import {
  addDays,
  addMonths,
  daysBetween,
  formatCalendarDate,
  startOfMonth,
  startOfYear,
  type CalendarDate,
} from '@/lib/dates'
import type { FinanceFilters, RangePreset } from '@/lib/validations/finance'

export type TimeBucket = 'day' | 'week' | 'month'

export type ResolvedRange = {
  preset: RangePreset
  from: CalendarDate
  to: CalendarDate
  label: string
  bucket: TimeBucket
  previous: { from: CalendarDate; to: CalendarDate }
}

// Rango máximo personalizado: 3 años.
const MAX_DAYS = 366 * 3

export const PRESET_LABELS: Record<RangePreset, string> = {
  hoy: 'Hoy',
  '7-dias': 'Últimos 7 días',
  '30-dias': 'Últimos 30 días',
  'este-mes': 'Este mes',
  'mes-anterior': 'Mes anterior',
  'este-anio': 'Este año',
  personalizado: 'Personalizado',
}

const bucketFor = (from: CalendarDate, to: CalendarDate): TimeBucket => {
  const days = daysBetween(from, to) + 1
  if (days <= 45) return 'day'
  if (days <= 190) return 'week'
  return 'month'
}

const presetRange = (preset: Exclude<RangePreset, 'personalizado'>, today: CalendarDate) => {
  switch (preset) {
    case 'hoy':
      return { from: today, to: today }
    case '7-dias':
      return { from: addDays(today, -6), to: today }
    case '30-dias':
      return { from: addDays(today, -29), to: today }
    case 'este-mes':
      return { from: startOfMonth(today), to: today }
    case 'mes-anterior': {
      const from = addMonths(startOfMonth(today), -1)
      return { from, to: addDays(startOfMonth(today), -1) }
    }
    case 'este-anio':
      return { from: startOfYear(today), to: today }
  }
}

export const resolveRange = (filters: FinanceFilters, today: CalendarDate): ResolvedRange => {
  let preset: RangePreset = filters.rango ?? 'este-mes'
  let { from, to } = preset === 'personalizado' ? { from: today, to: today } : presetRange(preset, today)

  if (filters.desde || filters.hasta) {
    preset = 'personalizado'
    from = filters.desde ?? filters.hasta!
    to = filters.hasta ?? filters.desde!
    if (from > to) [from, to] = [to, from]
    if (daysBetween(from, to) > MAX_DAYS) from = addDays(to, -MAX_DAYS)
  } else if (preset === 'personalizado') {
    preset = 'este-mes'
    ;({ from, to } = presetRange('este-mes', today))
  }

  const length = daysBetween(from, to) + 1
  const label =
    from === to
      ? formatCalendarDate(from, { dateStyle: 'long' })
      : `${formatCalendarDate(from)} – ${formatCalendarDate(to)}`

  return {
    preset,
    from,
    to,
    label,
    bucket: bucketFor(from, to),
    previous: { from: addDays(from, -length), to: addDays(from, -1) },
  }
}

// Lunes de la semana (date_trunc('week') de Postgres usa semanas ISO).
const startOfWeek = (date: CalendarDate) => {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return addDays(date, -((weekday + 6) % 7))
}

// Todos los periodos del rango, para rellenar los que no tuvieron ventas.
export const bucketsInRange = (from: CalendarDate, to: CalendarDate, bucket: TimeBucket): CalendarDate[] => {
  const buckets: CalendarDate[] = []
  let cursor = bucket === 'day' ? from : bucket === 'week' ? startOfWeek(from) : startOfMonth(from)
  while (cursor <= to) {
    buckets.push(cursor)
    cursor = bucket === 'day' ? addDays(cursor, 1) : bucket === 'week' ? addDays(cursor, 7) : addMonths(cursor, 1)
  }
  return buckets
}

export const fillSeries = <T extends { bucket: string }>(
  points: T[],
  buckets: CalendarDate[],
  empty: (bucket: CalendarDate) => T
) => {
  const byBucket = new Map(points.map((point) => [point.bucket, point]))
  return buckets.map((bucket) => byBucket.get(bucket) ?? empty(bucket))
}

// Variación contra el periodo anterior; null si no hay base para comparar.
export const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100
