import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionStore } from './sessionStore.ts'

test('selection moves one waiter marker, closing releases it, supervisor preserves a snapshot', () => {
  const store = createSessionStore()
  for (const tableId of ['table-1', 'table-2']) store.getState().assignTable({ tableId, waiterId: 'ana', commandId: crypto.randomUUID(), confirmOccupied: false, discardDraft: false })
  store.getState().switchRole('waiter', 'ana')
  store.getState().selectTable('table-1')
  assert.equal(store.getState().presences.ana.attendingTableId, 'table-1')
  store.getState().selectTable('table-2')
  assert.equal(Object.keys(store.getState().presences).length, 1)
  assert.equal(store.getState().presences.ana.attendingTableId, 'table-2')
  store.getState().selectTable(null)
  assert.equal(store.getState().presences.ana.attendingTableId, null)
  store.getState().selectTable('table-1')
  store.getState().switchRole('supervisor')
  assert.equal(store.getState().presences.ana.snapshotOnly, true)
  assert.equal(store.getState().presences.ana.attendingTableId, 'table-1')
  store.getState().selectTable('table-2')
  assert.equal(store.getState().presences.ana.attendingTableId, 'table-1')
  store.getState().assignTable({ tableId: 'table-1', waiterId: 'bruno', commandId: crypto.randomUUID(), confirmOccupied: false, discardDraft: false })
  assert.equal(store.getState().presences.ana.attendingTableId, null)
})

test('foreign table selection cannot start attention; reset removes presence', () => {
  const store = createSessionStore()
  store.getState().switchRole('waiter', 'ana')
  store.getState().selectTable('table-1')
  assert.equal(store.getState().presences.ana.attendingTableId, null)
  store.getState().switchRole('admin')
  store.getState().resetSession(100, 6)
  assert.deepEqual(store.getState().presences, {})
})
