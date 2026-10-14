import { describe, expect, it } from 'vitest'
import { isSameVendor, normalizeVendor } from './vendor'

describe('normalizeVendor', () => {
  it('ignora mayúsculas y espacios sobrantes', () => {
    expect(normalizeVendor('  Mercado   Total\tFerretero ')).toBe('mercado total ferretero')
  })

  it('conserva acentos y signos', () => {
    expect(normalizeVendor('Ferretería Ñandú & Cía.')).toBe('ferretería ñandú & cía.')
  })

  it('trata null y undefined como vacío', () => {
    expect(normalizeVendor(null)).toBe('')
    expect(normalizeVendor(undefined)).toBe('')
  })
})

describe('isSameVendor', () => {
  it('compara el proveedor completo (RN-02)', () => {
    expect(isSameVendor('Mercado Total Ferretero', 'mercado total ferretero')).toBe(true)
    expect(isSameVendor('Mercado Total', 'Mercado Total Ferretero')).toBe(false)
    expect(isSameVendor('Aldevaram', 'Mercado Total Ferretero')).toBe(false)
  })

  it('nunca empata proveedores vacíos', () => {
    expect(isSameVendor('', '')).toBe(false)
    expect(isSameVendor('  ', null)).toBe(false)
  })
})
