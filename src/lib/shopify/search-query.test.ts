import { describe, expect, it } from 'vitest'
import { buildVendorProductQuery, quoteSearchValue } from './search-query'

describe('buildVendorProductQuery', () => {
  it('filtra por la frase exacta del proveedor', () => {
    expect(buildVendorProductQuery('Mercado Total Ferretero')).toBe('vendor:"Mercado Total Ferretero"')
  })

  it('agrega estado y búsqueda entre comillas', () => {
    expect(buildVendorProductQuery('Mercado Total Ferretero', { status: 'ACTIVE', search: ' destornillador ' })).toBe(
      'vendor:"Mercado Total Ferretero" status:active "destornillador"'
    )
  })

  it('no permite escapar del filtro con la búsqueda', () => {
    const query = buildVendorProductQuery('Mercado Total Ferretero', { search: 'x" OR vendor:"Aldevaram' })
    expect(query).toBe('vendor:"Mercado Total Ferretero" "x\\" OR vendor:\\"Aldevaram"')
  })

  it('escapa barras invertidas', () => {
    expect(quoteSearchValue('a\\"b')).toBe('"a\\\\\\"b"')
  })

  it('ignora búsquedas vacías', () => {
    expect(buildVendorProductQuery('A', { search: '   ' })).toBe('vendor:"A"')
  })
})
