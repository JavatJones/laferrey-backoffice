'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { CircleAlert, CircleCheck, IdCard, KeyRound } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { deliverPickupWithCode, deliverPickupWithId } from '@/app/(dashboard)/[hardware_store]/ordenes/actions'

type Props = {
  slug: string
  orderId: string
  orderName: string
  customerName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Escribe los 6 dígitos del código') })

const idSchema = z.object({
  idChecked: z.boolean().refine((value) => value, 'Confirma que revisaste una identificación oficial'),
  reason: z.string().trim().min(10, 'Explica el motivo (al menos 10 caracteres)').max(500, 'Máximo 500 caracteres'),
})

// RN-27: Entregado exige el código que le llegó al cliente o, como excepción, una
// identificación oficial y un motivo que quedan en el historial.
export const DeliverPickupDialog = ({ slug, orderId, orderName, customerName, open, onOpenChange }: Props) => {
  const [mode, setMode] = useState<'code' | 'id'>('code')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const codeForm = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const idForm = useForm<z.infer<typeof idSchema>>({
    resolver: zodResolver(idSchema),
    defaultValues: { idChecked: false, reason: '' },
  })

  const close = (next: boolean) => {
    if (isPending) return
    onOpenChange(next)
    if (!next) {
      setMode('code')
      setError(null)
      codeForm.reset()
      idForm.reset()
    }
  }

  const done = (label: string, pushFailed: boolean) => {
    toast.add({ type: 'success', title: `${orderName}: ${label}` })
    if (pushFailed) {
      toast.add({ type: 'warning', title: 'No se reflejó en Shopify', description: 'Puedes reintentar desde el detalle.' })
    }
    close(false)
  }

  const submitCode = codeForm.handleSubmit(({ code }) => {
    setError(null)
    startTransition(async () => {
      const result = await deliverPickupWithCode({ slug, orderId, code })
      if (result.ok) return done(result.label, result.push?.status === 'failed')
      setError(result.error)
      codeForm.reset({ code: '' })
    })
  })

  const submitId = idForm.handleSubmit(({ reason }) => {
    setError(null)
    startTransition(async () => {
      const result = await deliverPickupWithId({ slug, orderId, idChecked: true, reason })
      if (result.ok) return done(result.label, result.push?.status === 'failed')
      setError(result.error)
    })
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Entregar {orderName}</DialogTitle>
          <DialogDescription>
            {mode === 'code'
              ? `Pide ${customerName ? `a ${customerName}` : 'al cliente'} el código de 6 dígitos que le llegó por correo.`
              : 'Solo si el cliente no puede darte el código. Queda registrado para que LaFerrey lo revise.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant='destructive'>
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === 'code' ? (
          <form id='deliver-code' onSubmit={submitCode} noValidate>
            <Controller
              name='code'
              control={codeForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='items-center'>
                  <FieldLabel htmlFor='pickup-code' className='sr-only'>
                    Código de recogida
                  </FieldLabel>
                  <InputOTP
                    id='pickup-code'
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    autoFocus
                    disabled={isPending}
                    value={field.value}
                    onChange={field.onChange}
                    onComplete={() => submitCode()}
                    aria-invalid={fieldState.invalid || undefined}
                  >
                    <InputOTPGroup className='*:data-[slot=input-otp-slot]:size-12 *:data-[slot=input-otp-slot]:text-xl'>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup className='*:data-[slot=input-otp-slot]:size-12 *:data-[slot=input-otp-slot]:text-xl'>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </form>
        ) : (
          <form id='deliver-id' onSubmit={submitId} noValidate>
            <FieldGroup>
              <Controller
                name='idChecked'
                control={idForm.control}
                render={({ field, fieldState }) => (
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <Checkbox
                      id='pickup-id-checked'
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={isPending}
                      aria-invalid={fieldState.invalid || undefined}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor='pickup-id-checked'>
                        Revisé una identificación oficial y el nombre coincide con {customerName ?? 'el de la orden'}
                      </FieldLabel>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                name='reason'
                control={idForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='pickup-id-reason'>Motivo</FieldLabel>
                    <Textarea
                      id='pickup-id-reason'
                      rows={3}
                      placeholder='Ej. No tiene acceso a su correo; presentó INE.'
                      disabled={isPending}
                      aria-invalid={fieldState.invalid || undefined}
                      {...field}
                    />
                    <FieldDescription>LaFerrey verá este motivo.</FieldDescription>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        )}

        <DialogFooter className='sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            disabled={isPending}
            onClick={() => {
              setError(null)
              setMode(mode === 'code' ? 'id' : 'code')
            }}
          >
            {mode === 'code' ? <IdCard data-icon='inline-start' /> : <KeyRound data-icon='inline-start' />}
            {mode === 'code' ? 'No tiene el código' : 'Usar el código'}
          </Button>
          <Button type='submit' form={mode === 'code' ? 'deliver-code' : 'deliver-id'} disabled={isPending}>
            {isPending ? <Spinner data-icon='inline-start' /> : <CircleCheck data-icon='inline-start' />}
            {mode === 'code' ? 'Verificar y entregar' : 'Entregar sin código'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
