import { DomainError } from './commands.ts'
import type { SessionData, TablePlacement } from './types.ts'

export const snapCoordinate = (value: number) => Math.round(value * 2) / 2

export function validatePlacement(state: Pick<SessionData, 'space' | 'tables' | 'placements'>, target: TablePlacement) {
  if (!Object.hasOwn(state.tables, target.tableId)) throw new DomainError('NOT_FOUND', 'La mesa no existe.')
  if (![target.x, target.z].every(Number.isFinite)) throw new DomainError('INVALID_INPUT', 'Ingresá coordenadas finitas.')
  if (Math.abs(target.x) + 1 > state.space.side / 2 || Math.abs(target.z) + 1 > state.space.side / 2) {
    throw new DomainError('INVALID_INPUT', 'La mesa debe dejar al menos 0,5 m hasta el borde.')
  }
  if (Object.values(state.placements).some(other => other.tableId !== target.tableId && Math.abs(other.x - target.x) < 2 && Math.abs(other.z - target.z) < 2)) {
    throw new DomainError('CONFLICT', 'Dejá al menos 1 m entre mesas en uno de los ejes.')
  }
}
