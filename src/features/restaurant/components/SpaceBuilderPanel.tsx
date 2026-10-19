import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Hammer, Pencil, Ruler, Rows3, Trash2 } from 'lucide-react'
import { tableCapacity, MIN_AREA, MAX_AREA, MAX_TABLES } from '../../supervisor/domain/space'
import { DomainError } from '../domain/commands'
import { useSessionStore } from '../state/useSessionStore'

export default function SpaceBuilderPanel() {
  const state = useSessionStore(state => state)
  const { resetSession, addFloor, renameFloor, moveFloor, deleteFloor } = state
  const floors = useMemo(() => Object.values(state.floors).sort((a, b) => a.order - b.order), [state.floors])
  const floorCount = floors.length
  const [area, setArea] = useState('100')
  const [tableCount, setTableCount] = useState('6')
  const [floorName, setFloorName] = useState('')
  const [floorArea, setFloorArea] = useState('100')
  const [floorTables, setFloorTables] = useState('6')
  const [floorError, setFloorError] = useState('')
  const [floorNotice, setFloorNotice] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [manageError, setManageError] = useState('')
  const [manageNotice, setManageNotice] = useState('')

  function removeFloor(floorId: string, confirmHistory = false) {
    try {
      deleteFloor(floorId, confirmHistory)
      setManageError('')
      setManageNotice('Piso eliminado. El historial cerrado se conserva en la sesión.')
    } catch (cause) {
      if (cause instanceof DomainError && cause.code === 'CONFIRMATION_REQUIRED') {
        if (window.confirm('Este piso tiene historial o asignaciones. Las mesas se quitarán, pero las visitas y pedidos cerrados se conservarán. ¿Eliminarlo?')) removeFloor(floorId, true)
        return
      }
      setManageError(cause instanceof Error ? cause.message : 'No se pudo eliminar el piso.')
      setManageNotice('')
    }
  }

  return (
    <section className="space-builder" aria-label="Construir el espacio">
      <p className="hud-eyebrow">CONFIGURACIÓN DEL SALÓN</p>
      <p className="hud-copy">Definí el terreno y cuántas mesas querés crear desde el centro.</p>
      <form className="space-form" noValidate onSubmit={event => {
        event.preventDefault()
        try {
          if (!area.trim() || !tableCount.trim()) throw new Error('Completá la superficie y la cantidad de mesas.')
          if (!window.confirm('Reconstruir el salón reinicia las mesas, asignaciones, clientes y pedidos de esta sesión. ¿Continuar?')) return
          resetSession(Number(area), Number(tableCount))
          setError('')
          setNotice(`Espacio construido: ${Number(area)} m² y ${Number(tableCount)} mesas.`)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Revisá los valores ingresados.')
          setNotice('')
        }
      }}>
        <label htmlFor="space-area"><Ruler size={14} aria-hidden="true" /> Superficie del terreno (m²)</label>
        <input id="space-area" type="number" min={MIN_AREA} max={MAX_AREA} step="any" required value={area}
          aria-describedby="area-help space-error" onChange={event => { setArea(event.target.value); setError(''); setNotice('') }} />
        <small id="area-help">Terreno cuadrado · entre {MIN_AREA} y {MAX_AREA} m².</small>

        <label htmlFor="table-count"><Rows3 size={14} aria-hidden="true" /> Cantidad de mesas</label>
        <input id="table-count" type="number" min="0" max={MAX_TABLES} step="1" required value={tableCount}
          aria-describedby="table-help space-error" onChange={event => { setTableCount(event.target.value); setError(''); setNotice('') }} />
        <small id="table-help">Capacidad de esta distribución: {tableCapacity(Number(area))} mesas. Podés empezar con 0.</small>

        <p id="space-error" className="form-error" role="alert">{error}</p>
        <button type="submit" className="build-button"><Hammer size={15} aria-hidden="true" /> Construir espacio</button>
        <p className="form-notice" role="status">{notice}</p>
      </form>
      <form className="space-form floor-form" noValidate onSubmit={event => {
        event.preventDefault()
        try {
          if (!floorArea.trim() || !floorTables.trim()) throw new Error('Completá la superficie y las mesas del piso.')
          addFloor(floorName, Number(floorArea), Number(floorTables))
          setFloorName('')
          setFloorError('')
          setFloorNotice('Piso creado. Ya podés verlo y seleccionar sus mesas.')
        } catch (cause) {
          setFloorError(cause instanceof Error ? cause.message : 'No se pudo crear el piso.')
          setFloorNotice('')
        }
      }}>
        <p className="hud-eyebrow">AGREGAR PISO · {floorCount}/10</p>
        <p className="hud-copy">Sumá otro nivel sin reiniciar visitas ni asignaciones.</p>
        <label htmlFor="floor-name">Nombre del piso</label>
        <input id="floor-name" type="text" maxLength={40} required placeholder="Primer piso" value={floorName} onChange={event => setFloorName(event.target.value)} />
        <label htmlFor="floor-area">Superficie (m²)</label>
        <input id="floor-area" type="number" min={MIN_AREA} max={MAX_AREA} step="any" required value={floorArea} onChange={event => setFloorArea(event.target.value)} />
        <label htmlFor="floor-tables">Cantidad de mesas</label>
        <input id="floor-tables" type="number" min="0" max={MAX_TABLES} step="1" required value={floorTables} onChange={event => setFloorTables(event.target.value)} />
        <small>En esta superficie caben hasta {tableCapacity(Number(floorArea))} mesas.</small>
        <p className="form-error" role="alert">{floorError}</p>
        <button type="submit" className="build-button" disabled={floorCount >= 10}><Rows3 size={15} aria-hidden="true" /> Agregar piso</button>
        <p className="form-notice" role="status">{floorNotice}</p>
      </form>
      <section className="floor-manager" aria-labelledby="floor-manager-title">
        <p id="floor-manager-title" className="hud-eyebrow">PISOS DEL SALÓN</p>
        <div className="floor-manager-list">{floors.map((floor, index) => {
          const tableCount = Object.values(state.tables).filter(table => table.floorId === floor.id).length
          const occupied = Object.values(state.visits).filter(visit => visit.closedAt === null && state.tables[visit.tableId]?.floorId === floor.id).length
          return <article key={floor.id} className="floor-manager-item">
            {editingFloorId === floor.id ? <form onSubmit={event => {
              event.preventDefault()
              try {
                renameFloor(floor.id, editingName)
                setEditingFloorId(null)
                setManageError('')
                setManageNotice('Nombre del piso actualizado.')
              } catch (cause) { setManageError(cause instanceof Error ? cause.message : 'No se pudo renombrar.') }
            }}><label htmlFor={`floor-edit-${floor.id}`}>Nombre</label><input id={`floor-edit-${floor.id}`} value={editingName} maxLength={40} autoFocus onChange={event => setEditingName(event.target.value)} /><button type="submit">Guardar</button><button type="button" onClick={() => setEditingFloorId(null)}>Cancelar</button></form> : <>
              <div><strong>{floor.name}</strong><small>{tableCount} mesas · {occupied} ocupadas · {floor.area} m²</small></div>
              <div className="floor-manager-actions">
                <button type="button" aria-label={`Subir ${floor.name}`} disabled={index === 0} onClick={() => moveFloor(floor.id, -1)}><ArrowUp size={15} /></button>
                <button type="button" aria-label={`Bajar ${floor.name}`} disabled={index === floors.length - 1} onClick={() => moveFloor(floor.id, 1)}><ArrowDown size={15} /></button>
                <button type="button" aria-label={`Renombrar ${floor.name}`} onClick={() => { setEditingFloorId(floor.id); setEditingName(floor.name) }}><Pencil size={15} /></button>
                <button type="button" aria-label={`Eliminar ${floor.name}`} disabled={floors.length === 1 || occupied > 0} onClick={() => removeFloor(floor.id)}><Trash2 size={15} /></button>
              </div>
            </>}
          </article>
        })}</div>
        <p className="form-error" role="alert">{manageError}</p>
        <p className="form-notice" role="status">{manageNotice}</p>
      </section>
      <p className="prototype-note"><span /> Configuración de prueba. Se reinicia al recargar la página.</p>
    </section>
  )
}
