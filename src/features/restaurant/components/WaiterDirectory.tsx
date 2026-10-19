import { useState } from 'react'
import { useSessionStore } from '../state/useSessionStore'
import { selectAssignment } from '../state/selectors'

type Props = { selectedId: string | null; onSelect: (id: string) => void; onInspect: (id: string) => void; onTableSelected: () => void }

export default function WaiterDirectory({ selectedId, onSelect, onInspect, onTableSelected }: Props) {
  const state = useSessionStore(state => state)
  const [error, setError] = useState('')
  const visible = Object.values(state.waiters).filter(waiter => waiter.active && (state.session.activeRole !== 'waiter' || waiter.id === state.session.activeWaiterId))
  const selected = visible.find(waiter => waiter.id === selectedId)
  const assigned = selected ? Object.values(state.tables).filter(table => selectAssignment(state, table.id)?.waiterId === selected.id) : []
  const presence = selected ? state.presences[selected.id] : undefined

  function openTable(id: string) {
    try {
      if (state.tables[id].floorId !== state.transient.activeFloorId) state.setActiveFloor(state.tables[id].floorId)
      state.selectTable(id)
      onTableSelected()
      setError('')
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir la mesa.') }
  }

  return <section className="waiter-directory">
    <p className="hud-copy">Seleccioná un integrante para consultar sus mesas y organizar la atención.</p>
    <ul className="waiter-list">{visible.map(waiter => <li key={waiter.id}><button aria-pressed={selected?.id === waiter.id} onClick={() => {
      onInspect(waiter.id)
    }}><span className="waiter-initial" style={{ borderColor: waiter.color }}>{waiter.name.slice(0, 1)}</span><span><strong>{waiter.name}</strong><small>{Object.values(state.assignments).filter(a => a.waiterId === waiter.id && a.endedAt === null).length} mesas asignadas</small></span></button></li>)}</ul>
    {selected && <div className="waiter-details"><h3>{selected.name}</h3>
      <p className="hud-copy">{presence?.attendingTableId ? `${presence.snapshotOnly ? 'Última atención simulada' : 'Atención simulada'}: Mesa ${state.tables[presence.attendingTableId]?.number ?? 'retirada'} · ${state.floors[state.tables[presence.attendingTableId]?.floorId]?.name ?? 'piso retirado'}.` : 'En espera · sin mesa en atención.'}</p>
      <button onClick={() => onSelect(selected.id)}>Seleccionar en el salón</button>
      <h4>Mesas asignadas</h4>
      {assigned.length ? <div className="assigned-tables">{assigned.map(table => <button key={table.id} onClick={() => openTable(table.id)}>Mesa {table.number} · {state.floors[table.floorId].name} →</button>)}</div> : <p className="hud-copy">Todavía no tiene mesas asignadas.</p>}
      {state.session.activeRole !== 'waiter' && <><h4>Asignar o reasignar una mesa</h4><p className="hud-copy">Abrí una mesa para elegir el responsable y confirmar el cambio.</p><div className="assigned-tables">{Object.values(state.tables).filter(table => !assigned.some(item => item.id === table.id)).map(table => <button key={table.id} onClick={() => openTable(table.id)}>Mesa {table.number} · {state.floors[table.floorId].name} →</button>)}</div></>}
    </div>}
    <p className="form-error" role="alert">{error}</p>
  </section>
}
