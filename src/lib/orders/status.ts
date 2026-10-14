import type { StatusTone } from '@/lib/shopify/format'
import type { Database } from '@/lib/supabase/database.types'

export type PreparationStatus = Database['public']['Enums']['preparation_status']
export type DeliveryMethod = Database['public']['Enums']['delivery_method']

export const PREPARATION_STATUSES = [
  'preparing',
  'ready_for_pickup',
  'ready_to_ship',
  'completed',
  'cancelled',
] as const satisfies readonly PreparationStatus[]

export const DELIVERY_METHODS = [
  'pickup',
  'shipping',
  'local_delivery',
  'pickup_point',
  'retail',
  'none',
] as const satisfies readonly DeliveryMethod[]

// Para las reglas y la interfaz, pickup es "pickup" y envío es todo lo demás.
export type DeliveryKind = 'pickup' | 'shipping'

export const deliveryKind = (method: DeliveryMethod): DeliveryKind => (method === 'pickup' ? 'pickup' : 'shipping')

// RN-19: cambios que hace la ferretería desde el panel. Debe coincidir con el trigger
// private.guard_store_order_status(); status.test.ts y la prueba pgTAP
// 04_transition_matrix lo comprueban.
const PANEL_TRANSITIONS: { from: PreparationStatus; to: PreparationStatus; kind: DeliveryKind | 'any' }[] = [
  { from: 'preparing', to: 'ready_for_pickup', kind: 'pickup' },
  { from: 'preparing', to: 'ready_to_ship', kind: 'shipping' },
  { from: 'ready_for_pickup', to: 'preparing', kind: 'any' },
  { from: 'ready_to_ship', to: 'preparing', kind: 'any' },
  { from: 'ready_for_pickup', to: 'completed', kind: 'pickup' },
]

export const canPanelTransition = (from: PreparationStatus, to: PreparationStatus, method: DeliveryMethod) =>
  PANEL_TRANSITIONS.some(
    (transition) =>
      transition.from === from &&
      transition.to === to &&
      (transition.kind === 'any' || transition.kind === deliveryKind(method))
  )

export const panelTransitionsFrom = (from: PreparationStatus, method: DeliveryMethod) =>
  PREPARATION_STATUSES.filter((to) => canPanelTransition(from, to, method))

// RN-21
export const isFinalStatus = (status: PreparationStatus) => status === 'completed' || status === 'cancelled'

export const statusLabel = (status: PreparationStatus, method: DeliveryMethod) => {
  switch (status) {
    case 'preparing':
      return 'Preparando'
    case 'ready_for_pickup':
      return 'Listo para recoger'
    case 'ready_to_ship':
      return 'Listo para enviar'
    case 'completed':
      return deliveryKind(method) === 'pickup' ? 'Entregado' : 'Enviado'
    case 'cancelled':
      return 'Cancelado'
  }
}

export const statusTone = (status: PreparationStatus): StatusTone => {
  switch (status) {
    case 'preparing':
      return 'warning'
    case 'ready_for_pickup':
    case 'ready_to_ship':
      return 'info'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
  }
}

// Texto corto para la acción rápida de la lista.
export const quickTransitionLabel = (to: PreparationStatus, method: DeliveryMethod) =>
  to === 'preparing' ? 'Preparando' : statusLabel(to, method)

// Texto del botón que lleva a `to`.
export const transitionLabel = (to: PreparationStatus, method: DeliveryMethod) => {
  switch (to) {
    case 'ready_for_pickup':
      return 'Marcar listo para recoger'
    case 'ready_to_ship':
      return 'Marcar listo para enviar'
    case 'preparing':
      return 'Regresar a preparando'
    case 'completed':
      return deliveryKind(method) === 'pickup' ? 'Marcar entregado' : 'Marcar enviado'
    case 'cancelled':
      return 'Cancelar'
  }
}

export const deliveryLabel = (method: DeliveryMethod) => (deliveryKind(method) === 'pickup' ? 'Pickup' : 'Envío')

// Pasos de la línea de progreso según el método de entrega.
export const progressSteps = (method: DeliveryMethod): PreparationStatus[] =>
  deliveryKind(method) === 'pickup'
    ? ['preparing', 'ready_for_pickup', 'completed']
    : ['preparing', 'ready_to_ship', 'completed']
