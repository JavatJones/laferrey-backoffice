import { describe, expect, it } from 'vitest'
import { generatePickupCode, hashPickupCode, maskEmail, normalizePickupCode, pickupCodeMatches } from './code'

const SECRET = 'x'.repeat(32)

describe('código de recogida (RN-27)', () => {
  it('tiene 6 dígitos y varía', () => {
    const codes = Array.from({ length: 300 }, generatePickupCode)
    for (const code of codes) expect(code).toMatch(/^\d{6}$/)
    expect(new Set(codes).size).toBeGreaterThan(290)
  })

  it('verifica el código correcto y rechaza los demás', () => {
    const hash = hashPickupCode('012345', SECRET, '1001:a')
    expect(pickupCodeMatches('012345', hash, SECRET, '1001:a')).toBe(true)
    expect(pickupCodeMatches('012346', hash, SECRET, '1001:a')).toBe(false)
    expect(pickupCodeMatches('012345', hash, 'y'.repeat(32), '1001:a')).toBe(false)
  })

  it('un hash no sirve para otra orden', () => {
    const hash = hashPickupCode('012345', SECRET, '1001:a')
    expect(pickupCodeMatches('012345', hash, SECRET, '1002:a')).toBe(false)
  })

  it('normaliza lo que se teclea', () => {
    expect(normalizePickupCode(' 012-345 ')).toBe('012345')
  })

  it('enmascara el correo', () => {
    expect(maskEmail('javier.perez@gmail.com')).toBe('j***z@gmail.com')
    expect(maskEmail('ab@x.mx')).toBe('a***@x.mx')
    expect(maskEmail('sin-arroba')).toBe('***')
  })
})
