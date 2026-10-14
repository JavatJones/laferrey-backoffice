'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { PRESET_LABELS } from '@/lib/finance/range'
import { RANGE_PRESETS, type RangePreset } from '@/lib/validations/finance'

type Props = { preset: RangePreset; from: string; to: string }

const items = RANGE_PRESETS.map((value) => ({ value, label: PRESET_LABELS[value] }))

export const RangePicker = ({ preset, from, to }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [custom, setCustom] = useState(preset === 'personalizado')
  const [dates, setDates] = useState({ from, to })

  const go = (query: string) => startTransition(() => router.push(`${pathname}?${query}`, { scroll: false }))

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end'>
      <Field className='sm:w-52'>
        <FieldLabel htmlFor='finance-range'>Periodo</FieldLabel>
        <Select
          items={items}
          value={custom ? 'personalizado' : preset}
          onValueChange={(value) => {
            if (!value) return
            if (value === 'personalizado') return setCustom(true)
            setCustom(false)
            go(`rango=${value}`)
          }}
        >
          <SelectTrigger id='finance-range' className='w-full'>
            <CalendarRange data-icon='inline-start' className='text-muted-foreground' />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {custom && (
        <form
          className='flex flex-wrap items-end gap-2'
          onSubmit={(event) => {
            event.preventDefault()
            go(`desde=${dates.from}&hasta=${dates.to}`)
          }}
        >
          <Field className='w-40 gap-1'>
            <FieldLabel htmlFor='finance-from'>Desde</FieldLabel>
            <Input
              id='finance-from'
              type='date'
              required
              value={dates.from}
              max={dates.to}
              onChange={(event) => setDates((value) => ({ ...value, from: event.target.value }))}
            />
          </Field>
          <Field className='w-40 gap-1'>
            <FieldLabel htmlFor='finance-to'>Hasta</FieldLabel>
            <Input
              id='finance-to'
              type='date'
              required
              value={dates.to}
              min={dates.from}
              onChange={(event) => setDates((value) => ({ ...value, to: event.target.value }))}
            />
          </Field>
          <Button type='submit' variant='secondary' size='lg' disabled={isPending}>
            {isPending && <Spinner data-icon='inline-start' />}
            Aplicar
          </Button>
        </form>
      )}
      {isPending && !custom && <Spinner className='mb-2.5' />}
    </div>
  )
}
