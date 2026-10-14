import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/dal'
import { safeNextPath } from '@/lib/validations/auth'
import { SignInForm } from './(components)/sign-in-form'

export const metadata: Metadata = { title: 'Iniciar sesión' }

const SignInPage = async ({ searchParams }: PageProps<'/auth'>) => {
  if (await getSessionUser()) redirect('/')

  const { next } = await searchParams
  return <SignInForm next={safeNextPath(Array.isArray(next) ? next[0] : next)} />
}

export default SignInPage
