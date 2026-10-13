import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSpace, removeTable } from '../../supervisor/domain/space.ts'
import { createSessionStore } from './sessionStore.ts'
import { selectLayout, selectTable, selectPlacement, selectActiveVisit, selectAssignment } from './selectors.ts'
import { DomainError } from '../domain/commands.ts'

function fixture() {
  let id = 0
  let time = 1000
  const store = createSessionStore({ now: () => time, createId: () => `id-${++id}` })
  return { store, setTime: (value: number) => { time = value } }
}

test('initial session matches B01 geometry and has valid independent entities', () => {
  const { store } = fixture()
  const state = store.getState()
  assert.deepEqual(selectLayout(state), buildSpace(100, 6))
  assert.equal(state.session.startedAt, 1000)
  assert.equal(state.session.activeRole, 'admin')
  assert.equal(Object.keys(state.waiters).length, 3)
  for (const table of Object.values(state.tables)) {
    assert.equal(table.capacity, 4)
    assert.equal(selectPlacement(state, table.id)?.tableId, table.id)
    assert.equal(selectTable(state, table.id), table)
    assert.equal(selectActiveVisit(state, table.id), undefined)
    assert.equal(selectAssignment(state, table.id), undefined)
  }
  for (const product of Object.values(state.products)) {
    assert.ok(Number.isSafeInteger(product.unitPriceCents) && product.unitPriceCents >= 0)
    assert.equal(product.currency, 'ARS')
  }
  const second = fixture().store.getState()
  assert.notEqual(state.tables, second.tables)
  assert.notEqual(state.waiters.ana, second.waiters.ana)
  assert.deepEqual(state.products, second.products)
})

test('deletion preserves B02 positions and numbers and publishes one atomic event', () => {
  const { store } = fixture()
  const before = store.getState()
  store.getState().selectTable('table-3')
  let notifications = 0
  const unsubscribe = store.subscribe(state => {
    notifications++
    assert.equal(state.tables['table-3'], undefined)
    assert.equal(state.placements['table-3'], undefined)
    assert.equal(state.transient.selectedTableId, null)
    assert.equal(state.events.length, 1)
  })
  store.getState().deleteTable('table-3')
  unsubscribe()
  const after = store.getState()
  assert.equal(notifications, 1)
  assert.deepEqual(selectLayout(after), removeTable(selectLayout(before), 'table-3'))
  assert.equal(after.tables['table-4'].number, 4)
  assert.equal(Object.keys(before.tables).length, 6)
  assert.equal(after.events[0].sessionId, before.session.id)
  assert.deepEqual(after.events[0].payload, { tableNumber: 3 })
  after.deleteTable('table-3')
  after.deleteTable('missing')
  assert.equal(store.getState(), after)
})

test('invalid construction and selection preserve the entire state', () => {
  const { store } = fixture()
  const before = store.getState()
  for (const [area, count] of [[NaN, 2], [Infinity, 1], [4, 2], [100, 1.5], [2501, 0]]) {
    assert.throws(() => before.resetSession(area, count), (error: unknown) => error instanceof DomainError && error.code === 'INVALID_INPUT')
    assert.equal(store.getState(), before)
  }
  assert.throws(() => before.selectTable('missing'), DomainError)
  assert.equal(store.getState(), before)
})

test('reset replaces session and transient state; fresh store behaves like reload', () => {
  const { store } = fixture()
  store.getState().selectTable('table-1')
  store.getState().deleteTable('table-2')
  const id = store.getState().session.id
  store.getState().resetSession(4, 0)
  const state = store.getState()
  assert.notEqual(state.session.id, id)
  assert.deepEqual(selectLayout(state), buildSpace(4, 0))
  assert.equal(state.transient.selectedTableId, null)
  for (const collection of [state.visits, state.orders, state.assignments, state.presences, state.transient.orderDrafts]) {
    assert.deepEqual(collection, {})
  }
  assert.deepEqual(state.events, [])
  assert.deepEqual(selectLayout(fixture().store.getState()), buildSpace(100, 6))
})

test('timestamps never decrease and invalid clocks cannot mutate entities', () => {
  const { store, setTime } = fixture()
  setTime(2000)
  store.getState().deleteTable('table-1')
  setTime(500)
  store.getState().deleteTable('table-2')
  assert.deepEqual(store.getState().events.map(event => event.occurredAt), [2000, 2000])
  const before = store.getState()
  setTime(NaN)
  assert.throws(() => before.deleteTable('table-3'), DomainError)
  assert.equal(store.getState(), before)
})

test('occupied tables and forbidden roles reject mutations; history survives free deletion', () => {
  const { store } = fixture()
  // Seed future entities to check foundational guards without exposing unfinished actions.
  store.setState({ visits: { v1: {
    id: 'v1', tableId: 'table-1', tableNumber: 1, guestCount: 1,
    customerIds: ['customer-1'], openedAt: 1000, closedAt: null,
  } } })
  const occupied = store.getState()
  assert.throws(() => occupied.deleteTable('table-1'), (error: unknown) => error instanceof DomainError && error.code === 'TABLE_OCCUPIED')
  assert.equal(store.getState(), occupied)
  store.setState({ session: { ...occupied.session, activeRole: 'waiter', activeWaiterId: 'ana' } })
  const forbidden = store.getState()
  assert.throws(() => forbidden.deleteTable('table-2'), DomainError)
  assert.throws(() => forbidden.resetSession(100, 1), DomainError)
  assert.equal(store.getState(), forbidden)
  store.setState({
    session: occupied.session,
    visits: { v1: { ...occupied.visits.v1, closedAt: 1000 } },
    assignments: { a1: { id: 'a1', tableId: 'table-1', waiterId: 'ana', startedAt: 1000, endedAt: null } },
    presences: { ana: { waiterId: 'ana', attendingTableId: 'table-1', lastAttendedAt: 1000, snapshotOnly: true } },
  })
  store.getState().deleteTable('table-1')
  const deleted = store.getState()
  assert.equal(deleted.visits.v1.tableNumber, 1)
  assert.equal(deleted.assignments.a1.endedAt, 1000)
  assert.equal(deleted.presences.ana.attendingTableId, null)
  deleted.resetSession(100, 6)
  assert.deepEqual(store.getState().visits, {})
  assert.deepEqual(store.getState().assignments, {})
  assert.deepEqual(store.getState().presences, {})
})
