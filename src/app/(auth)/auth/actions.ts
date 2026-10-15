'use server'

import { redirect } from 'next/navigation'
import { CHANGE_PASSWORD_PATH, SIGN_IN_PATH, getSessionUser, getUserStore } from '@/lib/auth/dal'
import { describeSignInError } from '@/lib/auth/sign-in-error'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  changePasswordSchema,
  safeNextPath,
  signInSchema,
  type ChangePasswordValues,
  type SignInValues,
} from '@/lib/validations/auth'

export type AuthActionResult = { ok: false; error: string }

const homeFor = async () => {
  const store = await getUserStore()
  return store ? `/${store.slug}` : '/'
}

export const signIn = async (values: SignInValues, next?: string | null): Promise<AuthActionResult> => {
  const parsed = signInSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Correo o contraseña incorrectos' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) {
    // Solo el código y el estado: nunca el correo ni la contraseña en los logs.
    if (error?.code !== 'invalid_credentials') {
      console.error('[auth] signIn', { code: error?.code, status: error?.status, name: error?.name })
    }
    return { ok: false, error: describeSignInError(error ?? {}) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profile?.must_change_password ?? true) redirect(CHANGE_PASSWORD_PATH)

  redirect(safeNextPath(next) ?? (await homeFor()))
}

export const changePassword = async (values: ChangePasswordValues): Promise<AuthActionResult> => {
  const user = await getSessionUser()
  if (!user) redirect(SIGN_IN_PATH)

  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Revisa la contraseña' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    const messages: Record<string, string> = {
      same_password: 'La nueva contraseña debe ser distinta de la actual.',
      weak_password: 'La contraseña no cumple la política: al menos 10 caracteres, con letras y números.',
    }
    return { ok: false, error: messages[error.code ?? ''] ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.' }
  }

  // must_change_password no tiene política de update: solo el servidor lo cambia.
  const admin = createAdminClient()
  const { error: profileError } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)
  if (profileError) {
    return { ok: false, error: 'La contraseña cambió, pero no se pudo actualizar tu perfil. Intenta de nuevo.' }
  }

  redirect(await homeFor())
}

export const signOut = async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(SIGN_IN_PATH)
}
