import { z } from 'zod'
import { isCalendarDate } from '@/lib/dates'
import { PREPARATION_STATUSES } from '@/lib/orders/status'

export const ORDER_TABS = ['por-preparar', 'listas', 'completadas', 'canceladas', 'todas'] as const
export type OrderTab = (typeof ORDER_TABS)[number]

export const ORDER_METHOD_FILTERS = ['pickup', 'envio'] as const
export type OrderMethodFilter = (typeof ORDER_METHOD_FILTERS)[number]

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(first, z.enum(values).optional().catch(undefined))

const calendarDate = z.preprocess(
  first,
  z
    .string()
    .refine(isCalendarDate)
    .optional()
    .catch(undefined)
)

// Filtros de /{slug}/ordenes. Un valor inválido se ignora en lugar de romper la página.
export const orderListSearchSchema = z.object({
  estado: z.preprocess(first, z.enum(ORDER_TABS).catch('por-preparar').default('por-preparar')),
  metodo: optionalEnum(ORDER_METHOD_FILTERS),
  q: z.preprocess(
    first,
    z
      .string()
      .transform((value) =>
        value
          .normalize('NFC')
          .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60)
      )
      .optional()
      .catch(undefined)
  ),
  desde: calendarDate,
  hasta: calendarDate,
  pagina: z.preprocess(first, z.coerce.number().int().min(1).max(10_000).catch(1).default(1)),
})

export type OrderListFilters = z.output<typeof orderListSearchSchema>

// IDs numéricos de Shopify (legacyResourceId) en la URL.
export const shopifyIdSchema = z.string().regex(/^\d{1,20}$/, 'ID inválido')

export const updateOrderStatusSchema = z.object({
  slug: z.string().min(1).max(100),
  orderId: shopifyIdSchema,
  to: z.enum(PREPARATION_STATUSES),
})

export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>

// RN-27: entrega de pickup.
const pickupTarget = { slug: z.string().min(1).max(100), orderId: shopifyIdSchema }

export const pickupOrderSchema = z.object(pickupTarget)

export const deliverPickupWithCodeSchema = z.object({
  ...pickupTarget,
  code: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().length(6, 'El código tiene 6 dígitos')),
})

export const deliverPickupWithIdSchema = z.object({
  ...pickupTarget,
  idChecked: z.literal(true, { error: 'Confirma que revisaste una identificación oficial' }),
  reason: z
    .string()
    .trim()
    .min(10, 'Explica el motivo (al menos 10 caracteres)')
    .max(500, 'Máximo 500 caracteres'),
})

export type DeliverPickupWithIdValues = z.input<typeof deliverPickupWithIdSchema>
