import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionStore } from '../state/sessionStore.ts'
import { selectAssignment } from '../state/selectors.ts'
import { can } from './permissions.ts'
import { DomainError } from './commands.ts'

function fixture() {
  let id = 0
  let time = 100
  const store = createSessionStore({ createId: () => `id-${++id}`, now: () => time })
  const assign = (waiterId: string | null, tableId = 'table-1') => store.getState().assignTable({
    tableId, waiterId, commandId: `command-${++id}`, confirmOccupied: false, discardDraft: false,
  })
  return { store, assign, setTime: (value: number) => { time = value } }
}

test('assignment intervals are unique per table; same waiter and unassigned repeats are no-ops', () => {
  const { store, assign, setTime } = fixture()
  assign('ana')
  assign('ana', 'table-2')
  const before = store.getState()
  assign('ana')
  assert.equal(store.getState(), before)
  const first = selectAssignment(before, 'table-1')!
  setTime(200)
  assign('bruno')
  assert.equal(store.getState().assignments[first.id].endedAt, 200)
  assert.equal(selectAssignment(store.getState(), 'table-1')?.startedAt, 200)
  assert.equal(selectAssignment(store.getState(), 'table-2')?.waiterId, 'ana')
  assign(null)
  assert.equal(selectAssignment(store.getState(), 'table-1'), undefined)
  const after = store.getState()
  assign(null)
  assert.equal(store.getState(), after)
  assert.equal(after.events.length, 4)
})

test('permission, invalid waiter, missing table and command conflicts preserve state', () => {
  const { store, assign } = fixture()
  assign('ana')
  store.setState({ waiters: { ...store.getState().waiters, carla: { ...store.getState().waiters.carla, active: false } } })
  const before = store.getState()
  for (const waiter of ['missing', 'carla', 'toString']) assert.throws(() => assign(waiter), DomainError)
  assert.throws(() => assign('bruno', 'missing'), DomainError)
  assert.equal(store.getState(), before)
  const event = before.events[0]
  before.assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: event.commandId, confirmOccupied: false, discardDraft: false })
  assert.equal(store.getState(), before)
  assert.throws(() => before.assignTable({ tableId: 'table-1', waiterId: 'bruno', commandId: event.commandId, confirmOccupied: true, discardDraft: true }), DomainError)
  before.switchRole('waiter', 'ana')
  const denied = store.getState()
  assert.throws(() => assign('bruno'), DomainError)
  assert.equal(store.getState(), denied)
  denied.switchRole('supervisor')
  assign('bruno')
  assert.equal(selectAssignment(store.getState(), 'table-1')?.waiterId, 'bruno')
})

test('occupied reassignment requires replacement, confirmation and explicit draft discard', () => {
  const { store, assign } = fixture()
  assign('ana')
  store.setState({
    visits: { v1: { id: 'v1', tableId: 'table-1', tableNumber: 1, guestCount: 2, customerIds: ['c1', 'c2'], openedAt: 100, closedAt: null } },
    orders: { o1: { id: 'o1', commandId: 'order1', visitId: 'v1', tableId: 'table-1', actorId: 'admin', waiterIdAtConfirmation: 'ana', items: [], status: 'confirmed', confirmedAt: 100, deliveredAt: null } },
    presences: { ana: { waiterId: 'ana', attendingTableId: 'table-1', lastAttendedAt: 100, snapshotOnly: true } },
    transient: { ...store.getState().transient, orderDrafts: {
      v1: { visitId: 'v1', commandId: 'draft1', items: [{ productId: 'coffee', quantity: 1, note: '' }] },
      other: { visitId: 'other', commandId: 'draft2', items: [] },
    } },
  })
  const before = store.getState()
  const command = { tableId: 'table-1', waiterId: 'bruno', commandId: 'reassign', confirmOccupied: false, discardDraft: false }
  assert.throws(() => assign(null), DomainError)
  assert.throws(() => before.assignTable(command), DomainError)
  assert.throws(() => before.assignTable({ ...command, confirmOccupied: true }), DomainError)
  assert.equal(store.getState(), before)
  let notifications = 0
  const unsubscribe = store.subscribe(state => {
    notifications++
    assert.equal(selectAssignment(state, 'table-1')?.waiterId, 'bruno')
    assert.equal(state.presences.ana.attendingTableId, null)
    assert.equal(state.transient.orderDrafts.v1, undefined)
  })
  before.assignTable({ ...command, confirmOccupied: true, discardDraft: true })
  unsubscribe()
  const after = store.getState()
  assert.equal(notifications, 1)
  assert.equal(after.orders, before.orders)
  assert.equal(after.visits, before.visits)
  assert.equal(after.transient.orderDrafts.other, before.transient.orderDrafts.other)
  assert.equal(after.events.at(-1)?.actorId, 'admin')
  assert.equal(after.events.at(-1)?.payload.waiterId, 'bruno')
  assert.equal(after.orders.o1.waiterIdAtConfirmation, 'ana')
  after.switchRole('waiter', 'ana')
  assert.equal(can(store.getState(), 'viewDetails', 'table-1'), false)
  store.getState().switchRole('waiter', 'bruno')
  assert.equal(can(store.getState(), 'viewDetails', 'table-1'), true)
})

test('reassignment preserves presence at a different table and retry cannot undo later assignment', () => {
  const { store, assign } = fixture()
  assign('ana')
  const commandId = store.getState().events[0].commandId
  store.setState({ presences: { ana: { waiterId: 'ana', attendingTableId: 'table-2', lastAttendedAt: 100, snapshotOnly: false } } })
  assign('bruno')
  const before = store.getState()
  before.assignTable({ tableId: 'table-1', waiterId: 'ana', commandId, confirmOccupied: false, discardDraft: false })
  assert.equal(store.getState(), before)
  assert.equal(before.presences.ana.attendingTableId, 'table-2')
})
