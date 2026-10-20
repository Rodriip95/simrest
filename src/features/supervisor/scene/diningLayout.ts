export const DINING_SCALE = 0.55
export const CUSTOMER_MODELS = ['man-polo', 'woman-coral', 'man-denim', 'woman-lilac', 'man-ochre', 'woman-sage'] as const

export function customerModel(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CUSTOMER_MODELS[hash % CUSTOMER_MODELS.length]
}

export function diningLayout(capacity: number) {
  const count = Math.max(1, Math.min(8, Math.floor(capacity)))
  const radius = count > 4 ? 0.95 : 0.72
  return {
    table: count === 4 ? 'table-square' : 'table-round',
    tableWidth: count > 4 ? 1.4 : 1,
    seats: Array.from({ length: count }, (_, index) => {
      const angle = index * Math.PI * 2 / count
      return { x: Math.sin(angle) * radius, z: -Math.cos(angle) * radius, rotation: -angle }
    }),
  }
}
