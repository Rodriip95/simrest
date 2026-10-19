import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { Vector3 } from 'three'

export type SceneLabel = {
  id: string
  position: [number, number, number]
  text: string
  kind: 'table' | 'waiter'
  selected: boolean
  onSelect?: () => void
}
export type LabelElements = RefObject<Map<string, HTMLElement>>

// Project into the React-owned HTML layer without creating a separate React root
// for each avatar. Updates happen only when the demand-rendered scene draws.
export function LabelProjection({ labels, elements }: { labels: SceneLabel[]; elements: LabelElements }) {
  useFrame(({ camera, size }) => {
    const point = new Vector3()
    for (const label of labels) {
      const element = elements.current.get(label.id)
      if (!element) continue
      point.set(...label.position).project(camera)
      element.style.transform = `translate(${(point.x + 1) * size.width / 2}px, ${(1 - point.y) * size.height / 2}px) translate(-50%, -50%)`
      element.style.visibility = point.z < -1 || point.z > 1 ? 'hidden' : 'visible'
    }
  })
  return null
}

export default function SceneLabels({ labels, elements, moving }: { labels: SceneLabel[]; elements: LabelElements; moving: boolean }) {
  return <div className="scene-labels">{labels.map(label => label.kind === 'waiter'
    ? <button key={label.id} ref={element => { if (element) elements.current.set(label.id, element); else elements.current.delete(label.id) }}
      className="avatar-label" disabled={moving} aria-pressed={label.selected} onClick={label.onSelect}>{label.text}</button>
    : <span key={label.id} ref={element => { if (element) elements.current.set(label.id, element); else elements.current.delete(label.id) }}
      className={`table-label${label.selected ? ' is-selected' : ''}`}>{label.text}</span>)}</div>
}
