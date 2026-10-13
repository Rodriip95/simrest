import { useRef, useState } from 'react'
import { useSessionStore } from '../state/useSessionStore'
import { selectActiveVisit, selectAssignment } from '../state/selectors'

export default function AssignmentPanel({ tableId }: { tableId: string }) {
  const state = useSessionStore(state => state)
  const current = selectAssignment(state, tableId)
  const visit = selectActiveVisit(state, tableId)
  const hasDraft = !!(visit && state.transient.orderDrafts[visit.id]?.items.length)
  const [waiterId, setWaiterId] = useState(current?.waiterId ?? '')
  const [confirming, setConfirming] = useState(false)
  const [discardDraft, setDiscardDraft] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const select = useRef<HTMLSelectElement>(null)
  const unchanged = waiterId === (current?.waiterId ?? '')
  const blocked = !!visit && !waiterId

  function save() {
    try {
      state.assignTable({ tableId, waiterId: waiterId || null, commandId: crypto.randomUUID(), confirmOccupied: confirming, discardDraft })
      setConfirming(false)
      setDiscardDraft(false)
      setError('')
      setNotice(waiterId ? `Responsable actualizado: ${state.waiters[waiterId].name}.` : 'Mesa sin responsable.')
      select.current?.focus()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo asignar.') }
  }

  return <section className="assignment-panel" aria-label="Asignación de mesa">
    <h4>Responsable de la mesa</h4>
    <p>Actual: {current ? state.waiters[current.waiterId]?.name : 'Sin asignar'}.</p>
    <form onSubmit={event => {
      event.preventDefault()
      if (visit) setConfirming(true)
      else save()
    }}>
      <label htmlFor="assignment-waiter">Asignar a</label>
      <select ref={select} id="assignment-waiter" value={waiterId} onChange={event => {
        setWaiterId(event.target.value)
        setConfirming(false)
        setDiscardDraft(false)
        setError('')
        setNotice('')
      }}>
        <option value="" disabled={!!visit}>Sin asignar</option>
        {Object.values(state.waiters).filter(waiter => waiter.active).map(waiter => <option key={waiter.id} value={waiter.id}>{waiter.name}</option>)}
      </select>
      <button type="submit" disabled={unchanged || blocked || confirming}>Guardar responsable</button>
    </form>
    {confirming && <div className="draft-warning" role="alert">
      <p>La mesa está ocupada. ¿Cambiar el responsable a {state.waiters[waiterId]?.name}? Los clientes y pedidos confirmados se conservan.</p>
      {hasDraft && <label><input type="checkbox" checked={discardDraft} onChange={event => setDiscardDraft(event.target.checked)} /> Descartar el pedido sin confirmar de esta mesa</label>}
      <div><button type="button" onClick={() => { setConfirming(false); setDiscardDraft(false); select.current?.focus() }}>Cancelar reasignación</button>
        <button type="button" disabled={hasDraft && !discardDraft} onClick={save}>Confirmar reasignación</button></div>
    </div>}
    {visit && <p>Mientras esté ocupada, la mesa debe mantener un responsable.</p>}
    <p role="alert" className="form-error">{error}</p>
    <p role="status" className="form-notice">{notice}</p>
  </section>
}
