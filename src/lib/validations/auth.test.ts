import { describe, expect, it } from 'vitest'
import { changePasswordSchema, safeNextPath, signInSchema } from './auth'

describe('signInSchema', () => {
  it('normaliza el correo', () => {
    expect(signInSchema.parse({ email: '  Admin@MercadoTotal.com ', password: 'x' }).email).toBe(
      'admin@mercadototal.com'
    )
  })

  it('rechaza correos inválidos', () => {
    expect(signInSchema.safeParse({ email: 'admin', password: 'x' }).success).toBe(false)
  })
})

describe('changePasswordSchema (RN-07)', () => {
  const check = (password: string, confirmPassword = password) =>
    changePasswordSchema.safeParse({ password, confirmPassword }).success

  it('exige 10 caracteres con letras y números', () => {
    expect(check('abcdefgh12')).toBe(true)
    expect(check('abcdefg12')).toBe(false)
    expect(check('abcdefghij')).toBe(false)
    expect(check('1234567890')).toBe(false)
  })

  it('exige que la confirmación coincida', () => {
    expect(check('abcdefgh12', 'abcdefgh13')).toBe(false)
  })
})

describe('safeNextPath', () => {
  it('acepta rutas internas', () => {
    expect(safeNextPath('/mercado-total-ferretero/ordenes?estado=listas')).toBe(
      '/mercado-total-ferretero/ordenes?estado=listas'
    )
  })

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', '/auth', '/auth/cambiar-contrasena', 'ordenes', '', null, 42])(
    'rechaza %s',
    (value) => {
      expect(safeNextPath(value)).toBeNull()
    }
  )
})
