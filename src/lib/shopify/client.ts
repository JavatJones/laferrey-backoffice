import 'server-only'

// Versión estable de la Admin API. Shopify publica una nueva cada trimestre.
const API_VERSION = '2026-10'

// Renovamos el token 5 minutos antes de que expire (Shopify los emite por 24 h).
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

const REQUIRED_ENV = ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET'] as const

export class ShopifyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShopifyError'
  }
}

export const getMissingShopifyEnv = () => REQUIRED_ENV.filter((name) => !process.env[name])

const getConfig = () => {
  const missing = getMissingShopifyEnv()
  if (missing.length > 0) {
    throw new ShopifyError(`Faltan variables de entorno: ${missing.join(', ')}`)
  }

  return {
    // Acepta "mi-tienda.myshopify.com" o "https://mi-tienda.myshopify.com/".
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    clientId: process.env.SHOPIFY_API_KEY!,
    clientSecret: process.env.SHOPIFY_API_SECRET!,
  }
}

type CachedToken = { value: string; expiresAt: number }

let cachedToken: CachedToken | null = null
let pendingToken: Promise<CachedToken> | null = null

const OAUTH_ERROR_HINTS: Record<string, string> = {
  app_not_installed:
    'La app no está instalada en la tienda: en dev.shopify.com publica una versión de la app con los permisos read_orders y read_products e instálala en la tienda.',
  invalid_client: 'Revisa que SHOPIFY_API_KEY y SHOPIFY_API_SECRET sean el Client ID y el Client secret de la app.',
}

// Shopify responde los errores de OAuth como JSON ({ error }) o como una página HTML
// cuyo título termina con el código, p. ej. "400 - Oauth error app_not_installed".
const describeOAuthError = (body: string) => {
  try {
    const { error } = JSON.parse(body) as { error?: string }
    if (error) return error
  } catch {}
  const title = body.match(/<title>([^<]*)<\/title>/i)?.[1]
  return title?.split(' ').at(-1) ?? body.slice(0, 200)
}

// Client credentials grant: válido para apps del Dev Dashboard instaladas en una
// tienda de la misma organización de Shopify.
const requestAccessToken = async (): Promise<CachedToken> => {
  const { storeDomain, clientId, clientSecret } = getConfig()

  const response = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const detail = describeOAuthError(await response.text())
    throw new ShopifyError(
      `No se pudo obtener el token de acceso de Shopify (${response.status}: ${detail}). ` +
        (OAUTH_ERROR_HINTS[detail] ??
          'Revisa SHOPIFY_STORE_DOMAIN, SHOPIFY_API_KEY y SHOPIFY_API_SECRET.')
    )
  }

  const { access_token, expires_in } = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  return { value: access_token, expiresAt: Date.now() + expires_in * 1000 }
}

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return cachedToken.value
  }

  // Si varias peticiones llegan a la vez, comparten la misma solicitud de token.
  pendingToken ??= requestAccessToken().finally(() => {
    pendingToken = null
  })
  cachedToken = await pendingToken
  return cachedToken.value
}

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

export const shopifyAdminQuery = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  retryOnUnauthorized = true
): Promise<T> => {
  const { storeDomain } = getConfig()
  const token = await getAccessToken()

  const response = await fetch(`https://${storeDomain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })

  // El token pudo haber sido revocado: pedimos uno nuevo una sola vez.
  if (response.status === 401 && retryOnUnauthorized) {
    cachedToken = null
    return shopifyAdminQuery<T>(query, variables, false)
  }

  if (!response.ok) {
    throw new ShopifyError(`Shopify respondió ${response.status}: ${await response.text()}`)
  }

  const { data, errors } = (await response.json()) as GraphQLResponse<T>
  const errorMessage = errors?.map((error) => error.message).join(' · ')

  if (!data) {
    throw new ShopifyError(errorMessage ?? 'Shopify no devolvió datos.')
  }

  // Errores parciales (p. ej. sin acceso a datos protegidos del cliente): los campos
  // afectados llegan en null y el resto de la respuesta se puede mostrar.
  if (errorMessage) {
    console.warn(`[shopify] Respuesta parcial: ${errorMessage}`)
  }

  return data
}
