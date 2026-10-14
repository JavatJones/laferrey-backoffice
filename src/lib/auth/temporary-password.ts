import { randomInt } from 'node:crypto'

// RN-06: 8 letras y 2 números, con al menos una mayúscula y una minúscula. Sin
// caracteres que se confunden al dictarla o copiarla (I, l, O, o, 0, 1).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'

const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]

export const generateTemporaryPassword = () => {
  const chars = [
    pick(UPPER),
    pick(LOWER),
    ...Array.from({ length: 6 }, () => pick(UPPER + LOWER)),
    pick(DIGITS),
    pick(DIGITS),
  ]

  // Fisher–Yates con crypto.randomInt para que la posición de cada tipo no sea predecible.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
