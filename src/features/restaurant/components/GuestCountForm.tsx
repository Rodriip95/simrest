import { useState } from 'react'
import { useSessionStore } from '../state/useSessionStore'
import { selectActiveVisit } from '../state/selectors'
import { can } from '../domain/permissions'

export default function GuestCountForm({ tableId }: { tableId: string }) {
  const state = useSessionStore(state => state)
  const table = state.tables[tableId]
  const visit = selectActiveVisit(state, tableId)
  const [count, setCount] = useState(String(visit?.guestCount ?? 1))
  const [capacity, setCapacity] = useState(String(table.capacity))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const allowed = can(state, visit ? 'updateGuestCount' : 'openVisit', tableId)

  return <section className="guest-panel" aria-label="Clientes de la mesa">
    <h4>{visit ? 'Clientes presentes' : 'Ingresar clientes'}</h4>
    <p>{visit?.guestCount ?? 0}/{table.capacity} clientes</p>
    {allowed ? <form onSubmit={event => {
      event.preventDefault()
      try {
        if (!count.trim()) throw new Error('Ingresá la cantidad de clientes.')
        const commandId = crypto.randomUUID()
        if (visit) state.updateGuestCount({ visitId: visit.id, guestCount: Number(count), commandId })
        else state.openVisit({ tableId, guestCount: Number(count), commandId })
        setError('')
        setNotice(visit ? 'Cantidad actualizada.' : 'Clientes registrados. La mesa está ocupada.')
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar.'); setNotice('') }
    }} noValidate>
      <label htmlFor="guest-count">Cantidad de clientes</label>
      <input id="guest-count" type="number" min="1" max={table.capacity} step="1" value={count}
        onChange={event => { setCount(event.target.value); setError(''); setNotice('') }} />
      <button type="submit">{visit ? 'Guardar cantidad' : 'Confirmar ingreso'}</button>
    </form> : <p>Asigná un mozo activo para ingresar clientes.</p>}
    {!visit && can(state, 'setCapacity', tableId) && <form onSubmit={event => {
      event.preventDefault()
      try {
        if (!capacity.trim()) throw new Error('Ingresá la capacidad.')
        state.setCapacity({ tableId, capacity: Number(capacity), commandId: crypto.randomUUID() })
        setError('')
        setNotice('Capacidad actualizada.')
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la capacidad.'); setNotice('') }
    }} noValidate>
      <label htmlFor="table-capacity">Capacidad (1–8)</label>
      <input id="table-capacity" type="number" min="1" max="8" step="1" value={capacity}
        onChange={event => { setCapacity(event.target.value); setError(''); setNotice('') }} />
      <button type="submit">Guardar capacidad</button>
    </form>}
    <p role="alert" className="form-error">{error}</p>
    <p role="status" className="form-notice">{notice}</p>
  </section>
}
