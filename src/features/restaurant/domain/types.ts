export type Role = 'admin' | 'supervisor' | 'waiter'
export type DemoSession = {
  id: string
  startedAt: number
  nextFloorNumber: number
  activeRole: Role
  activeWaiterId: string | null
}
export type Floor = { id: string; name: string; order: number; area: number; side: number }
export type Table = { id: string; floorId: string; number: number; capacity: number }
export type TablePlacement = { tableId: string; x: number; z: number }
export type Waiter = { id: string; name: string; color: string; active: boolean }
export type Assignment = {
  id: string; tableId: string; waiterId: string; startedAt: number; endedAt: number | null
}
export type Visit = {
  id: string; tableId: string; tableNumber: number; floorId?: string; guestCount: number
  customerIds: string[]; openedAt: number; closedAt: number | null
}
export type Product = {
  id: string; name: string; unitPriceCents: number; currency: 'ARS'; available: boolean
}
export type OrderItem = {
  productId: string; nameSnapshot: string; unitPriceCents: number
  quantity: number; note: string; currency: 'ARS'
}
type OrderDetails = {
  id: string; commandId: string; visitId: string; tableId: string
  actorId: string; waiterIdAtConfirmation: string
  items: readonly OrderItem[]; confirmedAt: number
}
export type Order = Readonly<OrderDetails & (
  | { status: 'confirmed'; deliveredAt: null }
  | { status: 'delivered'; deliveredAt: number }
)>
export type WaiterPresence = {
  waiterId: string; attendingTableId: string | null
  lastAttendedAt: number | null; snapshotOnly: boolean
}
export type Presence = WaiterPresence
export type OperationType = 'session.reset' | 'floor.created' | 'floor.renamed' | 'floor.reordered' | 'floor.deleted'
  | 'table.deleted' | 'table.moved' | 'table.capacityChanged'
  | 'table.assigned' | 'visit.opened' | 'visit.guestsChanged' | 'visit.closed'
  | 'attention.started' | 'attention.stopped' | 'order.confirmed' | 'order.delivered'
export type OperationEvent = {
  id: string; commandId: string; sessionId: string; type: OperationType
  actorId: string; entityId: string; occurredAt: number
  payload: Readonly<Record<string, string | number | boolean | null>>
}
export type OrderDraft = {
  visitId: string; commandId: string
  items: { productId: string; quantity: number; note: string }[]
}
export type SessionData = {
  session: DemoSession
  space: { area: number; side: number }
  floors: Record<string, Floor>
  tables: Record<string, Table>
  placements: Record<string, TablePlacement>
  waiters: Record<string, Waiter>
  products: Record<string, Product>
  assignments: Record<string, Assignment>
  visits: Record<string, Visit>
  orders: Record<string, Order>
  presences: Record<string, WaiterPresence>
  events: OperationEvent[]
}
export type TransientState = {
  activeFloorId: string
  selectedTableId: string | null
  movePreview: TablePlacement | null
  orderDrafts: Record<string, OrderDraft>
  micState: 'idle' | 'listening' | 'processing'
}
