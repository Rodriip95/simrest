import { DomainError } from './commands.ts'
import type { OperationType, SessionData, TransientState } from './types.ts'

export function validateGuestCount(count: number, capacity: number) {
  if (!Number.isInteger(count) || count < 1 || count > capacity) {
    throw new DomainError('INVALID_INPUT', `Ingresá una cantidad entera entre 1 y ${capacity}.`)
  }
}

export function resizeCustomerIds(ids: readonly string[], count: number, createId: () => string): string[] {
  return Array.from({ length: count }, (_, index) => ids[index] ?? createId())
}

export function isVisitCommandRetry(state: SessionData, commandId: string, type: OperationType, entityId: string, value: number) {
  if (!commandId.trim()) throw new DomainError('INVALID_INPUT', 'Falta el identificador de operación.')
  const event = state.events.find(item => item.commandId === commandId)
  if (!event) return false
  if (event.type !== type || event.entityId !== entityId || event.payload.value !== value) {
    throw new DomainError('CONFLICT', 'El identificador ya pertenece a otra operación.')
  }
  return true
}

export function isVisitCloseRetry(state: SessionData, commandId: string, visitId: string) {
  if (!commandId.trim()) throw new DomainError('INVALID_INPUT', 'Falta el identificador de operación.')
  const event = state.events.find(item => item.commandId === commandId)
  if (!event) return false
  if (event.type !== 'visit.closed' || event.entityId !== visitId) {
    throw new DomainError('CONFLICT', 'El identificador ya pertenece a otra operación.')
  }
  return true
}

export function validateVisitClosure(state: SessionData & { transient: TransientState }, visitId: string, discardDraft: boolean) {
  const visit = state.visits[visitId]
  if (!visit) throw new DomainError('NOT_FOUND', 'La visita no existe.')
  if (visit.closedAt !== null) throw new DomainError('CONFLICT', 'La visita ya finalizó.')
  if (Object.values(state.orders).some(order => order.visitId === visitId && order.status === 'confirmed')) {
    throw new DomainError('PENDING_ORDERS', 'Entregá todos los pedidos confirmados antes de finalizar la visita.')
  }
  const draft = state.transient.orderDrafts[visitId]
  if (draft?.items.length && !discardDraft) {
    throw new DomainError('UNRESOLVED_DRAFT', 'Descartá el pedido sin confirmar o seguí editándolo.')
  }
  return visit
}
