'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { signOut } from '@/app/(auth)/auth/actions'

const initialsOf = (email: string | null) => (email ? email.slice(0, 2).toUpperCase() : 'LF')

export const NavUser = ({ email, storeName }: { email: string | null; storeName: string }) => {
  const { isMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size='lg' className='data-popup-open:bg-sidebar-accent' aria-label='Menú de la cuenta' />
            }
          >
            <Avatar className='size-8 rounded-lg'>
              <AvatarFallback className='rounded-lg'>{initialsOf(email)}</AvatarFallback>
            </Avatar>
            <span className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>{storeName}</span>
              <span className='truncate text-xs text-muted-foreground'>{email}</span>
            </span>
            <ChevronsUpDown className='ml-auto size-4' aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className='flex flex-col gap-0.5 font-normal'>
                <span className='text-xs text-muted-foreground'>Sesión iniciada como</span>
                <span className='truncate text-sm font-medium text-foreground'>{email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href='/auth/cambiar-contrasena' />}>
                <KeyRound aria-hidden />
                Cambiar contraseña
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPending}
                onClick={() => startTransition(() => signOut())}
              >
                <LogOut aria-hidden />
                {isPending ? 'Saliendo…' : 'Salir'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
