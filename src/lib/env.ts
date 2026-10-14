import 'server-only'
import { z } from 'zod'

// Las variables se validan por grupo y al primer uso: un script que no habla con
// Shopify no debe fallar porque falten las credenciales de Shopify.

const DEFAULT_PUBLICATION_IDS = 'gid://shopify/Publication/186569490525'

const required = (name: string) => z.string({ error: `Falta ${name}` }).trim().min(1, `Falta ${name}`)

const flag = z.stringbool().default(false)

const shopifySchema = z.object({
  SHOPIFY_STORE_DOMAIN: required('SHOPIFY_STORE_DOMAIN').transform((domain) =>
    // Acepta "mi-tienda.myshopify.com" o "https://mi-tienda.myshopify.com/".
    domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  ),
  SHOPIFY_API_KEY: required('SHOPIFY_API_KEY'),
  SHOPIFY_API_SECRET: required('SHOPIFY_API_SECRET'),
  SHOPIFY_PUBLICATION_IDS: z
    .string()
    .default(DEFAULT_PUBLICATION_IDS)
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
    .pipe(
      z
        .array(z.string().regex(/^gid:\/\/shopify\/Publication\/\d+$/, 'GID de publicación inválido'))
        .min(1, 'Define al menos un canal en SHOPIFY_PUBLICATION_IDS')
    ),
  SHOPIFY_FULFILLMENT_SYNC: flag,
})

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: 'NEXT_PUBLIC_SUPABASE_URL debe ser una URL' }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
})

const supabaseAdminSchema = supabaseSchema.extend({
  SUPABASE_SECRET_KEY: required('SUPABASE_SECRET_KEY'),
})

const appSchema = z.object({
  INCLUDE_TEST_ORDERS: flag,
})

// Correo saliente por SMTP (Gmail con contraseña de aplicación en producción; el buzón
// local de Supabase, Mailpit, en desarrollo).
const emailSchema = z
  .object({
    SMTP_HOST: z.string().trim().min(1).default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
    SMTP_SECURE: z.stringbool().optional(),
    SMTP_USER: z.string().trim().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().trim().optional(),
  })
  .refine((env) => env.EMAIL_FROM || env.SMTP_USER, {
    message: 'Define EMAIL_FROM o SMTP_USER (el remitente de los correos)',
  })

const pickupSchema = z.object({
  PICKUP_CODE_SECRET: required('PICKUP_CODE_SECRET').min(32, 'PICKUP_CODE_SECRET debe tener al menos 32 caracteres'),
})

const cronSchema = z.object({
  CRON_SECRET: required('CRON_SECRET').min(32, 'CRON_SECRET debe tener al menos 32 caracteres'),
})

export class EnvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvError'
  }
}

const parse = <T extends z.ZodType>(schema: T, group: string): z.output<T> => {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    throw new EnvError(`Configuración inválida (${group}):\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

const memo = <T>(load: () => T) => {
  let value: T | undefined
  return () => (value ??= load())
}

export const getShopifyEnv = memo(() => {
  const env = parse(shopifySchema, 'Shopify')
  return {
    storeDomain: env.SHOPIFY_STORE_DOMAIN,
    clientId: env.SHOPIFY_API_KEY,
    clientSecret: env.SHOPIFY_API_SECRET,
    publicationIds: env.SHOPIFY_PUBLICATION_IDS,
    fulfillmentSync: env.SHOPIFY_FULFILLMENT_SYNC,
  }
})

export const getSupabaseEnv = memo(() => {
  const env = parse(supabaseSchema, 'Supabase')
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }
})

export const getSupabaseAdminEnv = memo(() => {
  const env = parse(supabaseAdminSchema, 'Supabase admin')
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY }
})

export const getAppEnv = memo(() => {
  const env = parse(appSchema, 'App')
  return { includeTestOrders: env.INCLUDE_TEST_ORDERS }
})

export const getCronSecret = memo(() => parse(cronSchema, 'Cron').CRON_SECRET)

export const getEmailEnv = memo(() => {
  const env = parse(emailSchema, 'Correo')
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // 465 usa TLS directo; 587 y el buzón local usan STARTTLS o texto plano.
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : undefined,
    // Gmail solo permite enviar como la cuenta autenticada (o un alias verificado). Si
    // EMAIL_FROM trae solo un nombre ("La Ferrey"), se usa con la cuenta de SMTP_USER.
    from: !env.EMAIL_FROM
      ? `LaFerrey <${env.SMTP_USER}>`
      : env.EMAIL_FROM.includes('@')
        ? env.EMAIL_FROM
        : `"${env.EMAIL_FROM.replace(/"/g, '')}" <${env.SMTP_USER}>`,
  }
})

export const getPickupCodeSecret = memo(() => parse(pickupSchema, 'Código de recogida').PICKUP_CODE_SECRET)
