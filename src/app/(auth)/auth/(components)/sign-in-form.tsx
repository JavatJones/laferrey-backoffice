'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { signInSchema } from '@/lib/validations/auth'
import { signIn } from '../actions'
import { PasswordInput } from './password-input'

type FormInput = z.input<typeof signInSchema>
type FormOutput = z.output<typeof signInSchema>

export const SignInForm = ({ next }: { next: string | null }) => {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    startTransition(async () => {
      const result = await signIn(values, next)
      if (!result.ok) {
        setFormError(result.error)
        form.resetField('password')
        form.setFocus('password')
      }
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-xl'>Inicia sesión</CardTitle>
        <CardDescription>Usa la cuenta que te dio LaFerrey.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id='sign-in' onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError && (
              <Alert variant='destructive'>
                <CircleAlert />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <Controller
              name='email'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='sign-in-email'>Correo</FieldLabel>
                  <Input
                    {...field}
                    id='sign-in-email'
                    type='email'
                    inputMode='email'
                    autoComplete='username'
                    autoCapitalize='none'
                    spellCheck={false}
                    placeholder='tu@ferreteria.com'
                    aria-invalid={fieldState.invalid}
                    required
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name='password'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='sign-in-password'>Contraseña</FieldLabel>
                  <PasswordInput
                    {...field}
                    id='sign-in-password'
                    autoComplete='current-password'
                    aria-invalid={fieldState.invalid}
                    required
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type='submit' size='lg' className='w-full' disabled={isPending}>
              {isPending && <Spinner data-icon='inline-start' />}
              {isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
