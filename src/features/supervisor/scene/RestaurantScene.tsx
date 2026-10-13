import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ComponentRef, Ref } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE, TOUCH, Vector3 } from 'three'
import { TABLE_SIZE } from '../domain/space'
import type { SpaceLayout } from '../domain/space'
import TableMenu from './TableMenu'
import SmokeEffect from './SmokeEffect'
import { useSessionStore } from '../../restaurant/state/useSessionStore'
import { DomainError } from '../../restaurant/domain/commands'
import MovePreview from './MovePreview'

export type SceneActions = {
  zoom: (direction: number) => void
  pan: (horizontal: number, vertical: number) => void
  reset: () => void
}

type SceneProps = {
  layout: SpaceLayout
  onDeleteTable: (id: string) => void
}

function SceneContents({ actionsRef, layout, onDeleteTable }: SceneProps & { actionsRef: Ref<SceneActions> }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { size, camera, gl } = useThree()
  const selectedId = useSessionStore(state => state.transient.selectedTableId)
  const setSelectedId = useSessionStore(state => state.selectTable)
  const movingId = useSessionStore(state => state.transient.movePreview?.tableId)
  const [smoke, setSmoke] = useState<SpaceLayout['tables']>([])
  const selectedTable = layout.tables.find(table => table.id === selectedId)
  const selectTable = (id: string | null) => {
    try {
      setSelectedId(id)
      return true
    } catch (cause) {
      if (cause instanceof DomainError && cause.code === 'UNRESOLVED_DRAFT') {
        if (window.confirm('Hay un pedido sin confirmar. ¿Descartar el borrador y cambiar de mesa?')) {
          setSelectedId(id, true)
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
  }, [camera, initialPosition])

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
      <color attach="background" args={['#eeefeb']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 12, 8]} intensity={2.2} />
      <mesh position={[0, -0.24, 0]}>
        <boxGeometry args={[side, 0.45, side]} />
        <meshStandardMaterial color="#d1ccbf" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, 0]} onClick={event => {
        if (movingId || event.delta > 5 || event.button !== 0) return
        event.stopPropagation()
        closeMenu()
      }}>
        <planeGeometry args={[side, side]} />
        <meshStandardMaterial color="#faf7ee" roughness={1} />
      </mesh>
      {lines.map((coordinate, i) => (
        <mesh key={`x-${i}`} position={[coordinate, 0, 0]}>
          <boxGeometry args={[0.012, 0.005, side]} /><meshBasicMaterial color="#deddd3" />
        </mesh>
      ))}
      {lines.map((coordinate, i) => (
        <mesh key={`z-${i}`} position={[0, 0, coordinate]}>
          <boxGeometry args={[side, 0.005, 0.012]} /><meshBasicMaterial color="#deddd3" />
        </mesh>
      ))}
      {layout.tables.map(table => (
        <mesh key={table.id} position={[table.x, TABLE_SIZE / 2, table.z]} onClick={event => {
          event.stopPropagation()
          if (!movingId && event.delta <= 5 && event.button === 0) selectTable(table.id)
        }}>
          <boxGeometry args={[TABLE_SIZE, TABLE_SIZE, TABLE_SIZE]} />
          <meshStandardMaterial color={['#8bb6a1', '#b1a6c8', '#d8b68a'][(Number(table.id.replace('table-', '')) - 1) % 3]}
            emissive={table.id === selectedId ? '#426746' : '#000000'} emissiveIntensity={0.4} roughness={0.8} />
        </mesh>
      ))}
      {movingId && <MovePreview key={movingId} />}
      {selectedTable && !movingId ? (
        <TableMenu key={selectedTable.id} table={selectedTable} onClose={closeMenu} onDelete={() => {
          onDeleteTable(selectedTable.id)
          setSmoke(current => [...current, selectedTable])
          closeMenu()
        }} />
      ) : null}
      {smoke.map(table => (
        <SmokeEffect key={table.id} x={table.x} z={table.z}
          onComplete={() => setSmoke(current => current.filter(effect => effect.id !== table.id))} />
      ))}
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

export default function RestaurantScene({ ref, layout, onDeleteTable }: SceneProps & { ref: Ref<SceneActions> }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [13, 15, 16], fov: 42 }}
      fallback={<div className="canvas-fallback">Tu navegador no pudo iniciar la vista 3D. Probá activar la aceleración gráfica.</div>}>
      <SceneContents actionsRef={ref} layout={layout} onDeleteTable={onDeleteTable} />
    </Canvas>
  )
}
