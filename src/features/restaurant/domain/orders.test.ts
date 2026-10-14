import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOrderItemsFromDraft, computeTotals, isOrderConfirmedRetry, isOrderDeliveredRetry, MIN_ORDER_QUANTITY, MAX_ORDER_QUANTITY, validateOrderLine } from './orders.ts'
import { createSessionStore } from '../state/sessionStore.ts'
import { DomainError } from './commands.ts'

const createId = () => {
  let seq = 0
  return () => `id-${++seq}`
}

const now = (() => {
  let t = 0
  return () => (t += 1)
})()

test('validateOrderLine rechaza cantidad inválida y producto no disponible', () => {
  const prod = { id: 'p', name: 'P', unitPriceCents: 100, currency: 'ARS' as const, available: true }
  validateOrderLine(prod, 1, '')
  assert.throws(() => validateOrderLine(prod, 0, ''), DomainError)
  assert.throws(() => validateOrderLine(prod, 100, ''), DomainError)
  assert.throws(() => validateOrderLine(prod, 1.5, ''), DomainError)
  const unavailable = { ...prod, available: false }
  assert.throws(() => validateOrderLine(unavailable, 1, ''), DomainError)
  assert.throws(() => validateOrderLine(prod, 1, 'x'.repeat(201)), DomainError)
})

test('computeTotals suma correctamente y rechaza negativos', () => {
  const items = [
    { productId: 'a', nameSnapshot: 'A', unitPriceCents: 150000, quantity: 2, note: '', currency: 'ARS' as const },
    { productId: 'b', nameSnapshot: 'B', unitPriceCents: 100000, quantity: 1, note: '', currency: 'ARS' as const },
  ]
  const res = computeTotals(items)
  assert.equal(res.totalCents, 400000)
  assert.throws(() => computeTotals([{ ...items[0], unitPriceCents: -1 }]), DomainError)
})

test('confirmOrder crea pedido, limpia borrador y es idempotente', () => {
  const store = createSessionStore({ now, createId: createId() })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', confirmOccupied: false, discardDraft: true, commandId: 'a1' })
  store.getState().openVisit({ tableId: 'table-1', guestCount: 2, commandId: 'v1' })
  const state0 = store.getState()
  const visitId = Object.values(state0.visits).find(v => v.tableId === 'table-1')!.id
  store.getState().ensureOrderDraftForVisit(visitId)
  store.getState().ensureOrderDraft(visitId, 'coffee')
  store.getState().ensureOrderDraft(visitId, 'sandwich')
  store.getState().setOrderLineQuantity(visitId, 'sandwich', 2)
  store.getState().confirmOrder({ visitId, commandId: 'o1' })
  let s = store.getState()
  const orders = Object.values(s.orders).filter(o => o.visitId === visitId)
  assert.equal(orders.length, 1)
  assert.equal(orders[0].items.length, 2)
  assert.equal(orders[0].status, 'confirmed')
  assert.equal(s.transient.orderDrafts[visitId].items.length, 0)
  // idempotente
  store.getState().confirmOrder({ visitId, commandId: 'o1' })
  s = store.getState()
  assert.equal(Object.values(s.orders).filter(o => o.visitId === visitId).length, 1)
})

test('confirmOrder requiere permiso y no permite vacío', () => {
  const store = createSessionStore({ now, createId: createId() })
  store.getState().switchRole('waiter', 'ana')
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', confirmOccupied: false, discardDraft: true, commandId: 'a1' })
  store.getState().openVisit({ tableId: 'table-1', guestCount: 1, commandId: 'v1' })
  const v = Object.values(store.getState().visits)[0]
  assert.throws(() => store.getState().confirmOrder({ visitId: v.id, commandId: 'o2' }), DomainError) // sin borrador
})

test('deliverOrder marca entregado y es idempotente', () => {
  const store = createSessionStore({ now, createId: createId() })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', confirmOccupied: false, discardDraft: true, commandId: 'a1' })
  store.getState().openVisit({ tableId: 'table-1', guestCount: 1, commandId: 'v1' })
  const v = Object.values(store.getState().visits)[0]
  store.getState().ensureOrderDraftForVisit(v.id)
  store.getState().ensureOrderDraft(v.id, 'coffee')
  store.getState().confirmOrder({ visitId: v.id, commandId: 'o1' })
  const o = Object.values(store.getState().orders)[0]
  store.getState().deliverOrder({ orderId: o.id, commandId: 'd1' })
  let s = store.getState()
  assert.equal(s.orders[o.id].status, 'delivered')
  assert.ok(s.orders[o.id].deliveredAt !== null)
  store.getState().deliverOrder({ orderId: o.id, commandId: 'd1' })
  s = store.getState()
  assert.equal(s.orders[o.id].status, 'delivered')
})

test('isOrderConfirmedRetry detecta retry válido y rechaza otro', () => {
  const store = createSessionStore({ now, createId: createId() })
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'ana', confirmOccupied: false, discardDraft: true, commandId: 'a1' })
  store.getState().openVisit({ tableId: 'table-1', guestCount: 1, commandId: 'v1' })
  const v = Object.values(store.getState().visits)[0]
  store.getState().ensureOrderDraftForVisit(v.id)
  store.getState().ensureOrderDraft(v.id, 'coffee')
  store.getState().confirmOrder({ visitId: v.id, commandId: 'o1' })
  assert.equal(isOrderConfirmedRetry(store.getState(), 'o1', v.id), true)
  assert.equal(isOrderConfirmedRetry(store.getState(), 'nope', v.id), false)
  assert.throws(() => isOrderConfirmedRetry(store.getState(), 'o1', 'otro'), DomainError)
})
