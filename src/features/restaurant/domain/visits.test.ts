import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionStore } from '../state/sessionStore.ts'
import { selectActiveVisit } from '../state/selectors.ts'
import { DomainError } from './commands.ts'

function fixture() {
  let id = 0
  const store = createSessionStore({ now: () => 1000, createId: () => `id-${++id}` })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: 'assign', confirmOccupied: false, discardDraft: false })
  return store
}
const open = { tableId: 'table-1', guestCount: 4, commandId: 'open' }

test('visit creation is atomic, idempotent and blocks a second active visit', () => {
  const store = fixture()
  store.getState().switchRole('waiter', 'ana')
  let calls = 0
  const unsubscribe = store.subscribe(state => {
    calls++
    const visit = selectActiveVisit(state, 'table-1')!
    assert.equal(visit.guestCount, 4)
    assert.equal(visit.customerIds.length, 4)
    assert.equal(state.events.at(-1)?.payload.visitId, visit.id)
  })
  store.getState().openVisit(open)
  unsubscribe()
  assert.equal(calls, 1)
  const state = store.getState()
  const visit = selectActiveVisit(state, 'table-1')!
  assert.equal(new Set(visit.customerIds).size, 4)
  assert.equal(visit.tableNumber, 1)
  assert.equal(visit.openedAt, 1000)
  assert.equal(state.events.at(-1)?.actorId, 'ana')
  state.openVisit(open)
  assert.equal(store.getState(), state)
  assert.throws(() => state.openVisit({ ...open, commandId: 'double-click' }), DomainError)
  assert.equal(store.getState(), state)
})

test('invalid guest counts and unauthorized/unassigned/inactive responsibility cannot create visits', () => {
  const store = fixture()
  const before = store.getState()
  for (const guestCount of [0, -1, 1.5, 5, NaN, Infinity]) {
    assert.throws(() => before.openVisit({ ...open, guestCount }), DomainError)
    assert.equal(store.getState(), before)
  }
  assert.throws(() => before.openVisit({ ...open, tableId: 'table-2' }), DomainError)
  assert.throws(() => before.openVisit({ ...open, tableId: 'missing' }), DomainError)
  before.switchRole('waiter', 'bruno')
  assert.throws(() => store.getState().openVisit(open), DomainError)
  store.getState().switchRole('admin')
  store.setState({ waiters: { ...before.waiters, ana: { ...before.waiters.ana, active: false } } })
  assert.throws(() => store.getState().openVisit(open), DomainError)
})

test('capacity accepts 1–8 only when free and for admin/supervisor; current capacity governs entry', () => {
  const store = fixture()
  for (const capacity of [0, -1, 9, 1.5, NaN, Infinity]) {
    assert.throws(() => store.getState().setCapacity({ tableId: 'table-1', capacity, commandId: 'capacity' }), DomainError)
  }
  store.getState().switchRole('waiter', 'ana')
  assert.throws(() => store.getState().setCapacity({ tableId: 'table-1', capacity: 8, commandId: 'capacity' }), DomainError)
  store.getState().switchRole('supervisor')
  store.getState().setCapacity({ tableId: 'table-1', capacity: 1, commandId: 'capacity1' })
  assert.throws(() => store.getState().openVisit(open), DomainError)
  store.getState().setCapacity({ tableId: 'table-1', capacity: 8, commandId: 'capacity8' })
  store.getState().openVisit({ ...open, guestCount: 8 })
  const state = store.getState()
  assert.throws(() => state.setCapacity({ tableId: 'table-1', capacity: 4, commandId: 'capacity4' }), DomainError)
  assert.throws(() => state.deleteTable('table-1'), DomainError)
  assert.throws(() => state.beginMove('table-1'), DomainError)
  assert.equal(store.getState(), state)
})

test('corrections preserve visit time, existing customer IDs, orders and drafts', () => {
  const store = fixture()
  store.getState().openVisit({ ...open, guestCount: 2 })
  const before = store.getState()
  const visit = selectActiveVisit(before, 'table-1')!
  store.getState().updateGuestCount({ visitId: visit.id, guestCount: 4, commandId: 'grow' })
  const larger = store.getState().visits[visit.id]
  assert.deepEqual(larger.customerIds.slice(0, 2), visit.customerIds)
  assert.equal(new Set(larger.customerIds).size, 4)
  assert.equal(larger.openedAt, visit.openedAt)
  assert.equal(store.getState().orders, before.orders)
  assert.equal(store.getState().transient.orderDrafts, before.transient.orderDrafts)
  store.getState().updateGuestCount({ visitId: visit.id, guestCount: 1, commandId: 'shrink' })
  assert.deepEqual(store.getState().visits[visit.id].customerIds, visit.customerIds.slice(0, 1))
  const after = store.getState()
  after.updateGuestCount({ visitId: visit.id, guestCount: 4, commandId: 'grow' })
  assert.equal(store.getState(), after)
  for (const guestCount of [0, -1, 1.2, 5, Infinity, NaN]) {
    assert.throws(() => after.updateGuestCount({ visitId: visit.id, guestCount, commandId: 'invalid' }), DomainError)
    assert.equal(store.getState(), after)
  }
  assert.throws(() => after.updateGuestCount({ visitId: 'missing', guestCount: 1, commandId: 'missing' }), DomainError)
  after.switchRole('waiter', 'bruno')
  assert.throws(() => store.getState().updateGuestCount({ visitId: visit.id, guestCount: 2, commandId: 'foreign' }), DomainError)
})

test('closing a visit preserves history and assignment, releases presence and allows a new visit', () => {
  let time = 1000
  let id = 0
  const store = createSessionStore({ now: () => ++time, createId: () => `close-${++id}` })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: 'assign-close', confirmOccupied: false, discardDraft: false })
  store.getState().switchRole('waiter', 'ana')
  store.getState().openVisit({ tableId: 'table-1', guestCount: 2, commandId: 'open-close' })
  store.getState().selectTable('table-1')
  const visit = selectActiveVisit(store.getState(), 'table-1')!
  store.getState().closeVisit({ visitId: visit.id, commandId: 'close-visit', discardDraft: false })
  const closed = store.getState()
  assert.equal(closed.visits[visit.id].closedAt, time)
  assert.equal(closed.visits[visit.id].customerIds.length, 2)
  assert.equal(selectActiveVisit(closed, 'table-1'), undefined)
  assert.equal(closed.presences.ana.attendingTableId, null)
  assert.ok(Object.values(closed.assignments).some(item => item.tableId === 'table-1' && item.waiterId === 'ana' && item.endedAt === null))
  assert.equal(closed.events.at(-1)?.type, 'visit.closed')
  closed.closeVisit({ visitId: visit.id, commandId: 'close-visit', discardDraft: false })
  assert.equal(store.getState(), closed)
  store.getState().openVisit({ tableId: 'table-1', guestCount: 1, commandId: 'second-visit' })
  assert.notEqual(selectActiveVisit(store.getState(), 'table-1')?.id, visit.id)
})

test('closing rejects pending deliveries and requires explicit draft discard', () => {
  const store = fixture()
  store.getState().openVisit({ ...open, guestCount: 2 })
  const visit = selectActiveVisit(store.getState(), 'table-1')!
  store.getState().ensureOrderDraft(visit.id, 'coffee')
  const withDraft = store.getState()
  assert.throws(() => withDraft.closeVisit({ visitId: visit.id, commandId: 'close-draft', discardDraft: false }), (error: unknown) => error instanceof DomainError && error.code === 'UNRESOLVED_DRAFT')
  assert.equal(store.getState(), withDraft)
  store.getState().confirmOrder({ visitId: visit.id, commandId: 'confirm-close' })
  const pending = store.getState()
  assert.throws(() => pending.closeVisit({ visitId: visit.id, commandId: 'close-pending', discardDraft: true }), (error: unknown) => error instanceof DomainError && error.code === 'PENDING_ORDERS')
  assert.equal(store.getState(), pending)
  const order = Object.values(pending.orders)[0]
  pending.deliverOrder({ orderId: order.id, commandId: 'deliver-close' })
  store.getState().ensureOrderDraft(visit.id, 'sandwich')
  store.getState().closeVisit({ visitId: visit.id, commandId: 'close-final', discardDraft: true })
  assert.equal(store.getState().transient.orderDrafts[visit.id], undefined)
  assert.equal(store.getState().orders[order.id].status, 'delivered')
})

test('closing validates role, visit identity and command id without mutation', () => {
  const store = fixture()
  store.getState().openVisit(open)
  const visit = selectActiveVisit(store.getState(), 'table-1')!
  store.getState().switchRole('waiter', 'bruno')
  const before = store.getState()
  assert.throws(() => before.closeVisit({ visitId: visit.id, commandId: 'foreign-close', discardDraft: false }), DomainError)
  assert.throws(() => before.closeVisit({ visitId: 'missing', commandId: 'missing-close', discardDraft: false }), DomainError)
  assert.equal(store.getState(), before)
})
