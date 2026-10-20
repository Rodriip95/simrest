import { useSessionStore } from '../../state/useSessionStore'
import { selectActiveVisit, selectAssignment } from '../../state/selectors'
import { can } from '../../domain/permissions'
import { formatVisitDuration, visitDurationMs } from '../../domain/visitDuration'

export default function TableSummaryCard({ tableId, now, onDetails }: { tableId: string; now: number; onDetails: () => void }) {
  const state = useSessionStore(state => state)
  const table = state.tables[tableId]
  const visit = selectActiveVisit(state, tableId)
  const assignment = selectAssignment(state, tableId)
  const allowed = can(state, 'viewDetails', tableId)
  const orders = allowed && visit ? Object.values(state.orders).filter(order => order.visitId === visit.id) : []
  return <section className="table-summary-card" aria-label={`Resumen de Mesa ${table.number}`}>
    <h2>Mesa {table.number}</h2>
    <img className="summary-divider" src="/figma/divider.svg" alt="" />
    <span className={`table-status-pill ${visit ? 'is-occupied' : ''}`}>{visit ? 'Ocupada' : 'Vacía'}</span>
    {allowed ? <>
      <p><img src="/figma/clients.svg" alt="" />{visit?.guestCount ?? 0} clientes</p>
      <p><img src="/figma/waiter.svg" alt="" />{assignment ? state.waiters[assignment.waiterId]?.name : 'Sin responsable'}</p>
      <p><img src="/figma/duration.svg" alt="" />{visit ? formatVisitDuration(visitDurationMs(visit, now)) : 'Sin visita activa'}</p>
      <img className="summary-divider" src="/figma/divider.svg" alt="" />
      <h3>Pedido</h3>
      {orders.length ? <ul>{orders.flatMap(order => order.items.map((item, index) => <li key={`${order.id}-${index}`}>{item.quantity}× {item.nameSnapshot}</li>))}</ul> : <p>Sin pedidos registrados</p>}
    </> : <p>Detalle disponible para el responsable.</p>}
    <button type="button" onClick={onDetails}>Ver detalle</button>
  </section>
}
