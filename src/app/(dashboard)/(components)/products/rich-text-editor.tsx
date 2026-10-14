'use client'

import { useEffect, useRef } from 'react'
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Pilcrow, RemoveFormatting } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
  id: string
  value: string
  onChange: (html: string) => void
  onBlur: () => void
  invalid?: boolean
  labelledBy?: string
  describedBy?: string
}

const TOOLS = [
  { label: 'Negrita', icon: Bold, command: 'bold' },
  { label: 'Cursiva', icon: Italic, command: 'italic' },
  { label: 'Subtítulo', icon: Heading2, command: 'formatBlock', arg: 'h2' },
  { label: 'Párrafo', icon: Pilcrow, command: 'formatBlock', arg: 'p' },
  { label: 'Lista', icon: List, command: 'insertUnorderedList' },
  { label: 'Lista numerada', icon: ListOrdered, command: 'insertOrderedList' },
] as const

// Editor ligero: el HTML se sanea en el servidor con lista blanca antes de guardarlo,
// y el valor inicial ya viene saneado. Pegar inserta solo texto para no traer estilos
// ni código de otras páginas.
export const RichTextEditor = ({ id, value, onChange, onBlur, invalid, labelledBy, describedBy }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef<string | null>(null)

  // Solo reescribe el contenido si el valor cambió desde fuera (p. ej. al reiniciar el formulario).
  useEffect(() => {
    if (ref.current && value !== lastEmitted.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  }, [value])

  const emit = () => {
    const html = ref.current?.innerHTML ?? ''
    lastEmitted.current = html
    onChange(html)
  }

  const run = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    emit()
  }

  const addLink = () => {
    const url = window.prompt('Dirección del enlace (https://…)')
    if (!url) return
    if (!/^(https?:\/\/|mailto:)/i.test(url)) return
    run('createLink', url)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive ring-3 ring-destructive/20'
      )}
    >
      <div role='toolbar' aria-label='Formato del texto' className='flex flex-wrap items-center gap-0.5 border-b bg-muted/50 p-1'>
        {TOOLS.map(({ label, icon: Icon, command, ...rest }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              render={
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  aria-label={label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run(command, 'arg' in rest ? rest.arg : undefined)}
                />
              }
            >
              <Icon />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
        <Separator orientation='vertical' className='mx-1 data-vertical:h-5' />
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label='Agregar enlace'
          onMouseDown={(event) => event.preventDefault()}
          onClick={addLink}
        >
          <Link2 />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label='Quitar formato'
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('removeFormat')}
        >
          <RemoveFormatting />
        </Button>
      </div>
      <div
        id={id}
        ref={ref}
        role='textbox'
        aria-multiline='true'
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={onBlur}
        onPaste={(event) => {
          event.preventDefault()
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
          emit()
        }}
        className='prose-sm min-h-40 px-3 py-2 text-base outline-none md:text-sm [&_a]:underline [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-1.5 [&_ul]:list-disc'
      />
    </div>
  )
}
