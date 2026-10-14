import { useRef, useState } from 'react'
import { Move, Trash2, PanelRightClose, Info } from 'lucide-react'
import { can } from '../domain/permissions'
import { DomainError } from '../domain/commands'
import { selectActiveVisit, selectAssignment } from '../state/selectors'
import { useSessionStore } from '../state/useSessionStore'
import HudButton from './hud/HudButton'
import MoveTablePanel from './MoveTablePanel'
import AssignmentPanel from './AssignmentPanel'
import GuestCountForm from './GuestCountForm'
import OrderPanel from './OrderPanel'

export default function TableDirectory() {
  const state = useSessionStore(state => state)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [pendingSelection, setPendingSelection] = useState<{ id: string | null } | null>(null)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const selected = state.transient.selectedTableId ? state.tables[state.transient.selectedTableId] : undefined
  const assignment = selected ? selectAssignment(state, selected.id) : undefined
  const visit = selected ? selectActiveVisit(state, selected.id) : undefined
  const detailsAllowed = selected ? can(state, 'viewDetails', selected.id) : false
  const ownCount = Object.values(state.tables).filter(table => selectAssignment(state, table.id)?.waiterId === state.session.activeWaiterId).length

  function select(id: string | null, discard = false) {
    try {
      state.selectTable(id, discard)
      setPendingSelection(null)
      setConfirmDelete(null)
      setError('')
    } catch (cause) {
      if (cause instanceof DomainError && cause.code === 'UNRESOLVED_DRAFT') setPendingSelection({ id })
      else setError(cause instanceof Error ? cause.message : 'No se pudo seleccionar la mesa.')
    }
  }

  return (
    <section className="table-directory" aria-label="Mesas y detalle">
      <h3 ref={listHeading} tabIndex={-1} className="sr-heading">Mesas del salón</h3>
      {state.session.activeRole === 'waiter' && <p className="hud-copy">{ownCount ? `${ownCount} mesas a tu cargo.` : 'Todavía no tenés mesas asignadas.'} Podés consultar el estado general del salón.</p>}
      <p className="hud-copy">Seleccioná una mesa en la lista o en la escena. La lista funciona sin vista 3D.</p>
      <ul className="table-list">
        {Object.values(state.tables).map(table => {
          const occupied = !!selectActiveVisit(state, table.id)
          const responsible = selectAssignment(state, table.id)
          return <li key={table.id}><button type="button" aria-pressed={selected?.id === table.id}
            onClick={() => select(table.id)} aria-controls="table-details">
            <span className={`table-dot${occupied ? ' is-busy' : ''}`} aria-hidden="true" />
            <strong>Mesa {table.number}</strong><span>{occupied ? 'Ocupada' : 'Libre'}</span>
            <small>{responsible ? state.waiters[responsible.waiterId]?.name : 'Sin asignar'}{responsible?.waiterId === state.session.activeWaiterId ? ' · Tu mesa' : ''}</small>
          </button></li>
        })}
      </ul>
      {!Object.keys(state.tables).length && <p className="hud-copy">No hay mesas. Administración puede construir el salón.</p>}
      {pendingSelection && <div role="alert" className="draft-warning">
        <p>Hay un pedido sin confirmar.</p>
        <button type="button" onClick={() => setPendingSelection(null)}>Seguir editando</button>
        <button type="button" onClick={() => select(pendingSelection.id, true)}>Descartar y cambiar de mesa</button>
      </div>}
      <div id="table-details" className="table-details" aria-live="polite" tabIndex={-1}>
        {selected ? <>
          <h4 className="detail-title">Mesa {selected.number} <span className={`state-tag${visit ? ' is-busy' : ''}`}>{visit ? 'Ocupada' : 'Libre'}</span></h4>
          {detailsAllowed ? <div className="detail-stats">
            <p><Info size={14} aria-hidden="true" /> Capacidad: {selected.capacity} personas.</p>
            <p>Responsable: {assignment ? state.waiters[assignment.waiterId]?.name : 'Sin asignar'}.</p>
            {visit && <p>{visit.guestCount}/{selected.capacity} clientes presentes.</p>}
          </div> : <p className="hud-copy">El detalle operativo está disponible únicamente para el mozo responsable.</p>}
          {can(state, 'deleteTable', selected.id) && <div className="panel-actions">
            <HudButton icon={Move} label="Mover mesa" disabled={!!visit || !!state.transient.movePreview} onClick={() => {
              try { state.beginMove(selected.id); setError('') }
              catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el movimiento.') }
            }} />
            <HudButton icon={Trash2} label="Eliminar mesa" tone="danger" disabled={!!visit} onClick={() => setConfirmDelete(selected.id)} />
            {visit && <p className="hud-copy">Una mesa ocupada no se puede eliminar.</p>}
          </div>}
          {confirmDelete === selected.id && <div role="alert" className="draft-warning">
            <p>¿Eliminar Mesa {selected.number}? Las demás conservarán su lugar.</p>
            <button type="button" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            <button type="button" className="is-danger" onClick={() => {
              try {
                state.deleteTable(selected.id)
                setConfirmDelete(null)
                setNotice(`Mesa ${selected.number} eliminada.`)
                setError('')
                listHeading.current?.focus()
              } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar.') }
            }}>Confirmar eliminación</button>
          </div>}
          <div className="panel-actions">
            <HudButton icon={PanelRightClose} label="Cerrar detalle" onClick={() => { select(null); listHeading.current?.focus() }} />
          </div>
          <MoveTablePanel />
          {detailsAllowed && <GuestCountForm key={selected.id} tableId={selected.id} />}
          {can(state, 'assignTable', selected.id) && <AssignmentPanel key={selected.id} tableId={selected.id} />}
          {detailsAllowed && visit && <OrderPanel tableId={selected.id} />}
        </> : <p className="hud-copy">Seleccioná una mesa para consultar sus opciones.</p>}
      </div>
      <p role="alert" className="form-error">{error}</p>
      <p role="status" className="form-notice">{notice}</p>
    </section>
  )
}
