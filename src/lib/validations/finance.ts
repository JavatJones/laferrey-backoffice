import { z } from 'zod'
import { isCalendarDate } from '@/lib/dates'

export const RANGE_PRESETS = ['hoy', '7-dias', '30-dias', 'este-mes', 'mes-anterior', 'este-anio', 'personalizado'] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)

const calendarDate = z.preprocess(first, z.string().refine(isCalendarDate).optional().catch(undefined))

// ?rango=este-mes o ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD, interpretados en America/Monterrey.
export const financeSearchSchema = z.object({
  rango: z.preprocess(first, z.enum(RANGE_PRESETS).optional().catch(undefined)),
  desde: calendarDate,
  hasta: calendarDate,
})

export type FinanceFilters = z.infer<typeof financeSearchSchema>
