import type { Product, Waiter } from '../domain/types.ts'

export function createWaiters(): Record<string, Waiter> {
  return {
    ana: { id: 'ana', name: 'Ana', color: '#8bb6a1', active: true },
    bruno: { id: 'bruno', name: 'Bruno', color: '#b1a6c8', active: true },
    carla: { id: 'carla', name: 'Carla', color: '#d8b68a', active: true },
  }
}

export function createCatalog(): Record<string, Product> {
  return {
    coffee: { id: 'coffee', name: 'Café', unitPriceCents: 150000, currency: 'ARS', available: true },
    water: { id: 'water', name: 'Agua', unitPriceCents: 100000, currency: 'ARS', available: true },
    sandwich: { id: 'sandwich', name: 'Sándwich', unitPriceCents: 650000, currency: 'ARS', available: true },
    cake: { id: 'cake', name: 'Torta del día', unitPriceCents: 350000, currency: 'ARS', available: false },
  }
}
