import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  daysBetween,
  isCalendarDate,
  startOfDayInZone,
  startOfMonth,
  todayInZone,
  zonedRange,
} from './dates'

describe('fechas en America/Monterrey', () => {
  it('el día empieza a las 06:00 UTC (UTC-6, sin horario de verano)', () => {
    expect(startOfDayInZone('2026-10-14').toISOString()).toBe('2026-10-14T06:00:00.000Z')
    expect(startOfDayInZone('2026-07-01').toISOString()).toBe('2026-07-01T06:00:00.000Z')
  })

  it('respeta el horario de verano en otras zonas', () => {
    expect(startOfDayInZone('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T04:00:00.000Z')
    expect(startOfDayInZone('2026-01-15', 'America/New_York').toISOString()).toBe('2026-01-15T05:00:00.000Z')
  })

  it('hoy depende de la zona, no de UTC', () => {
    // 03:00 UTC del 15 de octubre = 21:00 del 14 en Monterrey.
    expect(todayInZone(new Date('2026-10-15T03:00:00Z'))).toBe('2026-10-14')
  })

  it('rango inclusivo de días locales', () => {
    const range = zonedRange('2026-10-01', '2026-10-31')
    expect(range.from.toISOString()).toBe('2026-10-01T06:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-01T06:00:00.000Z')
  })

  it('aritmética de calendario', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(startOfMonth('2026-10-14')).toBe('2026-10-01')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30)
  })

  it('valida fechas reales', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true)
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('2026-2-3')).toBe(false)
  })
})
