import { createStore } from 'zustand/vanilla'
import { buildSpace } from '../../supervisor/domain/space.ts'
import { createCatalog, createWaiters } from '../data/mocks.ts'
import { DomainError } from '../domain/commands.ts'
import type { SessionCommandContracts } from '../domain/commands.ts'
import type { OrderDraft, Role, SessionData, TransientState } from '../domain/types.ts'
import { selectActiveVisit, selectAssignment } from './selectors.ts'
import { requirePermission } from '../domain/permissions.ts'
import { validatePlacement, snapCoordinate } from '../domain/movement.ts'
import { validateAssignment } from '../domain/assignments.ts'
import { isVisitCloseRetry, isVisitCommandRetry, resizeCustomerIds, validateGuestCount, validateVisitClosure } from '../domain/visits.ts'
import { buildOrderItemsFromDraft, ensureOrderDraft, getOrderDraft, isOrderConfirmedRetry, isOrderDeliveredRetry, validateOrderLine } from '../domain/orders.ts'

type Dependencies = { now: () => number; createId: () => string }
type SessionActions = Pick<SessionCommandContracts, 'deleteTable' | 'resetSession' | 'moveTable' | 'assignTable' | 'setCapacity' | 'openVisit' | 'updateGuestCount' | 'confirmOrder' | 'deliverOrder' | 'closeVisit'> & {
  addFloor: (name: string, area: number, count: number) => void
  renameFloor: (floorId: string, name: string) => void
  moveFloor: (floorId: string, direction: -1 | 1) => void
  deleteFloor: (floorId: string, confirmHistory?: boolean) => void
  setActiveFloor: (floorId: string, discardDrafts?: boolean) => void
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
  setMicState: (micState: TransientState['micState']) => void
}
export type SessionState = SessionData & { transient: TransientState } & SessionActions

const emptyTransient = (activeFloorId = 'floor-1'): TransientState => ({
  activeFloorId, selectedTableId: null, movePreview: null, orderDrafts: {}, micState: 'idle',
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
      session: { id: createId(), startedAt, nextFloorNumber: 2, activeRole: 'admin', activeWaiterId: null },
      space: { area: layout.area, side: layout.side },
      floors: { 'floor-1': { id: 'floor-1', name: 'Planta baja', order: 0, area: layout.area, side: layout.side } },
      tables: Object.fromEntries(layout.tables.map((table, index) => [table.id, { id: table.id, floorId: 'floor-1', number: index + 1, capacity: 4 }])),
      placements: Object.fromEntries(layout.tables.map(table => [table.id, { tableId: table.id, x: table.x, z: table.z }])),
      waiters: createWaiters(), products: createCatalog(),
      assignments: {}, visits: {}, orders: {}, presences: {}, events: [],
    }
  }

  return createStore<SessionState>()((set, get) => ({
    ...createSession(100, 6),
    transient: emptyTransient(),
    addFloor(name, area, count) {
      const state = get()
      if (state.session.activeRole !== 'admin') throw new DomainError('FORBIDDEN', 'Solo administración puede crear pisos.')
      if (Object.values(state.transient.orderDrafts).some(draft => draft.items.length > 0)) throw new DomainError('UNRESOLVED_DRAFT', 'Descartá el pedido pendiente antes de crear un piso.')
      const floorName = name.trim()
      if (!floorName || floorName.length > 40) throw new DomainError('INVALID_INPUT', 'Ingresá un nombre de hasta 40 caracteres.')
      if (Object.values(state.floors).some(floor => floor.name.toLocaleLowerCase('es-AR') === floorName.toLocaleLowerCase('es-AR'))) {
        throw new DomainError('CONFLICT', 'Ya existe un piso con ese nombre.')
      }
      if (Object.keys(state.floors).length >= 10) throw new DomainError('INVALID_INPUT', 'La demo admite hasta 10 pisos.')
      let layout
      try { layout = buildSpace(area, count) }
      catch (error) { throw new DomainError('INVALID_INPUT', error instanceof Error ? error.message : 'Espacio inválido.') }
      const floorId = `floor-${state.session.nextFloorNumber}`
      const floor = { id: floorId, name: floorName, order: Object.keys(state.floors).length, area: layout.area, side: layout.side }
      const tables = Object.fromEntries(layout.tables.map((_, index) => {
        const id = `${floorId}-table-${index + 1}`
        return [id, { id, floorId, number: index + 1, capacity: 4 }]
      }))
      const placements = Object.fromEntries(layout.tables.map((table, index) => {
        const id = `${floorId}-table-${index + 1}`
        return [id, { tableId: id, x: table.x, z: table.z }]
      }))
      const occurredAt = timestamp()
      set({
        session: { ...state.session, nextFloorNumber: state.session.nextFloorNumber + 1 },
        floors: { ...state.floors, [floorId]: floor },
        tables: { ...state.tables, ...tables },
        placements: { ...state.placements, ...placements },
        transient: { ...emptyTransient(floorId) },
        events: [...state.events, {
          id: createId(), commandId: createId(), sessionId: state.session.id, type: 'floor.created',
          actorId: state.session.activeRole, entityId: floorId, occurredAt,
          payload: { name: floorName, area, tableCount: count },
        }],
      })
    },
    renameFloor(floorId, name) {
      const state = get()
      if (state.session.activeRole !== 'admin') throw new DomainError('FORBIDDEN', 'Solo administración puede renombrar pisos.')
      const floor = state.floors[floorId]
      if (!floor) throw new DomainError('NOT_FOUND', 'El piso no existe.')
      const floorName = name.trim()
      if (!floorName || floorName.length > 40) throw new DomainError('INVALID_INPUT', 'Ingresá un nombre de hasta 40 caracteres.')
      if (Object.values(state.floors).some(item => item.id !== floorId && item.name.toLocaleLowerCase('es-AR') === floorName.toLocaleLowerCase('es-AR'))) {
        throw new DomainError('CONFLICT', 'Ya existe un piso con ese nombre.')
      }
      if (floor.name === floorName) return
      const occurredAt = timestamp()
      set({
        floors: { ...state.floors, [floorId]: { ...floor, name: floorName } },
        events: [...state.events, {
          id: createId(), commandId: createId(), sessionId: state.session.id, type: 'floor.renamed',
          actorId: state.session.activeRole, entityId: floorId, occurredAt,
          payload: { previousName: floor.name, name: floorName },
        }],
      })
    },
    moveFloor(floorId, direction) {
      const state = get()
      if (state.session.activeRole !== 'admin') throw new DomainError('FORBIDDEN', 'Solo administración puede ordenar pisos.')
      if (direction !== -1 && direction !== 1) throw new DomainError('INVALID_INPUT', 'Dirección de piso inválida.')
      const ordered = Object.values(state.floors).sort((a, b) => a.order - b.order)
      const index = ordered.findIndex(floor => floor.id === floorId)
      if (index < 0) throw new DomainError('NOT_FOUND', 'El piso no existe.')
      const target = index + direction
      if (target < 0 || target >= ordered.length) return
      const currentFloor = ordered[index]
      const targetFloor = ordered[target]
      const occurredAt = timestamp()
      set({
        floors: {
          ...state.floors,
          [currentFloor.id]: { ...currentFloor, order: targetFloor.order },
          [targetFloor.id]: { ...targetFloor, order: currentFloor.order },
        },
        events: [...state.events, {
          id: createId(), commandId: createId(), sessionId: state.session.id, type: 'floor.reordered',
          actorId: state.session.activeRole, entityId: floorId, occurredAt,
          payload: { order: targetFloor.order },
        }],
      })
    },
    deleteFloor(floorId, confirmHistory = false) {
      const state = get()
      if (state.session.activeRole !== 'admin') throw new DomainError('FORBIDDEN', 'Solo administración puede eliminar pisos.')
      if (!state.floors[floorId]) throw new DomainError('NOT_FOUND', 'El piso no existe.')
      if (Object.keys(state.floors).length === 1) throw new DomainError('CONFLICT', 'El salón debe conservar al menos un piso.')
      const tableIds = new Set(Object.values(state.tables).filter(table => table.floorId === floorId).map(table => table.id))
      if (Object.values(state.visits).some(visit => tableIds.has(visit.tableId) && visit.closedAt === null)) {
        throw new DomainError('TABLE_OCCUPIED', 'Cerrá las mesas ocupadas antes de eliminar el piso.')
      }
      if (Object.values(state.transient.orderDrafts).some(draft => draft.items.length > 0 && tableIds.has(state.visits[draft.visitId]?.tableId))) {
        throw new DomainError('UNRESOLVED_DRAFT', 'Resolvé los pedidos pendientes antes de eliminar el piso.')
      }
      const hasHistory = Object.values(state.visits).some(visit => visit.floorId === floorId || tableIds.has(visit.tableId))
        || Object.values(state.assignments).some(assignment => tableIds.has(assignment.tableId))
      if (hasHistory && !confirmHistory) throw new DomainError('CONFIRMATION_REQUIRED', 'El piso tiene historial o asignaciones. Confirmá para eliminarlo.')
      const occurredAt = timestamp()
      const floors = Object.fromEntries(Object.entries(state.floors).filter(([id]) => id !== floorId))
      const ordered = Object.values(floors).sort((a, b) => a.order - b.order)
      const normalizedFloors = Object.fromEntries(ordered.map((floor, order) => [floor.id, { ...floor, order }]))
      const tables = Object.fromEntries(Object.entries(state.tables).filter(([id]) => !tableIds.has(id)))
      const placements = Object.fromEntries(Object.entries(state.placements).filter(([id]) => !tableIds.has(id)))
      const nextFloorId = state.transient.activeFloorId === floorId ? ordered[0].id : state.transient.activeFloorId
      set({
        floors: normalizedFloors, tables, placements,
        assignments: Object.fromEntries(Object.entries(state.assignments).map(([id, assignment]) => [id,
          tableIds.has(assignment.tableId) && assignment.endedAt === null ? { ...assignment, endedAt: occurredAt } : assignment,
        ])),
        presences: Object.fromEntries(Object.entries(state.presences).map(([id, presence]) => [id,
          presence.attendingTableId && tableIds.has(presence.attendingTableId)
            ? { ...presence, attendingTableId: null, snapshotOnly: false }
            : presence,
        ])),
        transient: emptyTransient(nextFloorId),
        events: [...state.events, {
          id: createId(), commandId: createId(), sessionId: state.session.id, type: 'floor.deleted',
          actorId: state.session.activeRole, entityId: floorId, occurredAt,
          payload: { tableCount: tableIds.size, preservedHistory: hasHistory },
        }],
      })
    },
    setActiveFloor(floorId, discardDrafts = false) {
      const state = get()
      if (!state.floors[floorId]) throw new DomainError('NOT_FOUND', 'El piso no existe.')
      if (state.transient.activeFloorId === floorId) return
      if (!discardDrafts && Object.values(state.transient.orderDrafts).some(draft => draft.items.length > 0)) {
        throw new DomainError('UNRESOLVED_DRAFT', 'Descartá el borrador o seguí editando antes de cambiar de piso.')
      }
      set({ transient: emptyTransient(floorId) })
    },
    setMicState(micState) {
      set(state => ({ transient: { ...state.transient, micState } }))
    },
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
          id, tableId, tableNumber: state.tables[tableId].number, floorId: state.tables[tableId].floorId, guestCount,
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
      if (tableId !== null && state.tables[tableId].floorId !== state.transient.activeFloorId) throw new DomainError('INVALID_INPUT', 'La mesa está en otro piso.')
      if (tableId === state.transient.selectedTableId) return
      if (!discardDrafts && Object.values(state.transient.orderDrafts).some(draft => draft.items.length > 0)) {
        throw new DomainError('UNRESOLVED_DRAFT', 'Descartá el borrador o seguí editando antes de cambiar de mesa.')
      }
      const presences = { ...state.presences }
      const waiterId = state.session.activeWaiterId
      if (state.session.activeRole === 'waiter' && waiterId) {
        const own = tableId && selectAssignment(state, tableId)?.waiterId === waiterId
        presences[waiterId] = { waiterId, attendingTableId: own ? tableId : null,
          lastAttendedAt: own ? timestamp() : presences[waiterId]?.lastAttendedAt ?? null, snapshotOnly: false }
      }
      set({ presences, transient: { ...emptyTransient(state.transient.activeFloorId), selectedTableId: tableId } })
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
        presences: Object.fromEntries(Object.entries(state.presences).map(([id, presence]) => [id, { ...presence, snapshotOnly: true }])),
        session: { ...state.session, activeRole: role, activeWaiterId },
        transient: emptyTransient(state.transient.activeFloorId),
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
      const visit = state.visits[visitId]
      requirePermission(state, 'confirmOrder', visit?.tableId)
      if (visit.closedAt !== null) throw new DomainError('CONFLICT', 'La visita ya finalizó.')
      validateOrderLine(product, 1, '')
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
      const q = quantity
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
    closeVisit({ visitId, commandId, discardDraft }) {
      const state = get()
      const visit = state.visits[visitId]
      if (!visit) throw new DomainError('NOT_FOUND', 'La visita no existe.')
      requirePermission(state, 'closeVisit', visit.tableId)
      if (isVisitCloseRetry(state, commandId, visitId)) return
      validateVisitClosure(state, visitId, discardDraft)
      const occurredAt = timestamp()
      const orderDrafts = { ...state.transient.orderDrafts }
      delete orderDrafts[visitId]
      const presences = Object.fromEntries(Object.entries(state.presences).map(([id, presence]) => [id,
        presence.attendingTableId === visit.tableId
          ? { ...presence, attendingTableId: null, snapshotOnly: false }
          : presence,
      ]))
      set({
        visits: { ...state.visits, [visitId]: { ...visit, closedAt: occurredAt } },
        presences,
        transient: { ...state.transient, orderDrafts, micState: 'idle' },
        events: [...state.events, {
          id: createId(), commandId, sessionId: state.session.id, type: 'visit.closed',
          actorId: state.session.activeWaiterId ?? state.session.activeRole, entityId: visitId, occurredAt,
          payload: { tableId: visit.tableId, tableNumber: visit.tableNumber },
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
