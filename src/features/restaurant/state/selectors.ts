import type { SpaceLayout } from '../../supervisor/domain/space.ts'
import type { SessionData } from '../domain/types.ts'

export const selectTable = (state: SessionData, id: string) => state.tables[id]
export const selectPlacement = (state: SessionData, id: string) => state.placements[id]
export const selectWaiter = (state: SessionData, id: string) => state.waiters[id]
export const selectProduct = (state: SessionData, id: string) => state.products[id]
export const selectOrder = (state: SessionData, id: string) => state.orders[id]
export const selectVisit = (state: SessionData, id: string) => state.visits[id]
export const selectActiveVisit = (state: SessionData, tableId: string) =>
  Object.values(state.visits).find(visit => visit.tableId === tableId && visit.closedAt === null)
export const selectAssignment = (state: SessionData, tableId: string) =>
  Object.values(state.assignments).find(assignment => assignment.tableId === tableId && assignment.endedAt === null)

// Compatibility projection for B01/B02, never stored as a second collection.
export function selectLayout(state: Pick<SessionData, 'space' | 'tables' | 'placements'>): SpaceLayout {
  return {
    ...state.space,
    tables: Object.values(state.tables).map(table => {
      const placement = state.placements[table.id]
      return { id: table.id, x: placement.x, z: placement.z }
    }),
  }
}
