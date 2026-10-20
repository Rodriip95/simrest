import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { AnimationMixer } from 'three'

const customers = JSON.parse(readFileSync(new URL('../public/models/customers/manifest.json', import.meta.url), 'utf8'))
const models = ['waiter-male.glb', 'waiter-female.glb', ...customers.map(customer => `customers/${customer.model}`)]
for (const variant of models) {
  const bytes = readFileSync(new URL(`../public/models/${variant}`, import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  assert.deepEqual(gltf.animations.map(clip => clip.name).sort(), variant.startsWith('customers/') ? ['Idle', 'Sit', 'Walk'] : ['Idle', 'Walk'])
  const first = clone(gltf.scene)
  const second = clone(gltf.scene)
  const meshes = []
  first.traverse(object => { if (object.isSkinnedMesh) meshes.push(object) })
  assert.ok(meshes.length)
  assert.equal(meshes[0].skeleton.bones.length, 16)
  assert.equal(first.getObjectByName('Cube'), undefined)
  for (const mesh of meshes) {
    const weights = mesh.geometry.getAttribute('skinWeight')
    for (let i = 0; i < weights.count; i++) {
      assert.ok(Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1) < 0.001)
    }
  }
  const mixer = new AnimationMixer(first)
  const walk = gltf.animations.find(clip => clip.name === 'Walk')
  assert.equal(walk.duration, 1)
  mixer.clipAction(walk).play()
  mixer.setTime(0)
  const initial = first.getObjectByName('ThighL').quaternion.clone()
  mixer.setTime(0.25)
  const moved = first.getObjectByName('ThighL').quaternion
  assert.ok(initial.angleTo(moved) > 0.1, 'Walking must move the leg')
  assert.ok(second.getObjectByName('ThighL').quaternion.angleTo(moved) > 0.1, 'Instances need independent skeletons')
  mixer.setTime(1)
  assert.ok(initial.angleTo(first.getObjectByName('ThighL').quaternion) < 0.001, 'Walk must loop')
  const sit = gltf.animations.find(clip => clip.name === 'Sit')
  if (sit) {
    mixer.stopAllAction()
    mixer.clipAction(sit).play()
    mixer.setTime(0)
    assert.ok(initial.angleTo(first.getObjectByName('ThighL').quaternion) > 1.5, 'Sit must bend hips by 90 degrees')
  }
  for (const clip of gltf.animations) {
    for (const track of clip.tracks) assert.equal(track.times[0], 0)
  }
  console.log(`${variant}: ${bytes.length} bytes; 16 bones; Idle/Walk; normalized weights; independent skeleton; seamless loop OK`)
}
