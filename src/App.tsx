import { useEffect, useMemo, useRef, useState } from 'react'
import { Hammer, List, Crosshair, Plus, Minus, RotateCcw, Users, Move, X, UtensilsCrossed, UserRoundPlus, Maximize, Minimize, Info, ChartNoAxesCombined } from 'lucide-react'
import RestaurantScene from './features/supervisor/scene/RestaurantScene'
import type { SceneActions } from './features/supervisor/scene/RestaurantScene'
import { sessionStore, useSessionStore } from './features/restaurant/state/useSessionStore'
import { selectActiveVisit, selectAssignment, selectLayout } from './features/restaurant/state/selectors'
import { can } from './features/restaurant/domain/permissions'
import RoleNavigation from './features/restaurant/components/RoleNavigation'
import TableDirectory from './features/restaurant/components/TableDirectory'
import WaiterDirectory from './features/restaurant/components/WaiterDirectory'
import SceneBoundary from './features/restaurant/components/SceneBoundary'
import SpaceBuilderPanel from './features/restaurant/components/SpaceBuilderPanel'
import SlideOver from './features/restaurant/components/hud/SlideOver'
import HudButton from './features/restaurant/components/hud/HudButton'
import MetricsPanel from './features/restaurant/components/MetricsPanel'
import VisitTimer from './features/restaurant/components/VisitTimer'
import './App.css'

export type TableAction = 'detail' | 'guests' | 'assignment' | 'orders' | 'move'
type PanelId = 'tables' | 'build' | 'waiters' | 'metrics' | TableAction
const panelTitles: Record<PanelId, string> = { tables: 'Mesas del salón', build: 'Configurar salón', waiters: 'Equipo de sala', metrics: 'Indicadores de sesión', detail: 'Detalle de mesa', guests: 'Clientes y capacidad', assignment: 'Asignar responsable', orders: 'Pedidos de la mesa', move: 'Mover mesa' }

function Salon() {
  const scene = useRef<SceneActions>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const state = useSessionStore(state => state)
  const { space, floors, tables, placements, session, transient } = state
  const activeFloor = floors[transient.activeFloorId]
  const orderedFloors = useMemo(() => Object.values(floors).sort((a, b) => a.order - b.order), [floors])
  const layout = useMemo(() => selectLayout({ space, floors, tables, placements }, transient.activeFloorId), [space, floors, tables, placements, transient.activeFloorId])
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [waiterId, setWaiterId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(session.startedAt)
  const selected = transient.selectedTableId ? tables[transient.selectedTableId] : undefined
  const waiter = waiterId ? state.waiters[waiterId] : undefined
  const visit = selected ? selectActiveVisit(state, selected.id) : undefined
  const assignment = selected ? selectAssignment(state, selected.id) : undefined
  const moving = !!transient.movePreview
  const occupied = Object.values(state.visits).filter(item => item.closedAt === null && tables[item.tableId]?.floorId === activeFloor.id).length
  const tablePanel = panel && !['tables', 'build', 'waiters', 'metrics'].includes(panel)
  const visiblePanel = tablePanel && !selected ? null : panel

  useEffect(() => sessionStore.subscribe((next, previous) => {
    if (next.session.id !== previous.session.id) {
      setPanel(null)
      setWaiterId(null)
      setNotice('')
    }
  }), [])

  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function clearTable() {
    try { state.selectTable(null); return true }
    catch {
      if (!window.confirm('Hay un pedido sin confirmar. ¿Descartar el borrador y salir de la mesa?')) return false
      state.selectTable(null, true)
      return true
    }
  }

  function selectWaiter(id: string) {
    if (!clearTable()) return false
    setWaiterId(id)
    setPanel(null)
    return true
  }

  function changeFloor(floorId: string) {
    try { state.setActiveFloor(floorId) }
    catch {
      if (!window.confirm('Hay un pedido sin confirmar. ¿Descartar el borrador y cambiar de piso?')) return
      state.setActiveFloor(floorId, true)
    }
    setPanel(null)
    setWaiterId(null)
  }

  function openPanel(next: PanelId | null) {
    state.cancelMove()
    setPanel(next)
  }

  function closePanel() {
    state.cancelMove()
    // Closing a form keeps its table and draft available in the contextual bar.
    setPanel(null)
    viewport.current?.focus({ preventScroll: true })
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { setNotice('El navegador no permite pantalla completa. El salón sigue ocupando toda la ventana.') }
  }

  return <main className="hud-shell">
    <div ref={viewport} className="scene-viewport" tabIndex={0}
      aria-label="Salón 3D. Tocá una mesa o un mozo. Flechas para desplazar, más y menos para zoom, cero para centrar."
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        if (directions[event.key]) { event.preventDefault(); scene.current?.pan(...directions[event.key]) }
        else if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault()
          if (event.key === '0') scene.current?.reset()
          else scene.current?.zoom(event.key === '-' ? -1 : 1)
        } else if (event.key === 'Escape' && !moving && clearTable()) { setWaiterId(null); setPanel(null) }
      }}>
      <SceneBoundary><RestaurantScene ref={scene} layout={layout} floorId={activeFloor.id} now={now} selectedWaiterId={waiterId}
        onSelectWaiter={selectWaiter} onSelectTable={() => { setWaiterId(null); setPanel(null) }} /></SceneBoundary>
    </div>
    <div className="hud">
      <header className="hud-top">
        <div className="brand"><span className="brand-mark">r.</span><div>restaurant<span className="brand-light">sim</span><small>SALÓN INTERACTIVO</small></div></div>
        <RoleNavigation />
        <div className="top-tools"><span className="demo-badge"><i /> Demo local</span>
          {document.fullscreenEnabled && <HudButton icon={fullscreen ? Minimize : Maximize} label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} iconOnly onClick={toggleFullscreen} />}
        </div>
      </header>
      <div className="scene-info"><span className="hud-eyebrow">VISTA DEL SALÓN / {activeFloor.name.toLocaleUpperCase('es-AR')}</span><h1>Todo pasa en la sala.</h1>
        <p>{layout.tables.length} mesas <span>·</span> {occupied} ocupadas <span>·</span> {layout.area} m²</p>
        <nav className="floor-switch" aria-label="Pisos del salón">{orderedFloors.map(floor => <button key={floor.id} type="button" aria-current={floor.id === activeFloor.id ? 'page' : undefined} onClick={() => changeFloor(floor.id)}>{floor.name}</button>)}</nav>
        <div className="scene-legend"><span><i className="free-dot" /> Libre</span><span><i className="busy-dot" /> Ocupada</span><span><i className="waiter-dot" /> Mozo</span></div>
      </div>
      <div className="camera-controls" aria-label="Controles de cámara">
        <HudButton icon={Plus} label="Acercar" iconOnly disabled={moving} onClick={() => scene.current?.zoom(1)} />
        <HudButton icon={Minus} label="Alejar" iconOnly disabled={moving} onClick={() => scene.current?.zoom(-1)} />
        <HudButton icon={RotateCcw} label="Centrar salón" iconOnly disabled={moving} onClick={() => scene.current?.reset()} />
      </div>
      <div className="bottom-stack">
        <div className="context-bar" aria-label="Acciones de la selección">
          {selected ? <>
            <div className="selection-summary"><span className="selection-icon"><UtensilsCrossed size={20} /></span><div><strong>Mesa {selected.number}</strong><small>{visit ? `${visit.guestCount}/${selected.capacity} clientes` : 'Libre'} · {assignment ? state.waiters[assignment.waiterId]?.name : 'Sin responsable'}</small>{visit && <VisitTimer visit={visit} now={now} compact />}</div></div>
            <div className="context-actions">
              <HudButton icon={Info} label="Detalle" active={panel === 'detail'} onClick={() => openPanel('detail')} />
              {can(state, 'viewDetails', selected.id) && <HudButton icon={UserRoundPlus} label="Clientes" active={panel === 'guests'} onClick={() => openPanel('guests')} />}
              {can(state, 'assignTable', selected.id) && <HudButton icon={Users} label="Asignar mozo" active={panel === 'assignment'} onClick={() => openPanel('assignment')} />}
              {visit && can(state, 'confirmOrder', selected.id) && <HudButton icon={UtensilsCrossed} label="Pedidos" tone="accent" active={panel === 'orders'} onClick={() => openPanel('orders')} />}
              {can(state, 'moveTable', selected.id) && <HudButton icon={Move} label={moving ? 'Posición' : 'Mover'} disabled={!!visit} active={moving} onClick={() => { state.beginMove(selected.id); setPanel('move') }} />}
            </div>
            <HudButton icon={X} label="Deseleccionar mesa" iconOnly onClick={() => { if (clearTable()) closePanel() }} />
          </> : waiter ? <>
            <div className="selection-summary"><span className="selection-icon" style={{ color: waiter.color }}><Users size={20} /></span><div><strong>{waiter.name}</strong><small>Mozo · atención simulada</small></div></div>
            <HudButton icon={List} label="Mesas y acciones" tone="accent" onClick={() => openPanel('waiters')} />
            <HudButton icon={X} label="Deseleccionar mozo" iconOnly onClick={() => { setWaiterId(null); closePanel() }} />
          </> : <p className="selection-hint"><Crosshair size={18} /> Tocá una mesa o un mozo para ver sus acciones.</p>}
        </div>
        <footer className="hud-bottom">
          <nav className="main-actions" aria-label="Herramientas del salón">
            <HudButton icon={List} label="Mesas" badge={layout.tables.length} active={panel === 'tables'} onClick={() => openPanel(panel === 'tables' ? null : 'tables')} />
            <HudButton icon={Users} label="Mozos" active={panel === 'waiters'} onClick={() => openPanel(panel === 'waiters' ? null : 'waiters')} />
            <HudButton icon={ChartNoAxesCombined} label="Indicadores" active={panel === 'metrics'} onClick={() => openPanel(panel === 'metrics' ? null : 'metrics')} />
            {session.activeRole === 'admin' && <HudButton icon={Hammer} label="Salón" active={panel === 'build'} onClick={() => openPanel(panel === 'build' ? null : 'build')} />}
          </nav>
          <p className="camera-hint">Arrastrá para desplazar <span>·</span> Pellizcá o usá la rueda para zoom</p>
          <span className="session-note">SESIÓN DEMO · {new Date(session.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </div>
      {notice && <p className="hud-toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></p>}
    </div>
    <SlideOver open={!!visiblePanel} title={visiblePanel ? panelTitles[visiblePanel] : 'Opciones'} icon={visiblePanel === 'waiters' ? Users : visiblePanel === 'metrics' ? ChartNoAxesCombined : List} onClose={closePanel}>
      {visiblePanel === 'build' ? <SpaceBuilderPanel /> : visiblePanel === 'metrics' ? <MetricsPanel /> : visiblePanel === 'waiters' ? <WaiterDirectory selectedId={waiterId} onSelect={selectWaiter} onInspect={id => { if (selectWaiter(id)) setPanel('waiters') }} onTableSelected={() => { setWaiterId(null); setPanel(session.activeRole === 'waiter' ? 'guests' : 'assignment') }} /> : visiblePanel ? <TableDirectory key={`${selected?.id ?? 'list'}-${visiblePanel}`} mode={visiblePanel === 'tables' ? 'list' : visiblePanel as TableAction} now={now} onSelected={() => { setWaiterId(null); setPanel(null) }} /> : null}
    </SlideOver>
  </main>
}

export default function App() {
  return <Salon />
}
