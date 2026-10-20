import { Suspense, useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { useSessionStore } from '../../restaurant/state/useSessionStore'
import { validatePlacement } from '../../restaurant/domain/movement'
import DiningFurniture from './DiningFurniture'

export default function MovePreview() {
  const { gl, camera } = useThree()
  const state = useSessionStore(state => state)
  const preview = state.transient.movePreview
  const gesture = useRef<{ pointerId: number; offsetX: number; offsetZ: number } | null>(null)
  const update = state.previewMove
  const cancel = state.cancelMove
  const [error, setError] = useState('')

  useEffect(() => {
    const canvas = gl.domElement
    const raycaster = new Raycaster()
    const plane = new Plane(new Vector3(0, 1, 0), -0.5)
    const move = (event: PointerEvent) => {
      const active = gesture.current
      if (!active || event.pointerId !== active.pointerId) return
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
      const hit = raycaster.ray.intersectPlane(plane, new Vector3())
      if (hit) update(hit.x - active.offsetX, hit.z - active.offsetZ)
    }
    const finish = (event: PointerEvent) => {
      if (gesture.current?.pointerId !== event.pointerId) return
      gesture.current = null
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    }
    const abort = (event: PointerEvent) => {
      if (gesture.current?.pointerId !== event.pointerId) return
      finish(event)
      cancel()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', finish)
    canvas.addEventListener('pointercancel', abort)
    canvas.addEventListener('lostpointercapture', abort)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', finish)
      canvas.removeEventListener('pointercancel', abort)
      canvas.removeEventListener('lostpointercapture', abort)
      const active = gesture.current
      gesture.current = null
      if (active && canvas.hasPointerCapture(active.pointerId)) canvas.releasePointerCapture(active.pointerId)
    }
  }, [gl, camera, update, cancel])

  if (!preview) return null
  let invalid = ''
  try { validatePlacement(state, preview) } catch (cause) { invalid = cause instanceof Error ? cause.message : 'Posición inválida.' }
  const valid = !invalid
  const position = Number.isFinite(preview.x) && Number.isFinite(preview.z) ? preview : state.placements[preview.tableId]
  return <><group position={[position.x, 0, position.z]} onPointerDown={event => {
    if (event.button !== 0 || gesture.current) return
    event.stopPropagation()
    const hit = event.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -0.5), new Vector3())
    if (!hit) return
    gesture.current = { pointerId: event.pointerId, offsetX: hit.x - position.x, offsetZ: hit.z - position.z }
    gl.domElement.setPointerCapture(event.pointerId)
  }} onClick={event => event.stopPropagation()}>
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[1.45, 0.8, 1.45]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <Suspense fallback={null}><DiningFurniture capacity={state.tables[preview.tableId].capacity} /></Suspense>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <ringGeometry args={[0.73, 0.79, 48]} />
      <meshBasicMaterial color={valid ? '#4b9664' : '#bd493d'} />
    </mesh>
  </group>
    <Html position={[position.x, 1.8, position.z]} center zIndexRange={[60, 50]}>
      <div className="move-confirm-overlay" onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()} onKeyDown={event => {
          event.stopPropagation()
          if (event.key === 'Escape') {
            cancel()
            gl.domElement.closest<HTMLElement>('.scene-viewport')?.focus({ preventScroll: true })
          }
        }}>
        <div className="move-confirm-actions">
          <button type="button" className="move-accept" disabled={!valid}
            aria-label="Confirmar posición de la mesa" title="Confirmar posición"
            onClick={() => {
              try {
                state.moveTable({ ...preview, commandId: crypto.randomUUID() })
                gl.domElement.closest<HTMLElement>('.scene-viewport')?.focus({ preventScroll: true })
              } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.') }
            }}>✓</button>
          <button type="button" aria-label="Cancelar movimiento de la mesa" title="Cancelar movimiento"
            onClick={() => {
              cancel()
              gl.domElement.closest<HTMLElement>('.scene-viewport')?.focus({ preventScroll: true })
            }}>×</button>
        </div>
        {(invalid || error) && <p role="status">{invalid || error}</p>}
      </div>
    </Html>
  </>
}
