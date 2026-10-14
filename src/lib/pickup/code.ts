import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

// RN-27: código de 6 dígitos. Se guarda solo su HMAC con una llave del servidor, así que
// aunque la tabla se filtrara no se puede averiguar por fuerza bruta sin la llave.

export const PICKUP_CODE_LENGTH = 6
export const MAX_FAILED_ATTEMPTS = 5
export const MAX_SENDS = 5
export const RESEND_COOLDOWN_MS = 60_000

export const generatePickupCode = () => String(randomInt(0, 10 ** PICKUP_CODE_LENGTH)).padStart(PICKUP_CODE_LENGTH, '0')

export const hashPickupCode = (code: string, secret: string, scope: string) =>
  // El scope (orden y ferretería) evita que un hash sirva para otra orden.
  createHmac('sha256', secret).update(`${scope}:${code}`).digest('hex')

export const pickupCodeMatches = (code: string, expectedHash: string, secret: string, scope: string) => {
  const actual = Buffer.from(hashPickupCode(code, secret, scope), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export const normalizePickupCode = (input: string) => input.replace(/\D/g, '')

// "javier.perez@gmail.com" → "j***z@gmail.com"
export const maskEmail = (email: string) => {
  const [local, domain] = email.trim().split('@')
  if (!local || !domain) return '***'
  const visible = local.length <= 2 ? local[0] : `${local[0]}***${local.at(-1)}`
  return `${local.length <= 2 ? `${visible}***` : visible}@${domain}`
}
