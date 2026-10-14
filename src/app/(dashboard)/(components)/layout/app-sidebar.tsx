'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartColumn, LayoutDashboard, Package, ReceiptText, Store } from 'lucide-react'
import { Logo } from '@/components/logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'

type Props = {
  store: { slug: string; name: string }
  user: { email: string | null }
}

export const AppSidebar = ({ store, user }: Props) => {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const base = `/${store.slug}`

  const items = [
    { label: 'Resumen', href: base, icon: LayoutDashboard, exact: true },
    { label: 'Órdenes', href: `${base}/ordenes`, icon: ReceiptText },
    { label: 'Productos', href: `${base}/productos`, icon: Package },
    { label: 'Finanzas', href: `${base}/finanzas`, icon: ChartColumn },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' render={<Link href={base} />} tooltip={store.name}>
              <span className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                <Store className='size-4' aria-hidden />
              </span>
              <span className='grid flex-1 text-left leading-tight'>
                <Logo className='text-sm' />
                <span className='truncate text-xs text-muted-foreground'>{store.name}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ label, href, icon: Icon, exact }) => {
                const active = isActive(href, exact)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={
                        <Link
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => isMobile && setOpenMobile(false)}
                        />
                      }
                    >
                      <Icon aria-hidden />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={user.email} storeName={store.name} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
