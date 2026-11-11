import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface ConveyorBeltConfig {
  running: boolean
  // UV units per second. Sign gives scroll direction.
  speed: number
  // Which UV axis the pattern scrolls along - flip this if it scrolls
  // across the belt's width instead of along its length.
  uvAxis: 'x' | 'y'
}

interface ConveyorBeltProps {
  scene: THREE.Object3D
  meshName: string
  config: ConveyorBeltConfig
}

// Draws a small tileable diagonal-stripe pattern so it reads as belt
// segments once repeated and scrolled.
function createStripeTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#5c5c5c'
  ctx.lineWidth = size / 8
  for (let x = -size; x < size * 2; x += size / 4) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + size, size)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 2)
  return texture
}

// Makes the belt LOOK like it's flowing without ever moving the mesh: the
// mesh keeps its real-world position (between wherever the actual rollers
// are), and only the texture's UV offset scrolls. The source model has no
// usable texture on this mesh (flat color material, confirmed), so this
// generates its own tileable pattern rather than depending on the asset.
export function ConveyorBelt({ scene, meshName, config }: ConveyorBeltProps) {
  const texture = useMemo(() => createStripeTexture(), [])
  const originalMaterialRef = useRef<THREE.Mesh['material'] | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    const object = scene.getObjectByName(meshName)
    if (!object || !(object as THREE.Mesh).isMesh) return
    const mesh = object as THREE.Mesh
    meshRef.current = mesh
    originalMaterialRef.current = mesh.material
    mesh.material = new THREE.MeshStandardMaterial({ map: texture })

    return () => {
      if (meshRef.current && originalMaterialRef.current) {
        meshRef.current.material = originalMaterialRef.current
      }
    }
  }, [scene, meshName, texture])

  useFrame((_, delta) => {
    if (!config.running) return
    // Mutating the three.js texture's own property, not the memoized value itself.
    texture.offset[config.uvAxis] += config.speed * delta
  })

  return null
}
