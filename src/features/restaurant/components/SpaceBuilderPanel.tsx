import { useState } from 'react'
import { Hammer, Ruler, Rows3 } from 'lucide-react'
import { tableCapacity, MIN_AREA, MAX_AREA, MAX_TABLES } from '../../supervisor/domain/space'
import { useSessionStore } from '../state/useSessionStore'

export default function SpaceBuilderPanel() {
  const resetSession = useSessionStore(state => state.resetSession)
  const [area, setArea] = useState('100')
  const [tableCount, setTableCount] = useState('6')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  return (
    <section className="space-builder" aria-label="Construir el espacio">
      <p className="hud-eyebrow">CONFIGURACIÓN DEL SALÓN</p>
      <p className="hud-copy">Definí el terreno y cuántas mesas querés crear desde el centro.</p>
      <form className="space-form" noValidate onSubmit={event => {
        event.preventDefault()
        try {
          if (!area.trim() || !tableCount.trim()) throw new Error('Completá la superficie y la cantidad de mesas.')
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
      <p className="prototype-note"><span /> Configuración de prueba. Se reinicia al recargar la página.</p>
    </section>
  )
}
