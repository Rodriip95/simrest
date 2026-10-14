import { createStore } from 'zustand/vanilla'
import { buildSpace } from '../../supervisor/domain/space.ts'
import { createCatalog, createWaiters } from '../data/mocks.ts'
import { DomainError } from '../domain/commands.ts'
import type { SessionCommandContracts } from '../domain/commands.ts'
import type { OrderDraft, Role, SessionData, TransientState } from '../domain/types.ts'
import { selectActiveVisit } from './selectors.ts'
import { requirePermission } from '../domain/permissions.ts'
import { validatePlacement, snapCoordinate } from '../domain/movement.ts'
import { validateAssignment } from '../domain/assignments.ts'
import { isVisitCommandRetry, resizeCustomerIds, validateGuestCount } from '../domain/visits.ts'
import { buildOrderItemsFromDraft, ensureOrderDraft, getOrderDraft, isOrderConfirmedRetry, isOrderDeliveredRetry } from '../domain/orders.ts'

type Dependencies = { now: () => number; createId: () => string }
type SessionActions = Pick<SessionCommandContracts, 'deleteTable' | 'resetSession' | 'moveTable' | 'assignTable' | 'setCapacity' | 'openVisit' | 'updateGuestCount' | 'confirmOrder' | 'deliverOrder'> & {
  beginMove: (tableId: string) => void
  previewMove: (x: number, z: number) => void
  cancelMove: () => void
  selectTable: (tableId: string | null, discardDrafts?: boolean) => void
  switchRole: (role: Role, waiterId?: string | null, discardDrafts?: boolean) => void
  ensureOrderDraftForVisit: (visitId: string) => OrderDraft
  ensureOrderDraft: (visitId: string, productId: string) => void
  setOrderLineQuantity: (visitId: string, productId: string, quantity: number) => void
  setOrderLineNote: (visitId: string, productId: string, note: string) => void
  removeOrderLine: (visitId: string, productId: string) => void
}
export type SessionState = SessionData & { transient: TransientState } & SessionActions

const emptyTransient = (): TransientState => ({
  selectedTableId: null, movePreview: null, orderDrafts: {}, micState: 'idle',
})

export function createSessionStore(dependencies: Partial<Dependencies> = {}) {
  const now = dependencies.now ?? Date.now
  const createId = dependencies.createId ?? (() => crypto.randomUUID())
  let lastTimestamp = -Infinity
  const timestamp = () => {
    const value = now()
    if (!Number.isFinite(value)) throw new DomainError('INVALID_INPUT', 'El reloj no es válido.')
    lastTimestamp = Math.max(lastTimestamp, value)
    return lastTimestamp
  }
  const createSession = (area: number, count: number): SessionData => {
    let layout
    try {
      layout = buildSpace(area, count)
    } catch (error) {
      throw new DomainError('INVALID_INPUT', error instanceof Error ? error.message : 'Espacio inválido.')
    }
    const startedAt = timestamp()
    return {
      session: { id: createId(), startedAt, activeRole: 'admin', activeWaiterId: null },
      space: { area: layout.area, side: layout.side },
      tables: Object.fromEntries(layout.tables.map((table, index) => [table.id, { id: table.id, number: index + 1, capacity: 4 }])),
      placements: Object.fromEntries(layout.tables.map(table => [table.id, { tableId: table.id, x: table.x, z: table.z }])),
      waiters: createWaiters(), products: createCatalog(),
      assignments: {}, visits: {}, orders: {}, presences: {}, events: [],
    }
  }

  return createStore<SessionState>()((set, get) => ({
    ...createSession(100, 6),
    transient: emptyTransient(),
    setCapacity({ tableId, capacity, commandId }) {
      const state = get()
      requirePermission(state, 'setCapacity', tableId)
      if (isVisitCommandRetry(state, commandId, 'table.capacityChanged', tableId, capacity)) return
      if (selectActiveVisit(state, tableId)) throw new DomainError('TABLE_OCCUPIED', 'La capacidad solo se puede editar con la mesa libre.')
      validateGuestCount(capacity, 8)
      const table = state.tables[tableId]
      if (table.capacity === capacity) return
      const occurredAt = timestamp()
      set({
        tables: { ...state.tables, [tableId]: { ...table, capacity } },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'table.capacityChanged',
          actorId: state.session.activeRole, entityId: tableId, occurredAt, payload: { value: capacity },
        }],
      })
    },
    openVisit({ tableId, guestCount, commandId }) {
      const state = get()
      requirePermission(state, 'openVisit', tableId)
      if (isVisitCommandRetry(state, commandId, 'visit.opened', tableId, guestCount)) return
      if (selectActiveVisit(state, tableId)) throw new DomainError('TABLE_OCCUPIED', 'Esta mesa ya tiene una visita activa.')
      validateGuestCount(guestCount, state.tables[tableId].capacity)
      const occurredAt = timestamp()
      const id = createId()
      set({
        visits: { ...state.visits, [id]: {
          id, tableId, tableNumber: state.tables[tableId].number, guestCount,
          customerIds: resizeCustomerIds([], guestCount, createId), openedAt: occurredAt, closedAt: null,
        } },
        transient: { ...state.transient, movePreview: state.transient.movePreview?.tableId === tableId ? null : state.transient.movePreview },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'visit.opened',
          actorId: state.session.activeWaiterId ?? state.session.activeRole, entityId: tableId, occurredAt,
          payload: { value: guestCount, visitId: id },
        }],
      })
    },
    updateGuestCount({ visitId, guestCount, commandId }) {
      const state = get()
      if (!Object.hasOwn(state.visits, visitId)) throw new DomainError('NOT_FOUND', 'La visita no existe.')
      const visit = state.visits[visitId]
      requirePermission(state, 'updateGuestCount', visit.tableId)
      if (isVisitCommandRetry(state, commandId, 'visit.guestsChanged', visitId, guestCount)) return
      if (visit.closedAt !== null) throw new DomainError('CONFLICT', 'La visita ya finalizó.')
      validateGuestCount(guestCount, state.tables[visit.tableId].capacity)
      if (guestCount === visit.guestCount) return
      const occurredAt = timestamp()
      set({
        visits: { ...state.visits, [visitId]: { ...visit, guestCount, customerIds: resizeCustomerIds(visit.customerIds, guestCount, createId) } },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'visit.guestsChanged',
          actorId: state.session.activeWaiterId ?? state.session.activeRole, entityId: visitId, occurredAt, payload: { value: guestCount },
        }],
      })
    },
    assignTable(input) {
      const state = get()
      const change = validateAssignment(state, input)
      if (!change) return
      const { previous, visit } = change
      const occurredAt = timestamp()
      const assignments = { ...state.assignments }
      if (previous) assignments[previous.id] = { ...previous, endedAt: occurredAt }
      if (input.waiterId !== null) {
        const id = createId()
        assignments[id] = { id, tableId: input.tableId, waiterId: input.waiterId, startedAt: occurredAt, endedAt: null }
      }
      const orderDrafts = { ...state.transient.orderDrafts }
      if (visit) delete orderDrafts[visit.id]
      const presences = { ...state.presences }
      const presence = previous ? presences[previous.waiterId] : undefined
      if (presence?.attendingTableId === input.tableId) {
        presences[presence.waiterId] = { ...presence, attendingTableId: null, snapshotOnly: false }
      }
      set({
        assignments, presences,
        transient: { ...state.transient, orderDrafts },
        events: [...state.events, {
          id: createId(), commandId: input.commandId, sessionId: state.session.id, type: 'table.assigned',
          actorId: state.session.activeRole, entityId: input.tableId, occurredAt,
          payload: { previousWaiterId: previous?.waiterId ?? null, waiterId: input.waiterId },
        }],
      })
    },
    beginMove(tableId) {
      const state = get()
      requirePermission(state, 'moveTable', tableId)
      if (selectActiveVisit(state, tableId)) throw new DomainError('TABLE_OCCUPIED', 'La mesa está ocupada.')
      state.selectTable(tableId)
      set(current => ({ transient: { ...current.transient, movePreview: { ...current.placements[tableId] } } }))
    },
    previewMove(x, z) {
      const state = get()
      const preview = state.transient.movePreview
      if (!preview) return
      requirePermission(state, 'moveTable', preview.tableId)
      set({ transient: { ...state.transient, movePreview: { ...preview, x: snapCoordinate(x), z: snapCoordinate(z) } } })
    },
    cancelMove() {
      set(state => ({ transient: { ...state.transient, movePreview: null } }))
    },
    moveTable({ tableId, x, z, commandId }) {
      const state = get()
      requirePermission(state, 'moveTable', tableId)
      if (selectActiveVisit(state, tableId)) throw new DomainError('TABLE_OCCUPIED', 'La mesa está ocupada.')
      const placement = { tableId, x, z }
      validatePlacement(state, placement)
      if (!commandId.trim()) throw new DomainError('INVALID_INPUT', 'Falta el identificador de operación.')
      if (state.events.some(event => event.commandId === commandId)) return
      const occurredAt = timestamp()
      set({
        placements: { ...state.placements, [tableId]: placement },
        transient: { ...state.transient, movePreview: null, selectedTableId: null },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'table.moved',
          actorId: state.session.activeRole, entityId: tableId, occurredAt, payload: { x, z },
        }],
      })
    },
    selectTable(tableId, discardDrafts = false) {
      const state = get()
      if (tableId !== null && !Object.hasOwn(state.tables, tableId)) throw new DomainError('NOT_FOUND', 'La mesa no existe.')
      if (tableId === state.transient.selectedTableId) return
      if (!discardDrafts && Object.values(state.transient.orderDrafts).some(draft => draft.items.length > 0)) {
        throw new DomainError('UNRESOLVED_DRAFT', 'Descartá el borrador o seguí editando antes de cambiar de mesa.')
      }
      set({ transient: { ...emptyTransient(), selectedTableId: tableId } })
    },
    switchRole(role, waiterId = null, discardDrafts = false) {
      const state = get()
      if (!['admin', 'supervisor', 'waiter'].includes(role)) throw new DomainError('INVALID_INPUT', 'Rol inválido.')
      if (role === 'waiter' && (!waiterId || !Object.hasOwn(state.waiters, waiterId) || !state.waiters[waiterId].active)) {
        throw new DomainError('INVALID_INPUT', 'Elegí un mozo activo.')
      }
      const activeWaiterId = role === 'waiter' ? waiterId : null
      if (state.session.activeRole === role && state.session.activeWaiterId === activeWaiterId) return
      if (!discardDrafts && Object.values(state.transient.orderDrafts).some(draft => draft.items.length > 0)) {
        throw new DomainError('UNRESOLVED_DRAFT', 'Descartá el borrador o seguí editando antes de cambiar de rol.')
      }
      set({
        session: { ...state.session, activeRole: role, activeWaiterId },
        transient: emptyTransient(),
      })
    },
    ensureOrderDraftForVisit(visitId) {
      const state = get()
      if (!Object.hasOwn(state.visits, visitId)) throw new DomainError('NOT_FOUND', 'La visita no existe.')
      const draft = ensureOrderDraft(state.transient, visitId, createId)
      if (draft !== state.transient.orderDrafts[visitId]) {
        set({ transient: { ...state.transient, orderDrafts: { ...state.transient.orderDrafts, [visitId]: draft } } })
      }
      return draft
    },
    ensureOrderDraft(visitId, productId) {
      const state = get()
      if (!Object.hasOwn(state.products, productId)) throw new DomainError('NOT_FOUND', 'El producto no existe.')
      const product = state.products[productId]
      const draft = ensureOrderDraft(state.transient, visitId, createId)
      if (!draft.items.some(item => item.productId === productId)) {
        const updated: OrderDraft = { ...draft, items: [...draft.items, { productId, quantity: 1, note: '' }] }
        set({ transient: { ...state.transient, orderDrafts: { ...state.transient.orderDrafts, [visitId]: updated } } })
      }
      const prod = state.products[productId]
      if (prod && !prod.available) throw new DomainError('INVALID_INPUT', 'El producto no está disponible.')
    },
    setOrderLineQuantity(visitId, productId, quantity) {
      const state = get()
      const draft = getOrderDraft(state.transient, visitId)
      const product = state.products[productId]
      if (!product) throw new DomainError('NOT_FOUND', 'El producto no existe.')
      const line = draft.items.find(item => item.productId === productId)
      if (!line) throw new DomainError('NOT_FOUND', 'El producto no está en el borrador.')
      const q = Math.trunc(quantity)
      if (!Number.isInteger(q) || q < 1 || q > 99) throw new DomainError('INVALID_INPUT', 'La cantidad debe ser entre 1 y 99.')
      const updated: OrderDraft = { ...draft, items: draft.items.map(item => item.productId === productId ? { ...item, quantity: q } : item) }
      set({ transient: { ...state.transient, orderDrafts: { ...state.transient.orderDrafts, [visitId]: updated } } })
    },
    setOrderLineNote(visitId, productId, note) {
      const state = get()
      const draft = getOrderDraft(state.transient, visitId)
      const line = draft.items.find(item => item.productId === productId)
      if (!line) throw new DomainError('NOT_FOUND', 'El producto no está en el borrador.')
      if (note.length > 200) throw new DomainError('INVALID_INPUT', 'La observación no puede superar los 200 caracteres.')
      const updated: OrderDraft = { ...draft, items: draft.items.map(item => item.productId === productId ? { ...item, note } : item) }
      set({ transient: { ...state.transient, orderDrafts: { ...state.transient.orderDrafts, [visitId]: updated } } })
    },
    removeOrderLine(visitId, productId) {
      const state = get()
      const draft = getOrderDraft(state.transient, visitId)
      const updated: OrderDraft = { ...draft, items: draft.items.filter(item => item.productId !== productId) }
      set({ transient: { ...state.transient, orderDrafts: { ...state.transient.orderDrafts, [visitId]: updated } } })
    },
    deleteTable(tableId) {
      const state = get()
      // Keep repeated deletion a no-op for authorized roles, as in B02.
      if (state.session.activeRole === 'waiter') requirePermission(state, 'deleteTable', tableId)
      const table = state.tables[tableId]
      if (!table) return // Preserve B02 repeated deletion as a no-op.
      requirePermission(state, 'deleteTable', tableId)
      if (selectActiveVisit(state, tableId)) throw new DomainError('TABLE_OCCUPIED', 'La mesa está ocupada.')
      const occurredAt = timestamp()
      const tables = { ...state.tables }
      const placements = { ...state.placements }
      delete tables[tableId]
      delete placements[tableId]
      set({
        tables, placements,
        assignments: Object.fromEntries(Object.entries(state.assignments).map(([id, assignment]) => [id,
          assignment.tableId === tableId && assignment.endedAt === null ? { ...assignment, endedAt: occurredAt } : assignment,
        ])),
        presences: Object.fromEntries(Object.entries(state.presences).map(([id, presence]) => [id,
          presence.attendingTableId === tableId ? { ...presence, attendingTableId: null, snapshotOnly: false } : presence,
        ])),
        transient: {
          ...state.transient,
          selectedTableId: state.transient.selectedTableId === tableId ? null : state.transient.selectedTableId,
          movePreview: state.transient.movePreview?.tableId === tableId ? null : state.transient.movePreview,
        },
        events: [...state.events, {
          id: createId(), commandId: createId(), sessionId: state.session.id, type: 'table.deleted',
          actorId: state.session.activeRole, entityId: tableId, occurredAt, payload: { tableNumber: table.number },
        }],
      })
    },
    confirmOrder({ visitId, commandId }) {
      const state = get()
      if (!Object.hasOwn(state.visits, visitId)) throw new DomainError('NOT_FOUND', 'La visita no existe.')
      const visit = state.visits[visitId]
      if (visit.closedAt !== null) throw new DomainError('CONFLICT', 'La visita ya finalizó.')
      requirePermission(state, 'confirmOrder', visit.tableId)
      if (isOrderConfirmedRetry(state, commandId, visitId)) return
      const draft = state.transient.orderDrafts[visitId]
      if (!draft) throw new DomainError('INVALID_INPUT', 'No hay borrador para esta visita.')
      const items = buildOrderItemsFromDraft(draft, state.products)
      if (items.length === 0) throw new DomainError('INVALID_INPUT', 'El pedido no puede estar vacío.')
      const occurredAt = timestamp()
      const assignment = Object.values(state.assignments).find(a => a.tableId === visit.tableId && a.endedAt === null)
      const waiterIdAtConfirmation = assignment?.waiterId ?? state.session.activeWaiterId ?? state.session.activeRole
      const actorId = state.session.activeWaiterId ?? state.session.activeRole
      const orderId = createId()
      set({
        orders: {
          ...state.orders,
          [orderId]: {
            id: orderId,
            commandId,
            visitId,
            tableId: visit.tableId,
            actorId,
            waiterIdAtConfirmation,
            items: Object.freeze(items.map(i => ({ ...i }))),
            confirmedAt: occurredAt,
            status: 'confirmed',
            deliveredAt: null,
          },
        },
        transient: {
          ...state.transient,
          orderDrafts: { ...state.transient.orderDrafts, [visitId]: { ...draft, items: [] } },
        },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'order.confirmed',
          actorId, entityId: visitId, occurredAt, payload: { orderId, tableId: visit.tableId },
        }],
      })
    },
    deliverOrder({ orderId, commandId }) {
      const state = get()
      if (!Object.hasOwn(state.orders, orderId)) throw new DomainError('NOT_FOUND', 'El pedido no existe.')
      const order = state.orders[orderId]
      if (order.status === 'delivered') {
        if (isOrderDeliveredRetry(state, commandId, orderId)) return
        throw new DomainError('CONFLICT', 'El pedido ya fue entregado.')
      }
      const visit = state.visits[order.visitId]
      if (!visit || visit.closedAt !== null) throw new DomainError('CONFLICT', 'La visita ya finalizó.')
      requirePermission(state, 'deliverOrder', order.tableId)
      const occurredAt = timestamp()
      set({
        orders: {
          ...state.orders,
          [orderId]: { ...order, status: 'delivered', deliveredAt: occurredAt },
        },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'order.delivered',
          actorId: state.session.activeWaiterId ?? state.session.activeRole, entityId: orderId, occurredAt, payload: { visitId: order.visitId, tableId: order.tableId },
        }],
      })
    },
    resetSession(area, count) {
      requirePermission(get(), 'resetSession')
      const data = createSession(area, count)
      set({ ...data, transient: emptyTransient() })
    },
  }))
}
