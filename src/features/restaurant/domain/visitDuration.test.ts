import assert from 'node:assert/strict'
import test from 'node:test'
import { formatVisitDuration, visitDurationMs } from './visitDuration.ts'
import type { Visit } from './types.ts'

const visit: Visit = { id: 'visit-1', tableId: 'table-1', tableNumber: 1, guestCount: 4,
  customerIds: ['a', 'b', 'c', 'd'], openedAt: 1000, closedAt: null }

test('el contador avanza en la visita activa y se congela al cerrar', () => {
  assert.equal(visitDurationMs(visit, 61000), 60000)
  assert.equal(visitDurationMs({ ...visit, closedAt: 61000 }, 999000), 60000)
  assert.equal(visitDurationMs(visit, 500), 0)
})

test('muestra segundos, minutos y horas de forma compacta', () => {
  assert.equal(formatVisitDuration(0), '0 s')
  assert.equal(formatVisitDuration(59000), '59 s')
  assert.equal(formatVisitDuration(61000), '1 min 01 s')
  assert.equal(formatVisitDuration(3661000), '1 h 01 min')
})
