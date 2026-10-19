import type { SessionData } from './types.ts'

export type SessionMetrics = {
  occupancyPercent: number | null
  presentGuests: number
  assignedTables: number
  confirmedOrders: number
  consumptionCents: number
  averageFirstOrderWaitMs: number | null
  pendingTables: { tableId: string; waitMs: number }[]
}

export function computeSessionMetrics(state: SessionData, now: number, waiterId: string | null = null, floorId: string | null = null): SessionMetrics {
  const inFloor = (tableId: string) => !floorId || state.tables[tableId]?.floorId === floorId
  const visitInFloor = (visitId: string) => !floorId || state.visits[visitId]?.floorId === floorId || inFloor(state.visits[visitId]?.tableId ?? '')
  const assignments = Object.values(state.assignments).filter(item => item.endedAt === null && inFloor(item.tableId))
  const assignedTableIds = new Set(assignments.filter(item => !waiterId || item.waiterId === waiterId).map(item => item.tableId))
  const activeVisits = Object.values(state.visits).filter(visit => visit.closedAt === null && visitInFloor(visit.id))
  const relevantVisits = waiterId ? activeVisits.filter(visit => assignedTableIds.has(visit.tableId)) : activeVisits
  const denominator = waiterId ? assignedTableIds.size : Object.values(state.tables).filter(table => inFloor(table.id)).length
  const relevantOrders = Object.values(state.orders).filter(order => visitInFloor(order.visitId) && (!waiterId || order.waiterIdAtConfirmation === waiterId))

  const firstWaits: number[] = []
  for (const visit of Object.values(state.visits)) {
    if (!visitInFloor(visit.id)) continue
    const first = Object.values(state.orders)
      .filter(order => order.visitId === visit.id)
      .sort((a, b) => a.confirmedAt - b.confirmedAt)[0]
    if (first && (!waiterId || first.waiterIdAtConfirmation === waiterId)) firstWaits.push(Math.max(0, first.confirmedAt - visit.openedAt))
  }
  const pendingTables = relevantVisits.filter(visit => !Object.values(state.orders).some(order => order.visitId === visit.id))
    .map(visit => ({ tableId: visit.tableId, waitMs: Math.max(0, now - visit.openedAt) }))

  return {
    occupancyPercent: denominator ? relevantVisits.length / denominator * 100 : null,
    presentGuests: relevantVisits.reduce((sum, visit) => sum + visit.guestCount, 0),
    assignedTables: waiterId ? assignedTableIds.size : assignments.length,
    confirmedOrders: relevantOrders.length,
    consumptionCents: relevantOrders.reduce((sum, order) => sum + order.items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0), 0),
    averageFirstOrderWaitMs: firstWaits.length ? firstWaits.reduce((sum, value) => sum + value, 0) / firstWaits.length : null,
    pendingTables,
  }
}
