import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PREPARATION_STATUSES,
  canPanelTransition,
  isFinalStatus,
  panelTransitionsFrom,
  statusLabel,
  type DeliveryMethod,
} from './status'

// Métodos con los que la prueba pgTAP ejercita el trigger.
const MATRIX_METHODS: DeliveryMethod[] = ['pickup', 'shipping', 'local_delivery']

const buildTransitionMatrix = () =>
  MATRIX_METHODS.flatMap((method) =>
    PREPARATION_STATUSES.flatMap((from) =>
      PREPARATION_STATUSES.filter((to) => to !== from).map(
        (to) => `('${from}', '${to}', '${method}', ${canPanelTransition(from, to, method)})`
      )
    )
  )

const readSqlMatrix = () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/tests/database/04_transition_matrix.test.sql'),
    'utf8'
  )
  const block = sql.split('-- BEGIN MATRIX')[1]?.split('-- END MATRIX')[0] ?? ''
  return block
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((line) => line.startsWith("('"))
}

describe('máquina de estados (RN-19)', () => {
  it('coincide con la matriz que la prueba pgTAP verifica contra el trigger', () => {
    expect(readSqlMatrix().sort()).toEqual(buildTransitionMatrix().sort())
  })

  it('pickup: preparando → listo para recoger → entregado', () => {
    expect(panelTransitionsFrom('preparing', 'pickup')).toEqual(['ready_for_pickup'])
    expect(panelTransitionsFrom('ready_for_pickup', 'pickup')).toEqual(['preparing', 'completed'])
  })

  it('envío: preparando → listo para enviar; Enviado lo marca LaFerrey', () => {
    expect(panelTransitionsFrom('preparing', 'shipping')).toEqual(['ready_to_ship'])
    expect(panelTransitionsFrom('ready_to_ship', 'local_delivery')).toEqual(['preparing'])
  })

  it('Completado y Cancelado son finales (RN-21)', () => {
    for (const method of MATRIX_METHODS) {
      expect(panelTransitionsFrom('completed', method)).toEqual([])
      expect(panelTransitionsFrom('cancelled', method)).toEqual([])
    }
    expect(isFinalStatus('completed')).toBe(true)
    expect(isFinalStatus('ready_to_ship')).toBe(false)
  })

  it('Completado se muestra como Entregado o Enviado', () => {
    expect(statusLabel('completed', 'pickup')).toBe('Entregado')
    expect(statusLabel('completed', 'shipping')).toBe('Enviado')
  })
})
