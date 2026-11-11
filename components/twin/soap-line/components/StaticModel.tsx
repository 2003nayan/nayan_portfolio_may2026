import { useEffect, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface StaticModelProps {
  url: string
  // The same offset the main model is given. The two files are sections of one
  // CAD scene exported separately, so they share coordinates: given the same
  // offset, this one continues the line exactly where the other ends.
  position: [number, number, number]
  // Part visibility, shared with the main model: the same click-to-select mode,
  // the same hidden list, the same selection callback.
  selectionMode: boolean
  hiddenUuids: Set<string>
  onMeshSelect: (mesh: THREE.Mesh) => void
  // Animation for this model, drawn in its own coordinates.
  children?: (scene: THREE.Object3D) => ReactNode
}

/** A model shown as-is, plus whatever animation is passed in as children. */
export function StaticModel({ url, position, selectionMode, hiddenUuids, onMeshSelect, children }: StaticModelProps) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    // The stamper's export gives every material a 1x1 occlusion texture whose
    // red channel is 0 - "fully occluded" - which strips all ambient and sky
    // light, so any face turned away from the one directional light rendered
    // pure black. Nothing in this model carries real baked occlusion, so it is
    // dropped rather than corrected.
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      for (const material of ([] as THREE.Material[]).concat(mesh.material)) {
        const standard = material as THREE.MeshStandardMaterial
        if (!standard.aoMap) continue
        standard.aoMap = null
        standard.needsUpdate = true
      }
    })
  }, [scene])

  // Hidden parts, as the main model does it: hidden meshes also stop taking
  // clicks, so they cannot swallow a click meant for what is now behind them.
  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      const hidden = hiddenUuids.has(mesh.uuid)
      mesh.visible = !hidden
      if (hidden) {
        mesh.raycast = () => {}
      } else {
        delete (mesh as { raycast?: THREE.Mesh['raycast'] }).raycast
      }
    })
  }, [scene, hiddenUuids])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!selectionMode) return
    event.stopPropagation()
    const mesh = event.object as THREE.Mesh
    if (!mesh.isMesh) return
    onMeshSelect(mesh)
  }

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!selectionMode) return
    event.stopPropagation()
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    if (!selectionMode) return
    document.body.style.cursor = 'auto'
  }

  return (
    <primitive
      object={scene}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {children?.(scene)}
    </primitive>
  )
}
