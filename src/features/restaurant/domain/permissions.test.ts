import assert from 'node:assert/strict'
import test from 'node:test'
import { can, permissionMatrix, requirePermission } from './permissions.ts'
import type { Permission } from './permissions.ts'
import type { Role } from './types.ts'
import { createSessionStore } from '../state/sessionStore.ts'
import { DomainError } from './commands.ts'

test('permission matrix covers all roles, own/foreign/unassigned tables and inactive waiters', () => {
  const store = createSessionStore()
  store.setState({ assignments: {
    a1: { id: 'a1', tableId: 'table-1', waiterId: 'ana', startedAt: 1, endedAt: null },
    a2: { id: 'a2', tableId: 'table-2', waiterId: 'bruno', startedAt: 1, endedAt: null },
  } })
  const structural: Permission[] = ['moveTable', 'deleteTable', 'setCapacity', 'assignTable']
  const service: Permission[] = ['openVisit', 'updateGuestCount', 'confirmOrder', 'deliverOrder', 'closeVisit']
  for (const role of ['admin', 'supervisor', 'waiter'] as Role[]) {
    store.getState().switchRole(role, role === 'waiter' ? 'ana' : null)
    const state = store.getState()
    assert.equal(can(state, 'resetSession'), role === 'admin')
    for (const action of structural) {
      for (const id of ['table-1', 'table-2', 'table-3']) assert.equal(can(state, action, id), role !== 'waiter')
    }
    for (const action of service) {
      assert.equal(can(state, action, 'table-1'), true)
      assert.equal(can(state, action, 'table-2'), role !== 'waiter')
      assert.equal(can(state, action, 'table-3'), false)
    }
    assert.equal(can(state, 'viewDetails', 'table-1'), true)
    assert.equal(can(state, 'viewDetails', 'table-2'), role !== 'waiter')
    for (const action of Object.keys(permissionMatrix[role]) as Permission[]) {
      if (action !== 'resetSession') assert.equal(can(state, action, 'missing'), false)
    }
  }
  const before = store.getState()
  for (const action of [...structural, ...service]) {
    assert.throws(() => requirePermission(before, action, 'table-2'), DomainError)
  }
  assert.throws(() => before.deleteTable('table-1'), DomainError)
  assert.throws(() => before.resetSession(100, 1), DomainError)
  assert.equal(store.getState(), before)
  store.setState({ waiters: { ...before.waiters, ana: { ...before.waiters.ana, active: false } } })
  assert.equal(can(store.getState(), 'openVisit', 'table-1'), false)
})

test('role changes retain confirmed entities and session identity while clearing transient state', () => {
  const store = createSessionStore()
  store.getState().deleteTable('table-6')
  store.getState().selectTable('table-1')
  const before = store.getState()
  store.setState({ transient: { ...before.transient, movePreview: { tableId: 'table-1', x: 1, z: 1 }, micState: 'listening' } })
  for (const role of ['supervisor', 'waiter', 'admin'] as Role[]) {
    store.getState().switchRole(role, role === 'waiter' ? 'bruno' : null)
    const state = store.getState()
    assert.equal(state.session.id, before.session.id)
    for (const key of ['tables', 'placements', 'orders', 'visits', 'assignments', 'events'] as const) assert.equal(state[key], before[key])
    assert.equal(state.transient.selectedTableId, null)
    assert.equal(state.transient.movePreview, null)
    assert.equal(state.transient.micState, 'idle')
  }
  store.getState().switchRole('waiter', 'ana')
  store.getState().selectTable('table-1')
  store.getState().switchRole('waiter', 'bruno')
  assert.equal(store.getState().transient.selectedTableId, null)
})

test('drafts block navigation until explicit discard; cancel preserves state', () => {
  const store = createSessionStore()
  store.getState().selectTable('table-1')
  store.setState({ transient: { ...store.getState().transient, orderDrafts: {
    v1: { visitId: 'v1', commandId: 'c1', items: [{ productId: 'coffee', quantity: 1, note: '' }] },
  } } })
  const before = store.getState()
  for (const action of [() => before.switchRole('waiter', 'ana'), () => before.selectTable('table-2'), () => before.selectTable(null)]) {
    assert.throws(action, (cause: unknown) => cause instanceof DomainError && cause.code === 'UNRESOLVED_DRAFT')
    assert.equal(store.getState(), before)
  }
  before.selectTable('table-1')
  before.switchRole('admin')
  assert.equal(store.getState(), before)
  before.switchRole('waiter', 'ana', true)
  assert.deepEqual(store.getState().transient.orderDrafts, {})
  assert.equal(store.getState().session.activeWaiterId, 'ana')
})

test('invalid role and missing or inactive waiter are rejected without mutation', () => {
  const store = createSessionStore()
  store.setState({ waiters: { ...store.getState().waiters, carla: { ...store.getState().waiters.carla, active: false } } })
  const before = store.getState()
  for (const id of [null, 'missing', 'carla', 'toString']) assert.throws(() => before.switchRole('waiter', id), DomainError)
  assert.throws(() => before.switchRole('invalid' as Role), DomainError)
  assert.equal(store.getState(), before)
})
