import { describe, expect, it } from 'vitest'
import { bucketsInRange, fillSeries, percentChange, resolveRange } from './range'

const TODAY = '2026-10-14'

describe('resolveRange', () => {
  it('por defecto es este mes', () => {
    expect(resolveRange({}, TODAY)).toMatchObject({ preset: 'este-mes', from: '2026-10-01', to: '2026-10-14', bucket: 'day' })
  })

  it('atajos', () => {
    expect(resolveRange({ rango: 'hoy' }, TODAY)).toMatchObject({ from: TODAY, to: TODAY })
    expect(resolveRange({ rango: '7-dias' }, TODAY)).toMatchObject({ from: '2026-10-08', to: TODAY })
    expect(resolveRange({ rango: '30-dias' }, TODAY)).toMatchObject({ from: '2026-09-15', to: TODAY })
    expect(resolveRange({ rango: 'mes-anterior' }, TODAY)).toMatchObject({ from: '2026-09-01', to: '2026-09-30' })
    expect(resolveRange({ rango: 'este-anio' }, TODAY)).toMatchObject({ from: '2026-01-01', to: TODAY, bucket: 'month' })
  })

  it('personalizado ordena las fechas y elige el periodo de la serie', () => {
    expect(resolveRange({ desde: '2026-10-10', hasta: '2026-10-01' }, TODAY)).toMatchObject({
      preset: 'personalizado',
      from: '2026-10-01',
      to: '2026-10-10',
    })
    expect(resolveRange({ desde: '2025-01-01', hasta: '2026-10-14' }, TODAY).bucket).toBe('month')
  })

  it('periodo anterior de la misma duración', () => {
    expect(resolveRange({ rango: '7-dias' }, TODAY).previous).toEqual({ from: '2026-10-01', to: '2026-10-07' })
    expect(resolveRange({ rango: 'hoy' }, TODAY).previous).toEqual({ from: '2026-10-13', to: '2026-10-13' })
  })
})

describe('bucketsInRange / fillSeries', () => {
  it('días, semanas (lunes) y meses', () => {
    expect(bucketsInRange('2026-10-01', '2026-10-03', 'day')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(bucketsInRange('2026-10-01', '2026-10-14', 'week')).toEqual(['2026-09-28', '2026-10-05', '2026-10-12'])
    expect(bucketsInRange('2026-08-15', '2026-10-14', 'month')).toEqual(['2026-08-01', '2026-09-01', '2026-10-01'])
  })

  it('rellena los periodos sin ventas', () => {
    const filled = fillSeries([{ bucket: '2026-10-02', net: 5 }], ['2026-10-01', '2026-10-02'], (bucket) => ({ bucket, net: 0 }))
    expect(filled).toEqual([
      { bucket: '2026-10-01', net: 0 },
      { bucket: '2026-10-02', net: 5 },
    ])
  })

  it('variación porcentual', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(5, 0)).toBeNull()
  })
})
