import { productStatus } from '@/lib/shopify/format'
import { StatusBadge } from '../shared/status-badge'

// RN-12: Activo, Borrador, Archivado, No listado.
export const ProductStatusBadge = ({ status }: { status: string }) => {
  const info = productStatus(status)
  return <StatusBadge label={info.label} tone={status === 'ACTIVE' ? 'success' : status === 'UNLISTED' ? 'info' : 'neutral'} />
}
