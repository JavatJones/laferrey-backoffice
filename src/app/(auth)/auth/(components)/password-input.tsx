'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

type Props = Omit<React.ComponentProps<typeof InputGroupInput>, 'type'>

export const PasswordInput = (props: Props) => {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup>
      <InputGroupInput {...props} type={visible ? 'text' : 'password'} />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton
          size='icon-xs'
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
