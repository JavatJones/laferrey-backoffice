'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

type Props = {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  // Texto del botón para quitar cada valor (accesible).
  removeLabel?: (value: string) => string
}

// Lista de textos: se agregan con Enter o coma y se quitan con su botón.
export const TagsInput = ({ id, value, onChange, onBlur, placeholder, invalid, describedBy, removeLabel }: Props) => {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const additions = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part, index, all) => all.indexOf(part) === index)
      .filter((part) => !value.some((existing) => existing.toLowerCase() === part.toLowerCase()))
    if (additions.length > 0) onChange([...value, ...additions])
    setDraft('')
  }

  return (
    <div className='flex flex-col gap-2'>
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const next = event.target.value
          if (next.includes(',')) commit(next)
          else setDraft(next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(draft)
          }
          if (event.key === 'Backspace' && draft === '' && value.length > 0) onChange(value.slice(0, -1))
        }}
        onBlur={() => {
          commit(draft)
          onBlur?.()
        }}
      />
      {value.length > 0 && (
        <ul className='flex flex-wrap gap-1.5'>
          {value.map((item) => (
            <li key={item}>
              <Badge variant='secondary' className='gap-1 pr-1'>
                {item}
                <button
                  type='button'
                  className='rounded-sm p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  aria-label={removeLabel ? removeLabel(item) : `Quitar ${item}`}
                  onClick={() => onChange(value.filter((existing) => existing !== item))}
                >
                  <X className='size-3' aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
