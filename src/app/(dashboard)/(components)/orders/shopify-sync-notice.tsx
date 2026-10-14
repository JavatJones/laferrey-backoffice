'use client'

import { useTransition } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { retryShopifySync } from '@/app/(dashboard)/[hardware_store]/ordenes/actions'

type Props = { slug: string; orderId: string; status: string | null; message: string | null }

// Resultado de reflejar el estado en Shopify (Fase 5b).
export const ShopifySyncNotice = ({ slug, orderId, status, message }: Props) => {
  const [isPending, startTransition] = useTransition()
  if (status !== 'failed' && status !== 'skipped') return null

  const retry = () =>
    startTransition(async () => {
      const result = await retryShopifySync({ slug, orderId })
      if (!result.ok) toast.add({ type: 'error', title: 'No se pudo reintentar', description: result.error })
      else if (result.push?.status === 'ok') toast.add({ type: 'success', title: 'Estado reflejado en Shopify' })
      else toast.add({ type: 'warning', title: 'Shopify aún no se actualizó', description: result.push?.message ?? undefined })
    })

  return (
    <Alert variant={status === 'failed' ? 'destructive' : 'default'}>
      <TriangleAlert />
      <AlertTitle>{status === 'failed' ? 'No se reflejó en Shopify' : 'Pendiente en Shopify'}</AlertTitle>
      <AlertDescription>{message ?? 'El estado se guardó en el panel.'}</AlertDescription>
      {status === 'failed' && (
        <AlertAction>
          <Button variant='outline' size='sm' onClick={retry} disabled={isPending}>
            {isPending ? <Spinner data-icon='inline-start' /> : <RotateCw data-icon='inline-start' />}
            Reintentar
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
