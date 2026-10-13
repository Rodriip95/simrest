import { useEffect, useState } from 'react'
import { useSessionStore } from '../state/useSessionStore'
import { validatePlacement } from '../domain/movement'

export default function MoveTablePanel() {
  const state = useSessionStore(state => state)
  const preview = state.transient.movePreview
  const cancelMove = state.cancelMove
  const [error, setError] = useState('')
  useEffect(() => {
    if (!preview) return
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelMove()
        document.getElementById('table-details')?.focus({ preventScroll: true })
      }
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [preview, cancelMove])
  if (!preview) return null
  let invalid = ''
  try { validatePlacement(state, preview) } catch (cause) { invalid = cause instanceof Error ? cause.message : 'Posición inválida.' }
  return <section className="move-panel" aria-label="Mover mesa">
    <h3>Mover Mesa {state.tables[preview.tableId].number}</h3>
    <p>Arrastrá la mesa en la escena o ingresá X/Z. Soltar solo actualiza la vista previa.</p>
    <div className="move-coordinates">{(['x', 'z'] as const).map(axis => <label key={axis}>
      {axis.toUpperCase()} (m)
      <input type="number" step="0.5" value={Number.isFinite(preview[axis]) ? preview[axis] : ''}
        onChange={event => {
          const value = event.target.value === '' ? NaN : Number(event.target.value)
          state.previewMove(axis === 'x' ? value : preview.x, axis === 'z' ? value : preview.z)
          setError('')
        }} />
    </label>)}</div>
    <p role="status">{invalid || 'Posición válida. Guardá para confirmar.'}</p>
    <button type="button" disabled={!!invalid} onClick={() => {
      try {
        state.moveTable({ ...preview, commandId: crypto.randomUUID() })
        setError('')
        document.getElementById('table-details')?.focus({ preventScroll: true })
      }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo mover.') }
    }}>Guardar posición</button>
    <button type="button" onClick={() => {
      cancelMove()
      document.getElementById('table-details')?.focus({ preventScroll: true })
    }}>Cancelar movimiento</button>
    <p className="form-error" role="alert">{error}</p>
  </section>
}
