import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ComponentRef, Ref } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE, TOUCH, Vector3 } from 'three'
import { TABLE_SIZE } from '../domain/space'
import type { SpaceLayout } from '../domain/space'
import { sessionStore, useSessionStore } from '../../restaurant/state/useSessionStore'
import { DomainError } from '../../restaurant/domain/commands'
import MovePreview from './MovePreview'
import SmokeEffect from './SmokeEffect'
import SceneLabels, { LabelProjection } from './SceneLabels'
import type { LabelElements, SceneLabel } from './SceneLabels'
import { formatVisitDuration, visitDurationMs } from '../../restaurant/domain/visitDuration'
import { selectActiveVisit, selectAssignment } from '../../restaurant/state/selectors'

export type SceneActions = {
  zoom: (direction: number) => void
  pan: (horizontal: number, vertical: number) => void
  reset: () => void
}

type SceneProps = {
  layout: SpaceLayout
  floorId: string
  now: number
  selectedWaiterId: string | null
  onSelectWaiter: (id: string) => void
  onSelectTable: () => void
}

function SceneContents({ actionsRef, layout, floorId, selectedWaiterId, onSelectWaiter, onSelectTable, labels, elements }: SceneProps & { actionsRef: Ref<SceneActions>; labels: SceneLabel[]; elements: LabelElements }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { size, camera, gl } = useThree()
  const selectedId = useSessionStore(state => state.transient.selectedTableId)
  const setSelectedId = useSessionStore(state => state.selectTable)
  const movingId = useSessionStore(state => state.transient.movePreview?.tableId)
  const state = useSessionStore(state => state)
  const [smoke, setSmoke] = useState<SpaceLayout['tables']>([])
  useEffect(() => sessionStore.subscribe((next, previous) => {
    if (next.session.id !== previous.session.id) { setSmoke([]); return }
    const removed = Object.values(previous.placements).filter(item => !next.tables[item.tableId])
    if (removed.length) setSmoke(current => [...current, ...removed.map(item => ({ id: item.tableId, x: item.x, z: item.z }))])
  }), [])
  const selectTable = (id: string | null) => {
    try {
      setSelectedId(id)
      onSelectTable()
      return true
    } catch (cause) {
      if (cause instanceof DomainError && cause.code === 'UNRESOLVED_DRAFT') {
        if (window.confirm('Hay un pedido sin confirmar. ¿Descartar el borrador y cambiar de mesa?')) {
          setSelectedId(id, true)
          onSelectTable()
          return true
        }
        return false
      }
      throw cause
    }
  }
  const closeMenu = () => {
    if (selectTable(null)) gl.domElement.closest<HTMLElement>('.scene-viewport')?.focus({ preventScroll: true })
  }
  const side = layout.side
  const initialPosition = useMemo(() => {
    const halfFov = Math.atan(Math.tan(21 * Math.PI / 180) * Math.min(1, size.width / Math.max(1, size.height)))
    const distance = (side * 0.75 + 1) / Math.sin(halfFov)
    return new Vector3(13, 15, 16).normalize().multiplyScalar(distance)
  }, [side, size.width, size.height])
  const maxDistance = initialPosition.length() * 2
  const lines = Array.from({ length: Math.floor(side) + 1 }, (_, i) => i - side / 2)

  useEffect(() => {
    camera.position.copy(initialPosition)
    camera.lookAt(0, 0, 0)
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
  }, [camera, initialPosition, state.session.id, floorId])

  useImperativeHandle(actionsRef, () => ({
    zoom(direction) {
      const control = controls.current
      if (!control || movingId) return
      const offset = control.object.position.clone().sub(control.target)
      const distance = Math.max(2, Math.min(maxDistance, offset.length() * (direction > 0 ? 0.8 : 1.25)))
      control.object.position.copy(control.target).add(offset.setLength(distance))
      control.update()
    },
    pan(horizontal, vertical) {
      const control = controls.current
      if (!control || movingId) return
      const right = new Vector3().setFromMatrixColumn(control.object.matrix, 0)
      const forward = new Vector3().crossVectors(control.object.up, right)
      const delta = right.multiplyScalar(horizontal).add(forward.multiplyScalar(vertical))
      control.target.add(delta)
      control.object.position.add(delta)
      control.update()
    },
    reset() {
      const control = controls.current
      if (!control || movingId) return
      control.target.set(0, 0, 0)
      control.object.position.copy(initialPosition)
      control.update()
    },
  }), [initialPosition, maxDistance, movingId])

  return (
    <>
      <color attach="background" args={['#090f19']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 12, 8]} intensity={2.2} />
      <mesh position={[0, -0.24, 0]}>
        <boxGeometry args={[side, 0.45, side]} />
        <meshStandardMaterial color="#142535" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, 0]} onClick={event => {
        if (movingId || event.delta > 5 || event.button !== 0) return
        event.stopPropagation()
        closeMenu()
      }}>
        <planeGeometry args={[side, side]} />
        <meshStandardMaterial color="#142330" roughness={1} />
      </mesh>
      {lines.map((coordinate, i) => (
        <mesh key={`x-${i}`} position={[coordinate, 0, 0]}>
          <boxGeometry args={[0.012, 0.005, side]} /><meshBasicMaterial color="#263d4e" />
        </mesh>
      ))}
      {lines.map((coordinate, i) => (
        <mesh key={`z-${i}`} position={[0, 0, coordinate]}>
          <boxGeometry args={[side, 0.005, 0.012]} /><meshBasicMaterial color="#263d4e" />
        </mesh>
      ))}
      {layout.tables.map(table => {
        const visit = selectActiveVisit(state, table.id)
        const showGuests = state.session.activeRole !== 'waiter' || selectAssignment(state, table.id)?.waiterId === state.session.activeWaiterId
        return <group key={table.id}>
          <mesh position={[table.x, TABLE_SIZE / 2, table.z]} onClick={event => {
            event.stopPropagation()
            if (!movingId && event.delta <= 5 && event.button === 0) selectTable(table.id)
          }}>
            <boxGeometry args={[TABLE_SIZE, TABLE_SIZE, TABLE_SIZE]} />
            <meshStandardMaterial color={visit ? '#c79a65' : '#477e7b'}
              emissive={table.id === selectedId ? '#39ecff' : '#000000'} emissiveIntensity={0.3} roughness={0.65} />
          </mesh>
          {showGuests && visit?.customerIds.map((id, index) => {
            const angle = index * Math.PI / 4
            return <mesh key={id} position={[table.x + Math.cos(angle) * 0.78, 0.16, table.z + Math.sin(angle) * 0.78]} raycast={() => null}>
              <sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#e6d4b4" />
            </mesh>
          })}
        </group>
      })}
      {Object.values(state.waiters).filter(waiter => waiter.active && (state.session.activeRole !== 'waiter' || waiter.id === state.session.activeWaiterId)).map((waiter, index) => {
        const presence = state.presences[waiter.id]
        const placement = presence?.attendingTableId && state.tables[presence.attendingTableId]?.floorId === floorId ? state.placements[presence.attendingTableId] : undefined
        const x = placement ? placement.x + 0.78 : -side / 2 + 0.3 + index * (side - 0.6) / 3
        const z = placement ? placement.z + 0.78 : side / 2 - 0.3
        return <group key={waiter.id} position={[x, 0.18, z]}>
          <mesh onClick={event => {
            event.stopPropagation()
            if (!movingId && event.delta <= 5 && event.button === 0) onSelectWaiter(waiter.id)
          }}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshStandardMaterial color={waiter.color} emissive={waiter.id === selectedWaiterId ? '#39ecff' : '#000000'} emissiveIntensity={0.5} />
          </mesh>
        </group>
      })}
      {movingId && <MovePreview key={movingId} />}
      {smoke.map(table => <SmokeEffect key={table.id} x={table.x} z={table.z}
        onComplete={() => setSmoke(current => current.filter(item => item.id !== table.id))} />)}
      <LabelProjection labels={labels} elements={elements} />
      <OrbitControls ref={controls} makeDefault enabled={!movingId} enableRotate={false} enableDamping={false}
        screenSpacePanning={false} minDistance={2} maxDistance={maxDistance} zoomSpeed={0.8}
        mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
        onChange={() => {
          const control = controls.current
          if (!control) return
          const previous = control.target.clone()
          control.target.clamp(new Vector3(-side / 2, 0, -side / 2), new Vector3(side / 2, 0, side / 2))
          control.object.position.add(control.target.clone().sub(previous))
        }} />
    </>
  )
}

export default function RestaurantScene({ ref, ...props }: SceneProps & { ref: Ref<SceneActions> }) {
  const state = useSessionStore(state => state)
  const elements = useRef(new Map<string, HTMLElement>())
  const side = props.layout.side
  const labels: SceneLabel[] = props.layout.tables.map(table => {
    const visit = selectActiveVisit(state, table.id)
    return { id: table.id, position: [table.x, 1.12, table.z], kind: 'table',
      selected: table.id === state.transient.selectedTableId,
      text: `${state.tables[table.id].number}${visit ? ` · ${formatVisitDuration(visitDurationMs(visit, props.now))}` : ''}` }
  })
  Object.values(state.waiters).filter(waiter => waiter.active && (state.session.activeRole !== 'waiter' || waiter.id === state.session.activeWaiterId)).forEach((waiter, index) => {
    const presence = state.presences[waiter.id]
    const placement = presence?.attendingTableId && state.tables[presence.attendingTableId]?.floorId === props.floorId ? state.placements[presence.attendingTableId] : undefined
    const x = placement ? placement.x + 0.78 : -side / 2 + 0.3 + index * (side - 0.6) / 3
    const z = placement ? placement.z + 0.78 : side / 2 - 0.3
    labels.push({ id: waiter.id, position: [x, 0.6, z], kind: 'waiter', text: waiter.name,
      selected: waiter.id === props.selectedWaiterId, onSelect: () => props.onSelectWaiter(waiter.id) })
  })
  return <>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [13, 15, 16], fov: 42 }}
      fallback={<div className="canvas-fallback">Tu navegador no pudo iniciar la vista 3D. Usá la lista de mesas para continuar.</div>}>
      <SceneContents actionsRef={ref} {...props} labels={labels} elements={elements} />
    </Canvas>
    <SceneLabels labels={labels} elements={elements} moving={!!state.transient.movePreview} />
  </>
}
