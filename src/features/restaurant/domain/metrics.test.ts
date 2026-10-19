import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionStore } from '../state/sessionStore.ts'
import { computeSessionMetrics } from './metrics.ts'

test('calculates global and waiter metrics with current and historical attribution', () => {
  let now = 1000
  let id = 0
  const store = createSessionStore({ now: () => now, createId: () => `metric-${++id}` })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: 'a1', confirmOccupied: false, discardDraft: false })
  store.getState().assignTable({ tableId: 'table-2', waiterId: 'ana', commandId: 'a2', confirmOccupied: false, discardDraft: false })
  store.getState().openVisit({ tableId: 'table-1', guestCount: 4, commandId: 'v1' })
  now = 121000
  const visit = Object.values(store.getState().visits)[0]
  store.getState().ensureOrderDraft(visit.id, 'coffee')
  store.getState().setOrderLineQuantity(visit.id, 'coffee', 2)
  store.getState().confirmOrder({ visitId: visit.id, commandId: 'o1' })
  const global = computeSessionMetrics(store.getState(), now)
  assert.ok(Math.abs(global.occupancyPercent! - 100 / 6) < 1e-9)
  assert.equal(global.presentGuests, 4)
  assert.equal(global.assignedTables, 2)
  assert.equal(global.confirmedOrders, 1)
  assert.equal(global.averageFirstOrderWaitMs, 120000)
  assert.equal(global.pendingTables.length, 0)
  const ana = computeSessionMetrics(store.getState(), now, 'ana')
  assert.equal(ana.occupancyPercent, 50)
  assert.equal(ana.presentGuests, 4)
  assert.equal(ana.confirmedOrders, 1)

  store.getState().assignTable({ tableId: 'table-1', waiterId: 'bruno', commandId: 'reassign', confirmOccupied: true, discardDraft: true })
  assert.equal(computeSessionMetrics(store.getState(), now, 'ana').presentGuests, 0)
  assert.equal(computeSessionMetrics(store.getState(), now, 'ana').confirmedOrders, 1)
  assert.equal(computeSessionMetrics(store.getState(), now, 'bruno').presentGuests, 4)
  assert.equal(computeSessionMetrics(store.getState(), now, 'bruno').confirmedOrders, 0)
})

test('returns empty samples safely and tracks current pending waits', () => {
  const store = createSessionStore()
  assert.equal(computeSessionMetrics(store.getState(), 1000, 'ana').occupancyPercent, null)
  assert.equal(computeSessionMetrics(store.getState(), 1000).averageFirstOrderWaitMs, null)
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', commandId: 'a1', confirmOccupied: false, discardDraft: false })
  store.getState().openVisit({ tableId: 'table-1', guestCount: 1, commandId: 'v1' })
  const visit = Object.values(store.getState().visits)[0]
  const metrics = computeSessionMetrics(store.getState(), visit.openedAt + 30000, 'ana')
  assert.equal(metrics.pendingTables.length, 1)
  assert.equal(metrics.pendingTables[0].waitMs, 30000)
})
