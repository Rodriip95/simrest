import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import type { SpaceLayout } from '../domain/space'
import { can } from '../../restaurant/domain/permissions'
import { selectActiveVisit } from '../../restaurant/state/selectors'
import { useSessionStore } from '../../restaurant/state/useSessionStore'

type TableMenuProps = {
  table: SpaceLayout['tables'][number]
  onClose: () => void
  onDelete: () => void
}

export default function TableMenu({ table, onClose, onDelete }: TableMenuProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const allowed = useSessionStore(state => can(state, 'deleteTable', table.id))
  const occupied = useSessionStore(state => !!selectActiveVisit(state, table.id))
  const beginMove = useSessionStore(state => state.beginMove)
  const canServe = useSessionStore(state => can(state, 'openVisit', table.id))
  const panel = useRef<HTMLDivElement>(null)
  const primaryFocus = useRef<HTMLButtonElement>(null)
  const label = `Mesa ${table.id.replace('table-', '')}`

  useEffect(() => {
    // HTML list selection must not transfer keyboard focus into the canvas overlay.
    if (document.activeElement?.closest('.scene-viewport')) primaryFocus.current?.focus({ preventScroll: true })
  }, [confirming])

  return (
    <Html position={[table.x, 1.5, table.z]} center zIndexRange={[50, 10]}>
      <div ref={panel} className="table-menu" role={confirming ? 'alertdialog' : 'dialog'}
        aria-label={confirming ? `Eliminar ${label}` : `Opciones de ${label}`}
        aria-describedby={confirming ? 'table-delete-description' : undefined}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
        onDoubleClick={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()}
        onContextMenu={event => event.preventDefault()}
        onKeyDown={event => {
          event.stopPropagation()
          if (event.key === 'Escape') {
            event.preventDefault()
            if (confirming) setConfirming(false)
            else onClose()
          }
        }}>
        <header className="table-menu-heading"><span>{label}</span><button ref={primaryFocus} type="button" aria-label="Cerrar opciones de mesa" onClick={onClose}>×</button></header>
        {confirming ? (
          <>
            <h3>¿Eliminar esta mesa?</h3>
            <p id="table-delete-description">La mesa desaparecerá del salón. Las demás quedarán en su lugar.</p>
            <div className="table-menu-confirm">
              <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
              <button type="button" disabled={!allowed || occupied} className="table-delete-confirm" onClick={() => {
                try { onDelete() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar.') }
              }}>Confirmar</button>
            </div>
          </>
        ) : (
          <div className="table-menu-options">
            <p>{occupied ? 'Ocupada' : 'Libre'}. Consultá el detalle en la lista de mesas.</p>
            {canServe && <button type="button" onClick={() => {
              document.getElementById('guest-count')?.focus()
              document.getElementById('guest-count')?.scrollIntoView({ block: 'center' })
            }}>{occupied ? 'Corregir clientes' : 'Ingresar clientes'}</button>}
            {allowed ? <>
              <button type="button" disabled={occupied} onClick={() => {
                try { beginMove(table.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo mover.') }
              }}>Mover mesa</button>
              <button type="button" disabled={occupied} className="table-delete-option" onClick={() => setConfirming(true)}>Eliminar mesa <span aria-hidden="true">×</span></button>
            </> : <p>Tu rol no permite editar la distribución.</p>}
          </div>
        )}
        <p role="alert" className="form-error">{error}</p>
      </div>
    </Html>
  )
}
