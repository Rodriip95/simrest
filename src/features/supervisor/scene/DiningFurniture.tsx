import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { AnimationMixer } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { customerModel, diningLayout, DINING_SCALE } from './diningLayout'

function Furniture({ name }: { name: string }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/furniture/${name}.glb`)
  const model = useMemo(() => scene.clone(true), [scene])
  return <primitive object={model} dispose={null} />
}

function SeatedCustomer({ id }: { id: string }) {
  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}models/customers/${customerModel(id)}.glb`)
  const model = useMemo(() => {
    const instance = clone(scene)
    const sit = animations.find(clip => clip.name === 'Sit')
    if (sit) {
      const mixer = new AnimationMixer(instance)
      mixer.clipAction(sit).play()
      mixer.setTime(0)
      instance.updateMatrixWorld(true)
      // A static seated pose needs no per-frame mixer or animation loop.
    }
    return instance
  }, [scene, animations])
  return <primitive object={model} dispose={null} />
}

export default function DiningFurniture({ capacity, customerIds = [] }: { capacity: number; customerIds?: string[] }) {
  const layout = diningLayout(capacity)
  return <group scale={DINING_SCALE}>
    <group scale={[layout.tableWidth, 1, layout.tableWidth]}>
      <Furniture name={layout.table} />
    </group>
    {layout.seats.map((seat, index) => <group key={index} position={[seat.x, 0, seat.z]} rotation={[0, seat.rotation, 0]}>
      <Furniture name={index % 3 === 0 ? 'chair-sage' : index % 3 === 1 ? 'chair-terracotta' : 'chair-cream'} />
      {customerIds[index] && <SeatedCustomer key={customerIds[index]} id={customerIds[index]} />}
    </group>)}
  </group>
}
