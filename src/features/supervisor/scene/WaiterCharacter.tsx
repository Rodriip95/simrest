import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { AnimationMixer } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

type Props = {
  variant: 'male' | 'female'
  animation?: 'Idle' | 'Walk'
}

/** Walk is in place: the caller owns position, heading and route planning. */
export default function WaiterCharacter({ variant, animation = 'Idle' }: Props) {
  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}models/waiter-${variant}.glb`)
  const model = useMemo(() => clone(scene), [scene])
  const mixer = useMemo(() => new AnimationMixer(model), [model])
  const invalidate = useThree(state => state.invalidate)

  useEffect(() => {
    const clip = animations.find(item => item.name === animation)
    if (!clip) return
    const action = mixer.clipAction(clip)
    action.reset().fadeIn(0.15).play()
    invalidate()
    return () => { action.fadeOut(0.15) }
  }, [animation, animations, invalidate, mixer])

  useEffect(() => () => {
    mixer.stopAllAction()
    mixer.uncacheRoot(model)
  }, [mixer, model])

  useFrame((state, delta) => {
    mixer.update(Math.min(delta, 0.1))
    state.invalidate()
  })

  return <primitive object={model} scale={0.55} dispose={null} />
}
