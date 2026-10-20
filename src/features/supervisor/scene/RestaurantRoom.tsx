import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function woodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!
  const colors = ['#a96a37', '#b47740', '#ad703b', '#ba7b43', '#a86b38', '#b57941', '#b1733d', '#ae713c']
  let seed = 42
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  ctx.fillStyle = '#70472d'
  ctx.fillRect(0, 0, 1024, 1024)
  for (let row = 0; row < 8; row++) {
    const offset = (row % 3) * 170
    for (let column = -1; column < 3; column++) {
      const x = column * 512 + offset
      const y = row * 128
      ctx.fillStyle = colors[Math.floor(random() * colors.length)]
      ctx.fillRect(x + 2, y + 2, 508, 124)
      // Fine, low-contrast grain follows each plank; seams stay visible at a distance.
      for (let line = 0; line < 28; line++) {
        const gy = y + 5 + random() * 116
        ctx.strokeStyle = random() > 0.5 ? 'rgba(63,32,14,0.09)' : 'rgba(244,194,126,0.12)'
        ctx.lineWidth = 0.6 + random()
        ctx.beginPath()
        ctx.moveTo(x + 3, gy)
        ctx.bezierCurveTo(x + 160, gy - 4, x + 340, gy + 4, x + 508, gy)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,218,162,0.16)'
      ctx.fillRect(x + 3, y + 3, 506, 1)
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  return texture
}

export default function RestaurantRoom({ side, onFloorClick }: { side: number; onFloorClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const texture = useMemo(() => {
    const map = woodTexture()
    map.repeat.set(side / 3.6, side / 1.92)
    return map
  }, [side])
  useEffect(() => () => texture.dispose(), [texture])
  const thickness = 0.16
  const height = 1.7
  const back = -side / 2 - thickness / 2
  return <group>
    <mesh position={[0, -0.19, 0]}>
      <boxGeometry args={[side + thickness * 2, 0.36, side + thickness * 2]} />
      <meshStandardMaterial color="#493326" roughness={0.95} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, 0]} onClick={onFloorClick}>
      <planeGeometry args={[side, side]} />
      <meshStandardMaterial map={texture} roughness={0.83} />
    </mesh>
    <mesh position={[0, height / 2, back]}>
      <boxGeometry args={[side + thickness * 2, height, thickness]} />
      <meshStandardMaterial color="#9f5734" roughness={0.95} />
    </mesh>
    <mesh position={[back, height / 2, 0]}>
      <boxGeometry args={[thickness, height, side]} />
      <meshStandardMaterial color="#ac643c" roughness={0.95} />
    </mesh>
  </group>
}
