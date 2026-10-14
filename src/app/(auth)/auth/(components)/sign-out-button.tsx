import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '../actions'

export const SignOutButton = ({ className }: { className?: string }) => {
  return (
    <form action={signOut}>
      <Button type='submit' variant='outline' size='lg' className={className}>
        <LogOut data-icon='inline-start' />
        Salir
      </Button>
    </form>
  )
}
