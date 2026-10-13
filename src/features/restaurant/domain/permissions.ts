import { DomainError } from './commands.ts'
import type { Role, SessionData } from './types.ts'

export type Permission = 'resetSession' | 'moveTable' | 'deleteTable' | 'setCapacity' | 'assignTable'
  | 'viewDetails' | 'openVisit' | 'updateGuestCount' | 'confirmOrder' | 'deliverOrder' | 'closeVisit'
type Scope = 'all' | 'assigned' | 'own' | 'none'

export const permissionMatrix: Record<Role, Record<Permission, Scope>> = {
  admin: {
    resetSession: 'all', moveTable: 'all', deleteTable: 'all', setCapacity: 'all', assignTable: 'all',
    viewDetails: 'all', openVisit: 'assigned', updateGuestCount: 'assigned', confirmOrder: 'assigned', deliverOrder: 'assigned', closeVisit: 'assigned',
  },
  supervisor: {
    resetSession: 'none', moveTable: 'all', deleteTable: 'all', setCapacity: 'all', assignTable: 'all',
    viewDetails: 'all', openVisit: 'assigned', updateGuestCount: 'assigned', confirmOrder: 'assigned', deliverOrder: 'assigned', closeVisit: 'assigned',
  },
  waiter: {
    resetSession: 'none', moveTable: 'none', deleteTable: 'none', setCapacity: 'none', assignTable: 'none',
    viewDetails: 'own', openVisit: 'own', updateGuestCount: 'own', confirmOrder: 'own', deliverOrder: 'own', closeVisit: 'own',
  },
}

export function can(state: SessionData, permission: Permission, tableId?: string): boolean {
  const scope = permissionMatrix[state.session.activeRole]?.[permission]
  if (!scope || scope === 'none') return false
  if (permission === 'resetSession') return scope === 'all'
  if (!tableId || !Object.hasOwn(state.tables, tableId)) return false
  if (scope === 'all') return true
  const assignment = Object.values(state.assignments).find(value => value.tableId === tableId && value.endedAt === null)
  if (!assignment || !state.waiters[assignment.waiterId]?.active) return false
  return scope === 'assigned' || assignment.waiterId === state.session.activeWaiterId
}

export function requirePermission(state: SessionData, permission: Permission, tableId?: string) {
  if (!can(state, permission, tableId)) throw new DomainError('FORBIDDEN', 'Tu rol no permite esta operación sobre la mesa o el salón.')
}

export const viewLabels: Record<Role, string> = {
  admin: 'Administración', supervisor: 'Supervisión', waiter: 'Mi servicio',
}
