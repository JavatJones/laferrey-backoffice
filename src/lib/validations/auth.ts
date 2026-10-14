import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 10

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Escribe un correo válido')),
  password: z.string().min(1, 'Escribe tu contraseña').max(128, 'La contraseña es demasiado larga'),
})

export type SignInValues = z.input<typeof signInSchema>

// RN-07: al menos 10 caracteres, con letras y números. Coincide con
// password_requirements = "letters_digits" en supabase/config.toml.
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(72, 'Debe tener como máximo 72 caracteres')
  .regex(/[A-Za-zÀ-ÿ]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número')

export const changePasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type ChangePasswordValues = z.input<typeof changePasswordSchema>

// Evita redirecciones abiertas: solo rutas internas, nunca "//otro-sitio" ni de vuelta a /auth.
export const safeNextPath = (next: unknown): string | null => {
  if (typeof next !== 'string' || next.length > 512) return null
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  if (next === '/auth' || next.startsWith('/auth/') || next.startsWith('/auth?')) return null
  if (/[\u0000-\u001f]/.test(next)) return null
  return next
}
