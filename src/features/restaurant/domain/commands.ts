export type DomainErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_INPUT' | 'TABLE_OCCUPIED'
  | 'CONFLICT' | 'UNASSIGNED' | 'PENDING_ORDERS' | 'UNRESOLVED_DRAFT'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

// Contracts only: each operation is exposed by the store when its issue implements it.
// Failures throw DomainError before mutation. Repeated commandIds must not duplicate events.
export type CommandContext = { commandId: string }
export type SessionCommandContracts = {
  moveTable: (input: CommandContext & { tableId: string; x: number; z: number }) => void
  deleteTable: (tableId: string) => void
  setCapacity: (input: CommandContext & { tableId: string; capacity: number }) => void
  assignTable: (input: CommandContext & { tableId: string; waiterId: string | null; confirmOccupied: boolean; discardDraft: boolean }) => void
  openVisit: (input: CommandContext & { tableId: string; guestCount: number }) => void
  updateGuestCount: (input: CommandContext & { visitId: string; guestCount: number }) => void
  startAttention: (input: CommandContext & { tableId: string }) => void
  stopAttention: (input: CommandContext) => void
  confirmOrder: (input: CommandContext & { visitId: string }) => void
  deliverOrder: (input: CommandContext & { orderId: string }) => void
  closeVisit: (input: CommandContext & { visitId: string; discardDraft: boolean }) => void
  resetSession: (area: number, count: number) => void
}
