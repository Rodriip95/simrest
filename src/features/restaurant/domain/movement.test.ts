import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionStore } from '../state/sessionStore.ts'
import { validatePlacement, snapCoordinate } from './movement.ts'
import { DomainError } from './commands.ts'

test('placement accepts exact boundaries and separation, rejects overlap and nonfinite coordinates', () => {
  const store = createSessionStore()
  store.getState().resetSession(100, 2)
  const state = store.getState()
  for (const [x, z] of [[4, 4], [-4, -4], [2, 0], [0, 0]]) validatePlacement(state, { tableId: 'table-1', x, z })
  for (const [x, z] of [[4.01, 0], [0, -4.01], [NaN, 0], [0, Infinity], [0, -1.5]]) {
    assert.throws(() => validatePlacement(state, { tableId: 'table-1', x, z }), DomainError)
  }
  assert.throws(() => validatePlacement(state, { tableId: 'missing', x: 0, z: 0 }), DomainError)
  assert.equal(snapCoordinate(1.26), 1.5)
  assert.equal(snapCoordinate(-1.26), -1.5)
})

test('preview never moves domain; cancel and role/selection changes discard it', () => {
  const store = createSessionStore()
  const before = store.getState()
  before.beginMove('table-1')
  store.getState().previewMove(3.26, 3.8)
  assert.deepEqual(store.getState().transient.movePreview, { tableId: 'table-1', x: 3.5, z: 4 })
  assert.equal(store.getState().placements, before.placements)
  store.getState().cancelMove()
  assert.equal(store.getState().transient.movePreview, null)
  assert.equal(store.getState().placements, before.placements)
  store.getState().beginMove('table-1')
  store.getState().selectTable('table-2')
  assert.equal(store.getState().transient.movePreview, null)
  store.getState().beginMove('table-1')
  store.getState().switchRole('supervisor')
  assert.equal(store.getState().transient.movePreview, null)
})

test('commit preserves identity, assignments, other placements and creates a single event', () => {
  const store = createSessionStore()
  const before = store.getState()
  const command = { tableId: 'table-1', x: 4, z: 4, commandId: 'move-1' }
  before.beginMove('table-1')
  store.getState().moveTable(command)
  const after = store.getState()
  assert.deepEqual(after.placements['table-1'], { tableId: 'table-1', x: 4, z: 4 })
  assert.equal(after.tables, before.tables)
  assert.equal(after.assignments, before.assignments)
  assert.equal(after.space, before.space)
  assert.equal(after.session, before.session)
  for (const id of Object.keys(before.placements).filter(id => id !== 'table-1')) assert.equal(after.placements[id], before.placements[id])
  assert.equal(after.transient.movePreview, null)
  assert.equal(after.events.length, 1)
  after.moveTable(command)
  assert.equal(store.getState(), after)
})

test('invalid, occupied and unauthorized commits preserve state and preview', () => {
  const store = createSessionStore()
  store.getState().beginMove('table-1')
  store.getState().previewMove(100, 0)
  const before = store.getState()
  assert.throws(() => before.moveTable({ tableId: 'table-1', x: 100, z: 0, commandId: 'm1' }), DomainError)
  assert.equal(store.getState(), before)
  store.setState({ visits: { v: { id: 'v', tableId: 'table-1', tableNumber: 1, guestCount: 1, customerIds: ['c'], openedAt: 0, closedAt: null } } })
  const occupied = store.getState()
  assert.throws(() => occupied.beginMove('table-1'), DomainError)
  assert.throws(() => occupied.moveTable({ tableId: 'table-1', x: 4, z: 4, commandId: 'm2' }), DomainError)
  assert.equal(store.getState(), occupied)
  occupied.switchRole('waiter', 'ana')
  const denied = store.getState()
  assert.throws(() => denied.beginMove('table-2'), DomainError)
  assert.throws(() => denied.moveTable({ tableId: 'table-2', x: 4, z: 4, commandId: 'm3' }), DomainError)
  assert.equal(store.getState(), denied)
})
