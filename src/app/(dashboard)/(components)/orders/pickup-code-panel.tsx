'use client'

import { useTransition } from 'react'
import { CircleAlert, IdCard, Lock, MailCheck, RotateCw, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import type { PickupStatus } from '@/lib/pickup/service'
import { formatDateTime } from '@/lib/shopify/format'
import { resendPickupCode } from '@/app/(dashboard)/[hardware_store]/ordenes/actions'

type Props = { slug: string; orderId: string; status: PickupStatus | null; ready: boolean }

// Estado del código de recogida (RN-27). La ferretería ve a dónde se envió, nunca el código.
export const PickupCodePanel = ({ slug, orderId, status, ready }: Props) => {
  const [isPending, startTransition] = useTransition()

  if (status?.verifiedAt) {
    const byCode = status.verificationMethod === 'code'
    return (
      <Alert>
        {byCode ? <ShieldCheck /> : <IdCard />}
        <AlertTitle>{byCode ? 'Cliente verificado con su código' : 'Entregado sin código, con identificación'}</AlertTitle>
        <AlertDescription>
          {formatDateTime(status.verifiedAt)}
          {!byCode && status.overrideReason && <span className='mt-1 block'>Motivo: {status.overrideReason}</span>}
        </AlertDescription>
      </Alert>
    )
  }

  if (!ready) return null

  const resend = () =>
    startTransition(async () => {
      const result = await resendPickupCode({ slug, orderId })
      if (result.ok) toast.add({ type: 'success', title: 'Código reenviado', description: `Enviado a ${result.sentToMasked}.` })
      else toast.add({ type: 'error', title: 'No se reenvió el código', description: result.error })
    })

  const resendButton = (
    <Button variant='outline' size='sm' onClick={resend} disabled={isPending || (status?.sendsLeft ?? 1) === 0}>
      {isPending ? <Spinner data-icon='inline-start' /> : <RotateCw data-icon='inline-start' />}
      {status?.sentAt ? 'Reenviar código' : 'Enviar código'}
    </Button>
  )

  if (!status?.sentAt) {
    return (
      <Alert variant='destructive'>
        <CircleAlert />
        <AlertTitle>El cliente no tiene código de recogida</AlertTitle>
        <AlertDescription className='flex flex-col items-start gap-2'>
          <span>{status?.lastSendError ?? 'Aún no se envió el código al cliente.'}</span>
          {resendButton}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      {status.locked ? <Lock /> : <MailCheck />}
      <AlertTitle>
        {status.locked ? 'Código bloqueado por demasiados intentos' : `Código enviado a ${status.sentToMasked}`}
      </AlertTitle>
      <AlertDescription className='flex flex-col items-start gap-2'>
        <span>
          {status.locked
            ? 'Reenvía un código nuevo o entrega con identificación.'
            : `Enviado: ${formatDateTime(status.sentAt)} · Pídele al cliente el código al entregar.`}
          {!status.locked && status.attemptsLeft < 5 && ` Quedan ${status.attemptsLeft} intentos.`}
          {status.lastSendError && <span className='block text-destructive'>{status.lastSendError}</span>}
        </span>
        {status.sendsLeft > 0 ? resendButton : <span className='text-xs'>Ya no se pueden enviar más códigos.</span>}
      </AlertDescription>
    </Alert>
  )
}
