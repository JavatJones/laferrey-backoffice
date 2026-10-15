import { describe, expect, it } from 'vitest'
import { INVALID_CREDENTIALS_MESSAGE, describeSignInError } from './sign-in-error'

describe('describeSignInError', () => {
  it('credenciales inválidas: mensaje genérico', () => {
    expect(describeSignInError({ code: 'invalid_credentials', status: 400 })).toBe(INVALID_CREDENTIALS_MESSAGE)
  })

  it('problemas de conexión o configuración no parecen contraseña equivocada', () => {
    expect(describeSignInError({ name: 'AuthRetryableFetchError', status: 0 })).toMatch(/No se pudo conectar/)
    expect(describeSignInError({ status: 401 })).toMatch(/No se pudo conectar/)
  })

  it('límite de intentos', () => {
    expect(describeSignInError({ code: 'over_request_rate_limit', status: 429 })).toMatch(/Demasiados intentos/)
  })
})
