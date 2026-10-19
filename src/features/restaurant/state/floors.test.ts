import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionStore } from './sessionStore.ts'
import { selectActiveVisit, selectLayout } from './selectors.ts'
import { validatePlacement } from '../domain/movement.ts'
import { DomainError } from '../domain/commands.ts'
import { visitDurationMs } from '../domain/visitDuration.ts'
import { computeSessionMetrics } from '../domain/metrics.ts'

test('dos pisos tienen números repetidos e IDs únicos; las visitas sobreviven al cambio', () => {
  let time = 1000
  let id = 0
  const store = createSessionStore({ now: () => time, createId: () => `id-${++id}` })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: 'assign-1', confirmOccupied: false, discardDraft: false })
  store.getState().switchRole('waiter', 'ana')
  store.getState().openVisit({ tableId: 'table-1', guestCount: 2, commandId: 'open-1' })
  const visit = selectActiveVisit(store.getState(), 'table-1')!
  store.getState().switchRole('admin')
  store.getState().addFloor('Primer piso', 64, 2)
  const second = store.getState()
  assert.equal(second.session.id, 'id-1')
  assert.equal(second.transient.activeFloorId, 'floor-2')
  assert.equal(second.tables['floor-2-table-1'].number, 1)
  assert.equal(second.tables['floor-2-table-1'].floorId, 'floor-2')
  assert.equal(selectLayout(second, 'floor-2').tables.length, 2)
  assert.equal(selectLayout(second, 'floor-1').tables.length, 6)
  assert.equal(selectLayout(second, 'floor-2').tables.some(table => table.id === 'table-1'), false)
  assert.equal(selectActiveVisit(second, 'table-1')?.id, visit.id)
  assert.equal(computeSessionMetrics(second, time).presentGuests, 2)
  assert.equal(computeSessionMetrics(second, time, null, 'floor-1').presentGuests, 2)
  assert.equal(computeSessionMetrics(second, time, null, 'floor-2').presentGuests, 0)
  time = 61000
  assert.equal(visitDurationMs(visit, time), 60000)
  second.setActiveFloor('floor-1')
  assert.equal(store.getState().transient.activeFloorId, 'floor-1')
  assert.equal(selectActiveVisit(store.getState(), 'table-1')?.openedAt, 1000)
})

test('movimiento valida límites y colisiones solo dentro del piso', () => {
  const store = createSessionStore()
  store.getState().addFloor('Primer piso', 64, 1)
  const state = store.getState()
  const first = state.placements['table-1']
  validatePlacement(state, { tableId: 'floor-2-table-1', x: first.x, z: first.z })
  assert.throws(() => validatePlacement(state, { tableId: 'floor-2-table-1', x: 4, z: 0 }), DomainError)
})

test('cambiar de piso exige resolver borradores y no borra asignaciones', () => {
  const store = createSessionStore()
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: 'assign-1', confirmOccupied: false, discardDraft: false })
  store.getState().addFloor('Primer piso', 100, 1)
  store.getState().assignTable({ tableId: 'floor-2-table-1', waiterId: 'ana', commandId: 'assign-2', confirmOccupied: false, discardDraft: false })
  store.setState(state => ({ transient: { ...state.transient, orderDrafts: { v: { visitId: 'v', commandId: 'draft', items: [{ productId: 'p', quantity: 1, note: '' }] } } } }))
  const before = store.getState()
  assert.throws(() => before.setActiveFloor('floor-1'), (error: unknown) => error instanceof DomainError && error.code === 'UNRESOLVED_DRAFT')
  assert.equal(store.getState(), before)
  before.setActiveFloor('floor-1', true)
  assert.equal(Object.keys(store.getState().assignments).length, 2)
  assert.deepEqual(store.getState().transient.orderDrafts, {})
})

test('administración renombra y reordena pisos sin cambiar sus IDs', () => {
  const store = createSessionStore()
  store.getState().addFloor('Primer piso', 100, 1)
  store.getState().addFloor('Terraza', 64, 0)
  const terraceId = store.getState().transient.activeFloorId
  store.getState().renameFloor(terraceId, 'Azotea')
  store.getState().moveFloor(terraceId, -1)
  const state = store.getState()
  assert.equal(state.floors[terraceId].name, 'Azotea')
  assert.deepEqual(Object.values(state.floors).sort((a, b) => a.order - b.order).map(floor => floor.id), ['floor-1', terraceId, 'floor-2'])
  assert.throws(() => state.renameFloor(terraceId, 'Primer piso'), (error: unknown) => error instanceof DomainError && error.code === 'CONFLICT')
})

test('eliminar piso protege actividad, exige confirmación para historia y no reutiliza IDs', () => {
  let time = 1000
  const store = createSessionStore({ now: () => time })
  store.getState().addFloor('Primer piso', 100, 1)
  store.getState().assignTable({ tableId: 'floor-2-table-1', waiterId: 'ana', commandId: 'a1', confirmOccupied: false, discardDraft: false })
  store.getState().switchRole('waiter', 'ana')
  store.getState().openVisit({ tableId: 'floor-2-table-1', guestCount: 2, commandId: 'v1' })
  const visit = selectActiveVisit(store.getState(), 'floor-2-table-1')!
  store.getState().switchRole('admin')
  assert.throws(() => store.getState().deleteFloor('floor-2'), (error: unknown) => error instanceof DomainError && error.code === 'TABLE_OCCUPIED')
  time = 2000
  store.setState(state => ({ visits: { ...state.visits, [visit.id]: { ...visit, closedAt: time } } }))
  assert.throws(() => store.getState().deleteFloor('floor-2'), (error: unknown) => error instanceof DomainError && error.code === 'CONFIRMATION_REQUIRED')
  store.getState().deleteFloor('floor-2', true)
  const deleted = store.getState()
  assert.equal(deleted.floors['floor-2'], undefined)
  assert.equal(deleted.tables['floor-2-table-1'], undefined)
  assert.equal(deleted.visits[visit.id].floorId, 'floor-2')
  assert.equal(Object.values(deleted.assignments)[0].endedAt, 2000)
  assert.equal(deleted.transient.activeFloorId, 'floor-1')
  deleted.addFloor('Nuevo primer piso', 100, 1)
  assert.ok(store.getState().floors['floor-3'])
  assert.equal(store.getState().floors['floor-2'], undefined)
})

test('no permite eliminar el último piso ni administrar pisos fuera de administración', () => {
  const store = createSessionStore()
  assert.throws(() => store.getState().deleteFloor('floor-1'), (error: unknown) => error instanceof DomainError && error.code === 'CONFLICT')
  store.getState().switchRole('supervisor')
  const before = store.getState()
  assert.throws(() => before.addFloor('Otro', 100, 1), (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN')
  assert.throws(() => before.renameFloor('floor-1', 'PB'), (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN')
  assert.equal(store.getState(), before)
})
