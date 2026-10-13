import { DomainError } from './commands.ts'
import type { SessionCommandContracts } from './commands.ts'
import type { SessionData, TransientState } from './types.ts'
import { requirePermission } from './permissions.ts'

export type AssignTableInput = Parameters<SessionCommandContracts['assignTable']>[0]

export function validateAssignment(state: SessionData & { transient: TransientState }, input: AssignTableInput) {
  const { tableId, waiterId, confirmOccupied, discardDraft, commandId } = input
  requirePermission(state, 'assignTable', tableId)
  if (!commandId.trim()) throw new DomainError('INVALID_INPUT', 'Falta el identificador de operación.')
  const previousEvent = state.events.find(event => event.commandId === commandId)
  if (previousEvent) {
    if (previousEvent.type !== 'table.assigned' || previousEvent.entityId !== tableId || previousEvent.payload.waiterId !== waiterId) {
      throw new DomainError('CONFLICT', 'El identificador ya pertenece a otra operación.')
    }
    return null
  }
  if (waiterId !== null && (!Object.hasOwn(state.waiters, waiterId) || !state.waiters[waiterId].active)) {
    throw new DomainError('INVALID_INPUT', 'Elegí un mozo activo.')
  }
  const previous = Object.values(state.assignments).find(item => item.tableId === tableId && item.endedAt === null)
  if ((previous?.waiterId ?? null) === waiterId) return null
  const visit = Object.values(state.visits).find(item => item.tableId === tableId && item.closedAt === null)
  if (visit && waiterId === null) throw new DomainError('UNASSIGNED', 'Una mesa ocupada necesita un responsable de reemplazo.')
  if (visit && !confirmOccupied) throw new DomainError('CONFLICT', 'Confirmá la reasignación de la mesa ocupada.')
  const draft = visit ? state.transient.orderDrafts[visit.id] : undefined
  if (draft?.items.length && !discardDraft) throw new DomainError('UNRESOLVED_DRAFT', 'Descartá expresamente el borrador o cancelá la reasignación.')
  return { previous, visit }
}
