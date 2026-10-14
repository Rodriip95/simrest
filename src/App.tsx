import { useEffect, useMemo, useRef, useState } from 'react'
import { Hammer, List, Crosshair, Plus, Minus, RotateCcw, Compass, Boxes, Move, Mouse } from 'lucide-react'
import RestaurantScene from './features/supervisor/scene/RestaurantScene'
import type { SceneActions } from './features/supervisor/scene/RestaurantScene'
import { useSessionStore } from './features/restaurant/state/useSessionStore'
import { selectLayout } from './features/restaurant/state/selectors'
import RoleNavigation from './features/restaurant/components/RoleNavigation'
import TableDirectory from './features/restaurant/components/TableDirectory'
import SceneBoundary from './features/restaurant/components/SceneBoundary'
import SpaceBuilderPanel from './features/restaurant/components/SpaceBuilderPanel'
import SlideOver from './features/restaurant/components/hud/SlideOver'
import HudButton from './features/restaurant/components/hud/HudButton'
import HudChip from './features/restaurant/components/hud/HudChip'
import { viewLabels } from './features/restaurant/domain/permissions'
import './App.css'

type PanelId = 'tables' | 'build'

function App() {
  const scene = useRef<SceneActions>(null)
  const space = useSessionStore(state => state.space)
  const tables = useSessionStore(state => state.tables)
  const placements = useSessionStore(state => state.placements)
  const generation = useSessionStore(state => state.session.id)
  const role = useSessionStore(state => state.session.activeRole)
  const activeWaiterId = useSessionStore(state => state.session.activeWaiterId)
  const selectedId = useSessionStore(state => state.transient.selectedTableId)
  const deleteTable = useSessionStore(state => state.deleteTable)
  const layout = useMemo(() => selectLayout({ space, tables, placements }), [space, tables, placements])
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [notice, setNotice] = useState('')
  const dimensions = layout.side.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  const selectedTable = selectedId ? tables[selectedId] : undefined

  // Seleccionar una mesa en la escena abre el panel de detalle.
  useEffect(() => {
    if (selectedId) setPanel('tables')
  }, [selectedId])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  function toggle(next: PanelId) {
    setPanel(current => current === next ? null : next)
  }

  return (
    <div className="hud-shell">
      <div className="scene-viewport" tabIndex={0}
        aria-label="Escena 3D del salón. Arrastrá para mover, rueda para zoom. Con teclado: flechas para mover, más y menos para zoom, cero para restablecer."
        onKeyDown={(event) => {
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

        <div className="hud">
          <div className="hud-corner hud-tl">
            <div className="brand">
              <span className="brand-mark">r.</span>
              <span className="brand-text">restaurant<span className="brand-light">sim</span></span>
              <span className="demo-badge"><i /> MODO DEMO</span>
            </div>
            <RoleNavigation />
          </div>

          <div className="hud-corner hud-tr">
            <HudChip icon={Boxes} label="MESAS" value={layout.tables.length.toString().padStart(2, '0')} />
            <HudChip icon={Move} label="TERRENO" value={`${layout.area.toLocaleString('es-AR')} m²`} />
            <HudChip icon={Crosshair} label="MODO" value={viewLabels[role]} />
          </div>

          <div className="hud-corner hud-bl">
            <HudButton icon={List} label="Mesas" badge={layout.tables.length} active={panel === 'tables'}
              onClick={() => toggle('tables')} />
            {role === 'admin' && <HudButton icon={Hammer} label="Construir" active={panel === 'build'}
              onClick={() => toggle('build')} />}
            {selectedTable && <HudButton icon={Crosshair} label={`Detalle · Mesa ${selectedTable.number}`}
              tone="accent" onClick={() => setPanel('tables')} />}
          </div>

          <div className="hud-corner hud-br">
            <div className="scene-controls" aria-label="Controles de cámara">
              <HudButton icon={Plus} label="Acercar" iconOnly onClick={() => scene.current?.zoom(1)} />
              <HudButton icon={Minus} label="Alejar" iconOnly onClick={() => scene.current?.zoom(-1)} />
              <HudButton icon={RotateCcw} label="Restablecer vista" iconOnly onClick={() => scene.current?.reset()} />
            </div>
            <div className="orientation" aria-hidden="true"><Compass size={26} /><span>N</span></div>
          </div>

          <div className="hud-bottom">
            <div className="scene-caption">
              <span className="caption-cross">+</span> ESPACIO DE PRUEBA
              <span className="caption-size">{dimensions} × {dimensions} m</span>
            </div>
            <footer className="scene-footer">
              <span><Mouse size={13} aria-hidden="true" /> Arrastrá para mover</span>
              <span><Move size={13} aria-hidden="true" /> Rueda para zoom</span>
              <span className="footer-hint">Flechas para mover · +/− zoom · 0 centrar</span>
            </footer>
          </div>

          {notice && <p className="hud-toast" role="status">{notice}</p>}
        </div>
      </div>

      <SlideOver open={panel === 'tables'} side="right" title="Mesas del salón" icon={List}
        onClose={() => setPanel(null)}>
        <TableDirectory key={`${generation}-${role}-${activeWaiterId}`} />
      </SlideOver>

      <SlideOver open={panel === 'build'} side="left" title="Construir espacio" icon={Hammer}
        onClose={() => setPanel(null)}>
        <SpaceBuilderPanel />
      </SlideOver>
    </div>
  )
}

export default App
