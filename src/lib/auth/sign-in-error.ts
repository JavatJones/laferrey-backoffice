// Traduce el error de signInWithPassword a un mensaje para la pantalla. Las credenciales
// inválidas usan un mensaje genérico que no revela si el correo existe; cualquier otro
// error (conexión, llaves o URL de Supabase mal configuradas, límite de intentos) se
// distingue para que no parezca una contraseña equivocada.
export type SignInFailure = { code?: string; status?: number; name?: string }

export const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos'

export const describeSignInError = (error: SignInFailure) => {
  if (error.code === 'invalid_credentials' || error.code === 'user_not_found') return INVALID_CREDENTIALS_MESSAGE
  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
  }
  if (error.code === 'email_not_confirmed') return 'Tu cuenta aún no está activada. Contacta a LaFerrey.'
  return 'No se pudo conectar con el servicio de cuentas. Intenta de nuevo; si continúa, avisa a LaFerrey.'
}
