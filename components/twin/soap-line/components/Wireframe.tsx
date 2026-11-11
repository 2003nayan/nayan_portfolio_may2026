import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface WireframeProps {
  // The model file whose machine is drawn as wireframe. useGLTF returns the
  // same cached scene Model/StaticModel render, so this changes that scene.
  url: string
  enabled: boolean
  color: string
}

// How often the scene is re-checked while wireframe is on, seconds. Parts swap
// their materials at runtime (MeshOpacity clones one per see-through toggle,
// ConveyorBelt swaps in its texture), and a swapped-in material has to be
// caught and drawn as wireframe too.
const RESCAN_SECONDS = 0.25

type Tagged = THREE.MeshStandardMaterial & { userData: { wireframeOriginalColor?: string } }

function materialsOf(mesh: THREE.Mesh): Tagged[] {
  return ([] as THREE.Material[]).concat(mesh.material) as Tagged[]
}

/**
 * Draws the machine as coloured wireframe, the way the dashboard's earlier
 * viewer did.
 *
 * Only the model's own named parts are changed. The product - noodles, heap,
 * bars, billets, soaps, flakes and the fills inside the machines - is created by
 * the animation components, unnamed or instanced, and stays solid: thousands of
 * overlapping wireframe pieces only scribble over the machine's outline.
 * Materials an instanced mesh uses are skipped for the same reason, in case
 * one is also on a named part.
 *
 * Each material's own colour is stashed in its userData before it is recoloured,
 * so turning wireframe off restores it - and a clone made meanwhile carries the
 * stash with it.
 */
export function Wireframe({ url, enabled, color }: WireframeProps) {
  const { scene } = useGLTF(url)
  const touched = useRef(new Set<Tagged>())
  const sinceScan = useRef(Infinity)

  const apply = () => {
    const productMaterials = new Set<THREE.Material>()
    const parts: THREE.Mesh[] = []
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
        for (const m of materialsOf(mesh)) productMaterials.add(m)
      } else if (mesh.name) {
        parts.push(mesh)
      }
    })
    for (const mesh of parts) {
      for (const material of materialsOf(mesh)) {
        if (productMaterials.has(material) || !material.color) continue
        if (material.userData.wireframeOriginalColor === undefined) {
          material.userData.wireframeOriginalColor = `#${material.color.getHexString()}`
        }
        if (!material.wireframe || `#${material.color.getHexString()}` !== color.toLowerCase()) {
          material.wireframe = true
          material.color.set(color)
        }
        touched.current.add(material)
      }
    }
  }

  const restore = () => {
    const restoreOne = (material: Tagged) => {
      const original = material.userData.wireframeOriginalColor
      if (original === undefined) return
      material.wireframe = false
      material.color.set(original)
      delete material.userData.wireframeOriginalColor
    }
    for (const material of touched.current) restoreOne(material)
    // Clones made from a wireframed material since the last scan carry the stash
    // but were never recorded.
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) for (const material of materialsOf(mesh)) restoreOne(material)
    })
    touched.current.clear()
  }

  useEffect(() => {
    if (enabled) {
      sinceScan.current = Infinity
      return
    }
    restore()
    // restore/apply read only refs and props current at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scene])

  useEffect(() => () => restore(), [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!enabled) return
    sinceScan.current += delta
    if (sinceScan.current < RESCAN_SECONDS) return
    sinceScan.current = 0
    apply()
  })

  return null
}
