import { Logo } from '@/components/logo'

const AuthLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10'>
      <div className='flex flex-col items-center gap-1 text-center'>
        <Logo className='text-4xl' />
        <p className='text-sm text-muted-foreground'>Panel de ferreterías</p>
      </div>
      <div className='w-full max-w-sm'>{children}</div>
    </main>
  )
}

export default AuthLayout
