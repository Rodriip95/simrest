import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

// Deterministic puffs: no texture downloads, timers or per-frame React updates.
const puffs = Array.from({ length: 16 }, (_, i) => {
  const angle = i * Math.PI * 2 / 16
  return {
    x: Math.cos(angle),
    z: Math.sin(angle),
    rise: 0.6 + (i % 4) * 0.22,
    size: 0.38 + (i % 3) * 0.1,
    color: ['#f4f0fa', '#d8cde5', '#ebe4f2', '#fffaf3'][i % 4],
  }
})

export default function SmokeEffect({ x, z, onComplete }: { x: number; z: number; onComplete: () => void }) {
  const meshes = useRef<(Mesh | null)[]>([])
  const elapsed = useRef(0)
  const finished = useRef(false)
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useFrame(({ invalidate }, delta) => {
    if (finished.current) return
    elapsed.current += Math.min(delta, 0.05)
    const progress = Math.min(elapsed.current / (reducedMotion ? 0.2 : 1.1), 1)
    const expansion = 1 - (1 - progress) ** 3
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return
      const puff = puffs[i]
      const spread = reducedMotion ? 0.35 : 0.15 + expansion * 1.1
      mesh.position.set(puff.x * spread, 0.5 + (reducedMotion ? 0 : expansion * puff.rise), puff.z * spread)
      mesh.scale.setScalar(puff.size * (reducedMotion ? 1 : 0.6 + expansion))
      if (!Array.isArray(mesh.material)) mesh.material.opacity = (1 - progress) ** 1.5 * 0.85
    })
    if (progress === 1) {
      finished.current = true
      onComplete()
    } else invalidate()
  })

  return (
    <group position={[x, 0, z]}>
      {puffs.map((puff, i) => (
        <mesh key={i} ref={mesh => { meshes.current[i] = mesh }} raycast={() => {}} position={[puff.x * 0.15, 0.5, puff.z * 0.15]} scale={puff.size * 0.6}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color={puff.color} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
