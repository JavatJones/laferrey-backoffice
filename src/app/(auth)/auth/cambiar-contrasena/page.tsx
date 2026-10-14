import type { Metadata } from 'next'
import { getMustChangePassword, requireUser } from '@/lib/auth/dal'
import { ChangePasswordForm } from '../(components)/change-password-form'
import { SignOutButton } from '../(components)/sign-out-button'

export const metadata: Metadata = { title: 'Cambiar contraseña' }

const ChangePasswordPage = async () => {
  const user = await requireUser()
  const required = await getMustChangePassword(user.id)

  return (
    <div className='flex flex-col gap-4'>
      <ChangePasswordForm email={user.email} required={required} />
      <SignOutButton className='w-full' />
    </div>
  )
}

export default ChangePasswordPage
