import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { computeSessionMetrics } from '../domain/metrics'
import { useSessionStore } from '../state/useSessionStore'

function duration(value: number | null) {
  if (value === null) return 'Sin datos'
  const seconds = Math.round(value / 1000)
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

export default function MetricsPanel() {
  const state = useSessionStore(state => state)
  const waiterRole = state.session.activeRole === 'waiter'
  const [scope, setScope] = useState<string>(waiterRole ? state.session.activeWaiterId ?? '' : '')
  const [floorId, setFloorId] = useState('')
  const [now, setNow] = useState(state.session.startedAt)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [])
  const waiterId = scope || null
  const metrics = computeSessionMetrics(state, now, waiterId, floorId || null)
  const cards = [
    ['Ocupación', metrics.occupancyPercent === null ? 'Sin datos' : `${metrics.occupancyPercent.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`],
    ['Clientes presentes', metrics.presentGuests.toLocaleString('es-AR')],
    ['Mesas asignadas', metrics.assignedTables.toLocaleString('es-AR')],
    ['Pedidos confirmados', metrics.confirmedOrders.toLocaleString('es-AR')],
    ['Consumo registrado', (metrics.consumptionCents / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })],
    ['Espera al primer pedido', duration(metrics.averageFirstOrderWaitMs)],
  ]

  return <section className="metrics-panel">
    <p className="hud-copy">Sesión demo desde {new Date(state.session.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}. Los importes son consumo registrado, no cobros.</p>
    {!waiterRole && <label className="metric-filter">Alcance
      <select value={scope} onChange={event => setScope(event.target.value)}>
        <option value="">Todo el salón</option>
        {Object.values(state.waiters).filter(waiter => waiter.active).map(waiter => <option value={waiter.id} key={waiter.id}>{waiter.name}</option>)}
      </select>
    </label>}
    <label className="metric-filter">Piso
      <select value={floorId} onChange={event => setFloorId(event.target.value)}>
        <option value="">Todos los pisos</option>
        {Object.values(state.floors).map(floor => <option value={floor.id} key={floor.id}>{floor.name}</option>)}
      </select>
    </label>
    <div className="metric-grid">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="pending-metrics"><h3><Clock3 size={16} /> Mesas pendientes</h3>
      {metrics.pendingTables.length ? <ul>{metrics.pendingTables.map(item => <li key={item.tableId}><span>Mesa {state.tables[item.tableId]?.number ?? 'retirada'} · {state.floors[state.tables[item.tableId]?.floorId]?.name ?? 'piso retirado'}</span><strong>{duration(item.waitMs)}</strong></li>)}</ul> : <p className="hud-copy">No hay mesas esperando su primer pedido.</p>}
    </section>
  </section>
}
