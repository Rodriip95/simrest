import { useMemo, useRef, useState } from 'react'
import RestaurantScene from './features/supervisor/scene/RestaurantScene'
import type { SceneActions } from './features/supervisor/scene/RestaurantScene'
import { tableCapacity, MIN_AREA, MAX_AREA, MAX_TABLES } from './features/supervisor/domain/space'
import { useSessionStore } from './features/restaurant/state/useSessionStore'
import { selectLayout } from './features/restaurant/state/selectors'
import RoleNavigation from './features/restaurant/components/RoleNavigation'
import TableDirectory from './features/restaurant/components/TableDirectory'
import SceneBoundary from './features/restaurant/components/SceneBoundary'
import { viewLabels } from './features/restaurant/domain/permissions'
import './App.css'

function App() {
  const scene = useRef<SceneActions>(null)
  const space = useSessionStore(state => state.space)
  const tables = useSessionStore(state => state.tables)
  const placements = useSessionStore(state => state.placements)
  const generation = useSessionStore(state => state.session.id)
  const role = useSessionStore(state => state.session.activeRole)
  const activeWaiterId = useSessionStore(state => state.session.activeWaiterId)
  const resetSession = useSessionStore(state => state.resetSession)
  const deleteTable = useSessionStore(state => state.deleteTable)
  const layout = useMemo(() => selectLayout({ space, tables, placements }), [space, tables, placements])
  const [area, setArea] = useState('100')
  const [tableCount, setTableCount] = useState('6')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dimensions = layout.side.toLocaleString('es-AR', { maximumFractionDigits: 2 })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#main"><span className="brand-mark">r.</span><span>restaurant<span className="brand-light">sim</span></span></a>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <div className="nav-active"><span aria-hidden="true">▦</span> Vista del salón <span className="nav-dot" /></div>
        <div className="sidebar-note"><span className="tiny-label">PRIMER BOCETO</span><p>Un espacio para explorar tu próximo salón.</p><span>Geometrías simples. Posibilidades abiertas.</span></div>
        <div className="workspace-profile"><span className="avatar">RS</span><div>Mi restaurante<small>Entorno de demostración</small></div></div>
      </aside>

      <main id="main">
        <header className="topbar"><span>Mi restaurante <span className="breadcrumb">/</span> <strong>{viewLabels[role]}</strong></span><span className="demo-badge"><i /> Modo demo</span></header>
        <div className="page-content">
          <RoleNavigation />
          <div className="page-heading"><div><p className="eyebrow">UNA NUEVA PERSPECTIVA</p><h1>Tu salón, a simple vista<span>.</span></h1><p>Explorá el espacio y encontrá el mejor punto de vista.</p></div><button className="reset-button" onClick={() => scene.current?.reset()}><span aria-hidden="true">↺</span> Restablecer vista</button></div>
          <div className="scene-layout">
            <section className="scene-card" aria-label="Vista tridimensional del salón">
              <div className="scene-header"><div><span className="status-dot" /><strong>Salón principal</strong><span className="scene-subtitle">Planta 01</span></div><span className="view-tag">VISTA 3D</span></div>
              <div className="scene-viewport" tabIndex={0} aria-label="Escena 3D. Arrastrá para mover, rueda para zoom. Con teclado: flechas para mover, más y menos para zoom, cero para restablecer." onKeyDown={(event) => {
                const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
                if (directions[event.key]) {
                  event.preventDefault()
                  scene.current?.pan(...directions[event.key])
                } else if (['+', '=', '-', '0'].includes(event.key)) {
                  event.preventDefault()
                  if (event.key === '0') scene.current?.reset()
                  else scene.current?.zoom(event.key === '-' ? -1 : 1)
                }
              }}>
                <SceneBoundary key={generation}><RestaurantScene ref={scene} layout={layout} onDeleteTable={id => {
                  deleteTable(id)
                  setNotice(`Mesa ${id.replace('table-', '')} eliminada.`)
                }} /></SceneBoundary>
                <div className="scene-caption"><span className="caption-cross">+</span> ESPACIO DE PRUEBA <span>{dimensions} × {dimensions} m</span></div>
                <div className="scene-controls" aria-label="Controles de cámara">
                  <button aria-label="Acercar" title="Acercar" onClick={() => scene.current?.zoom(1)}>+</button>
                  <button aria-label="Alejar" title="Alejar" onClick={() => scene.current?.zoom(-1)}>−</button>
                  <span className="control-divider" />
                  <button aria-label="Centrar escena" title="Centrar escena" onClick={() => scene.current?.reset()}>⌖</button>
                </div>
                <div className="orientation" aria-hidden="true"><span>N</span>↗</div>
              </div>
              <footer className="scene-footer"><span><span aria-hidden="true">✥</span> Arrastrá para mover</span><span><span aria-hidden="true">↕</span> Rueda para zoom</span><span className="footer-hint">También podés usar las flechas del teclado</span></footer>
            </section>
            <aside className="detail-panel">
              {role === 'admin' ? <>
              <p className="eyebrow">CONSTRUIR EL ESPACIO</p>
              <h2>Diseñá tu salón.</h2>
              <p className="detail-description">Definí el terreno y cuántas mesas querés crear desde el centro.</p>
              <form className="space-form" noValidate onSubmit={(event) => {
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
                <label htmlFor="space-area">Superficie del terreno (m²)</label>
                <input id="space-area" type="number" min={MIN_AREA} max={MAX_AREA} step="any" required value={area}
                  aria-describedby="area-help space-error" onChange={(event) => { setArea(event.target.value); setError(''); setNotice('') }} />
                <small id="area-help">Terreno cuadrado · entre {MIN_AREA} y {MAX_AREA} m².</small>
                <label htmlFor="table-count">Cantidad de mesas</label>
                <input id="table-count" type="number" min="0" max={MAX_TABLES} step="1" required value={tableCount}
                  aria-describedby="table-help space-error" onChange={(event) => { setTableCount(event.target.value); setError(''); setNotice('') }} />
                <small id="table-help">Capacidad de esta distribución: {tableCapacity(Number(area))} mesas. Podés empezar con 0.</small>
                <p id="space-error" className="form-error" role="alert">{error}</p>
                <button type="submit" className="build-button">Construir espacio <span aria-hidden="true">↗</span></button>
                <p className="form-notice" role="status">{notice}</p>
              </form>
              </> : <>
                <p className="eyebrow">{viewLabels[role]}</p>
                <h2>{role === 'supervisor' ? 'Coordiná el salón.' : 'Tus mesas, a mano.'}</h2>
                <p className="detail-description">{role === 'supervisor'
                  ? 'Consultá las mesas, asigná responsables y ajustá la distribución de las mesas libres.'
                  : 'Consultá el salón y seleccioná una mesa. El detalle operativo se habilita para tus mesas asignadas.'}</p>
              </>}
              <div className="scene-stat"><strong>{layout.tables.length.toString().padStart(2, '0')}</strong><span>mesas construidas</span><span aria-hidden="true">▦</span></div>
              <p className="space-summary">Terreno actual: {layout.area.toLocaleString('es-AR')} m²<br />{dimensions} × {dimensions} metros</p>
              <div className="tip-card"><h3>Seleccioná una mesa</h3><p>Usá la escena o la lista de mesas. Las opciones disponibles dependen del rol de demo.</p></div>
              <p className="prototype-note"><span /> Configuración de prueba.<br />Se reinicia al recargar la página.</p>
            </aside>
          </div>
          <TableDirectory key={`${generation}-${role}-${activeWaiterId}`} />
          <footer className="page-footer"><span>RESTAURANT SIM <span className="footer-dot">·</span> EXPLORACIÓN DEL ESPACIO</span><span>Hecho para imaginar lo que viene.</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
