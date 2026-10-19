import { DomainError } from './commands.ts'
import type { OrderDraft, OrderItem, Product, SessionData, TransientState, Visit } from './types.ts'

export const MIN_ORDER_QUANTITY = 1
export const MAX_ORDER_QUANTITY = 99

export function validateOrderLine(product: Product, quantity: number, note: string) {
  if (!product) throw new DomainError('NOT_FOUND', 'El producto no existe.')
  if (!product.available) throw new DomainError('INVALID_INPUT', 'El producto no está disponible.')
  if (!Number.isInteger(quantity) || quantity < MIN_ORDER_QUANTITY || quantity > MAX_ORDER_QUANTITY) {
    throw new DomainError('INVALID_INPUT', `La cantidad debe ser un número entero entre ${MIN_ORDER_QUANTITY} y ${MAX_ORDER_QUANTITY}.`)
  }
  if (note.length > 200) {
    throw new DomainError('INVALID_INPUT', 'La observación no puede superar los 200 caracteres.')
  }
}

export function computeTotals(items: readonly OrderItem[]): { totalCents: number; currency: 'ARS' } {
  const totalCents = items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0 || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new DomainError('INVALID_INPUT', 'El precio y la cantidad deben ser enteros válidos.')
    }
    return sum + item.unitPriceCents * item.quantity
  }, 0)
  if (!Number.isFinite(totalCents) || totalCents < 0) {
    throw new DomainError('INVALID_INPUT', 'El total calculado no es válido.')
  }
  return { totalCents, currency: 'ARS' }
}

export function getOrderDraft(transient: TransientState, visitId: string): OrderDraft {
  return transient.orderDrafts[visitId] ?? { visitId, commandId: '', items: [] }
}

export function ensureOrderDraft(transient: TransientState, visitId: string, createId: () => string): OrderDraft {
  if (transient.orderDrafts[visitId]) return transient.orderDrafts[visitId]
  return { visitId, commandId: createId(), items: [] }
}

export function isOrderConfirmedRetry(state: SessionData, commandId: string, visitId: string) {
  if (!commandId.trim()) throw new DomainError('INVALID_INPUT', 'Falta el identificador de operación.')
  const event = state.events.find(item => item.commandId === commandId)
  if (!event) return false
  if (event.type !== 'order.confirmed' || event.entityId !== visitId) {
    throw new DomainError('CONFLICT', 'El identificador ya pertenece a otra operación.')
  }
  return true
}

export function isOrderDeliveredRetry(state: SessionData, commandId: string, orderId: string) {
  if (!commandId.trim()) throw new DomainError('INVALID_INPUT', 'Falta el identificador de operación.')
  const event = state.events.find(item => item.commandId === commandId)
  if (!event) return false
  if (event.type !== 'order.delivered' || event.entityId !== orderId) {
    throw new DomainError('CONFLICT', 'El identificador ya pertenece a otra operación.')
  }
  return true
}

export function buildOrderItemsFromDraft(
  draft: OrderDraft,
  products: Record<string, Product>
): OrderItem[] {
  if (draft.items.length === 0) {
    throw new DomainError('INVALID_INPUT', 'El pedido no puede estar vacío.')
  }
  return draft.items.map(line => {
    const product = products[line.productId]
    if (!product) throw new DomainError('NOT_FOUND', 'El producto no existe.')
    validateOrderLine(product, line.quantity, line.note)
    return {
      productId: product.id,
      nameSnapshot: product.name,
      unitPriceCents: product.unitPriceCents,
      quantity: line.quantity,
      note: line.note,
      currency: 'ARS' as const,
    }
  })
}

export function findActiveVisitForTable(state: SessionData, tableId: string): Visit | undefined {
  return Object.values(state.visits).find(item => item.tableId === tableId && item.closedAt === null)
}

export function waiterIdForTable(state: SessionData, tableId: string): string | null {
  const assignment = Object.values(state.assignments).find(item => item.tableId === tableId && item.endedAt === null)
  return assignment?.waiterId ?? null
}