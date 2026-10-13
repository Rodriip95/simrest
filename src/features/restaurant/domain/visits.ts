import { DomainError } from './commands.ts'
import type { OperationType, SessionData } from './types.ts'

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
