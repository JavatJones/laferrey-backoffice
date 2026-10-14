import { describe, expect, it } from 'vitest'
import { newPasswordSchema } from '@/lib/validations/auth'
import { generateTemporaryPassword } from './temporary-password'

describe('generateTemporaryPassword (RN-06)', () => {
  const samples = Array.from({ length: 500 }, generateTemporaryPassword)

  it('tiene 8 letras y 2 números', () => {
    for (const password of samples) {
      expect(password).toHaveLength(10)
      expect(password.replace(/[^A-Za-z]/g, '')).toHaveLength(8)
      expect(password.replace(/\D/g, '')).toHaveLength(2)
    }
  })

  it('incluye mayúscula y minúscula y evita caracteres ambiguos', () => {
    for (const password of samples) {
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).not.toMatch(/[IlOo01]/)
    }
  })

  it('cumple la política de contraseñas de RN-07', () => {
    for (const password of samples) {
      expect(newPasswordSchema.safeParse(password).success).toBe(true)
    }
  })

  it('no repite contraseñas', () => {
    expect(new Set(samples).size).toBe(samples.length)
  })
})
