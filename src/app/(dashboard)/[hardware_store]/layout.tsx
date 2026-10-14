import { cookies } from 'next/headers'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { requireStoreAccess } from '@/lib/auth/dal'
import { AppSidebar } from '../(components)/layout/app-sidebar'
import { SiteHeader } from '../(components)/layout/site-header'

// El layout pide la ferretería para el shell, pero no protege nada por sí solo:
// cada página vuelve a llamar a requireStoreAccess (el layout no se re-ejecuta al navegar).
const HardwareStoreLayout = async ({ children, params }: LayoutProps<'/[hardware_store]'>) => {
  const { hardware_store } = await params
  const { user, store } = await requireStoreAccess(hardware_store)
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar store={{ slug: store.slug, name: store.name }} user={{ email: user.email }} />
      <SidebarInset className='min-w-0 bg-background'>
        <SiteHeader storeName={store.name} />
        <div className='flex flex-1 flex-col'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default HardwareStoreLayout
