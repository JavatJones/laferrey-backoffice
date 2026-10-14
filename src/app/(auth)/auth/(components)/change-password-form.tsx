'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { PASSWORD_MIN_LENGTH, changePasswordSchema, type ChangePasswordValues } from '@/lib/validations/auth'
import { changePassword } from '../actions'
import { PasswordInput } from './password-input'

type Props = {
  email: string | null
  required: boolean
}

export const ChangePasswordForm = ({ email, required }: Props) => {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    startTransition(async () => {
      const result = await changePassword(values)
      if (!result.ok) setFormError(result.error)
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-xl'>{required ? 'Crea tu contraseña' : 'Cambiar contraseña'}</CardTitle>
        <CardDescription>
          {required
            ? 'Entraste con una contraseña temporal. Define una nueva para usar el panel.'
            : 'Define una contraseña nueva para tu cuenta.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id='change-password' onSubmit={onSubmit} noValidate>
          {/* Ayuda a los gestores de contraseñas a asociar la nueva con la cuenta. */}
          {email && <input type='email' name='username' autoComplete='username' value={email} readOnly hidden />}
          <FieldGroup>
            {formError && (
              <Alert variant='destructive'>
                <CircleAlert />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <Controller
              name='password'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='new-password'>Contraseña nueva</FieldLabel>
                  <PasswordInput
                    {...field}
                    id='new-password'
                    autoComplete='new-password'
                    aria-invalid={fieldState.invalid}
                    aria-describedby='new-password-help'
                    required
                  />
                  <FieldDescription id='new-password-help'>
                    Al menos {PASSWORD_MIN_LENGTH} caracteres, con letras y números.
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name='confirmPassword'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='confirm-password'>Confirma la contraseña</FieldLabel>
                  <PasswordInput
                    {...field}
                    id='confirm-password'
                    autoComplete='new-password'
                    aria-invalid={fieldState.invalid}
                    required
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type='submit' size='lg' className='w-full' disabled={isPending}>
              {isPending && <Spinner data-icon='inline-start' />}
              {isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
