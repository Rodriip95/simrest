export const TABLE_SIZE = 1
export const TABLE_SPACING = 2
export const MIN_AREA = 4
export const MAX_AREA = 2500
export const MAX_TABLES = 200

export type SpaceLayout = {
  area: number
  side: number
  tables: { id: string; x: number; z: number }[]
}

export function removeTable(layout: SpaceLayout, tableId: string): SpaceLayout {
  return { ...layout, tables: layout.tables.filter(table => table.id !== tableId) }
}

export function tableCapacity(area: number) {
  if (!Number.isFinite(area) || area < MIN_AREA || area > MAX_AREA) return 0
  // Half a metre between the outer cubes and the edge of the floor.
  const radius = Math.floor((Math.sqrt(area) / 2 - TABLE_SIZE / 2 - 0.5) / TABLE_SPACING)
  return Math.min(MAX_TABLES, (radius * 2 + 1) ** 2)
}

export function buildSpace(area: number, count: number): SpaceLayout {
  if (!Number.isFinite(area) || area < MIN_AREA || area > MAX_AREA) {
    throw new Error(`Ingresá una superficie entre ${MIN_AREA} y ${MAX_AREA} m².`)
  }
  if (!Number.isInteger(count) || count < 0 || count > MAX_TABLES) {
    throw new Error(`Ingresá una cantidad entera de mesas entre 0 y ${MAX_TABLES}.`)
  }
  const capacity = tableCapacity(area)
  if (count > capacity) {
    throw new Error(`En este terreno caben hasta ${capacity} mesas con esta distribución. Aumentá la superficie o reducí la cantidad.`)
  }
  const side = Math.sqrt(area)
  const radius = Math.floor((side / 2 - TABLE_SIZE / 2 - 0.5) / TABLE_SPACING)
  const positions: { x: number; z: number }[] = []
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) positions.push({ x: x * TABLE_SPACING || 0, z: z * TABLE_SPACING || 0 })
  }
  positions.sort((a, b) => (a.x ** 2 + a.z ** 2) - (b.x ** 2 + b.z ** 2) || a.z - b.z || a.x - b.x)
  return { area, side, tables: positions.slice(0, count).map((position, i) => ({ id: `table-${i + 1}`, ...position })) }
}
