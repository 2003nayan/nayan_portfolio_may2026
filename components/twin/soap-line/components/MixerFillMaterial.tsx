import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

interface MixerFillMaterialProps {
  scene: THREE.Object3D
  meshName: string
  opacity: number // 0-1
}

// Off-white base with soft random tonal variation - "irregular, uneven"
// without looking like a flat single color.
function createFillColorTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e9e1cd'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 8 + Math.random() * 18
    const shade = 205 + Math.random() * 45 // varies around the base tone
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, `rgba(${shade}, ${shade - 10}, ${shade - 40}, 0.5)`)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  return texture
}

// Densely packed, overlapping soft blobs at varying heights - "bulky, dense,
// almost no space between" chunks, read through lighting via bumpMap rather
// than actual geometry displacement.
function createFillBumpTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 320; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 7 + Math.random() * 16
    const brightness = 90 + Math.random() * 130
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, `rgb(${brightness}, ${brightness}, ${brightness})`)
    gradient.addColorStop(1, 'rgba(128,128,128,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  return texture
}

// Gives the mixed-material mesh a dense, lumpy, off-white dough-like look
// via generated textures (no source texture to work with here either - same
// situation as the conveyor belts). Geometry itself is untouched; the
// "irregular, bulky, no gaps" read comes entirely from the bump map's
// lighting perturbation plus the color texture's tonal variation.
export function MixerFillMaterial({ scene, meshName, opacity }: MixerFillMaterialProps) {
  const colorTexture = useMemo(() => createFillColorTexture(), [])
  const bumpTexture = useMemo(() => createFillBumpTexture(), [])
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const originalRef = useRef<THREE.Mesh['material'] | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    const object = scene.getObjectByName(meshName)
    if (!object || !(object as THREE.Mesh).isMesh) return
    const mesh = object as THREE.Mesh
    meshRef.current = mesh
    originalRef.current = mesh.material

    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.015,
      roughness: 0.95,
      metalness: 0,
    })
    materialRef.current = material
    mesh.material = material

    return () => {
      if (meshRef.current && originalRef.current) {
        meshRef.current.material = originalRef.current
      }
    }
  }, [scene, meshName, colorTexture, bumpTexture])

  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    material.transparent = opacity < 1
    material.opacity = opacity
  }, [opacity])

  return null
}
