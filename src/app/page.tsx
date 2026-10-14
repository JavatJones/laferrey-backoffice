import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { CHANGE_PASSWORD_PATH, getMustChangePassword, getUserStore, requireUser } from '@/lib/auth/dal'
import { SignOutButton } from './(auth)/auth/(components)/sign-out-button'

const HomePage = async () => {
  const user = await requireUser()
  if (await getMustChangePassword(user.id)) redirect(CHANGE_PASSWORD_PATH)

  const store = await getUserStore()
  if (store) redirect(`/${store.slug}`)

  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10'>
      <Logo className='text-4xl' />
      <Empty className='w-full max-w-md bg-card ring-1 ring-foreground/10'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Store />
          </EmptyMedia>
          <EmptyTitle>Sin ferretería asignada</EmptyTitle>
          <EmptyDescription>Tu cuenta no tiene una ferretería asignada. Contacta a LaFerrey.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SignOutButton />
        </EmptyContent>
      </Empty>
    </main>
  )
}

export default HomePage
