import { CircleCheck, CircleDashed, CircleX, Clock, PackageCheck, Store, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  deliveryKind,
  deliveryLabel,
  statusLabel,
  statusTone,
  type DeliveryMethod,
  type PreparationStatus,
} from '@/lib/orders/status'
import { financialStatus } from '@/lib/shopify/format'
import { StatusBadge } from '../shared/status-badge'

const STATUS_ICONS = {
  preparing: Clock,
  ready_for_pickup: PackageCheck,
  ready_to_ship: PackageCheck,
  completed: CircleCheck,
  cancelled: CircleX,
} satisfies Record<PreparationStatus, unknown>

export const OrderStatusBadge = ({ status, method }: { status: PreparationStatus; method: DeliveryMethod }) => {
  return <StatusBadge label={statusLabel(status, method)} tone={statusTone(status)} icon={STATUS_ICONS[status]} />
}

// RN-17: tienda para pickup, camión para envío.
export const DeliveryBadge = ({ method }: { method: DeliveryMethod }) => {
  const Icon = deliveryKind(method) === 'pickup' ? Store : Truck
  return (
    <Badge variant='outline' className='gap-1'>
      <Icon data-icon='inline-start' aria-hidden />
      {deliveryLabel(method)}
    </Badge>
  )
}

export const PaymentBadge = ({ status }: { status: string | null }) => {
  const info = financialStatus(status)
  if (!info) return <span className='text-muted-foreground'>—</span>
  return <StatusBadge label={info.label} tone={info.tone} icon={info.tone === 'success' ? undefined : CircleDashed} />
}

// RN-18
export const TestBadge = () => (
  <Badge variant='outline' className='border-dashed text-muted-foreground'>
    Prueba
  </Badge>
)
