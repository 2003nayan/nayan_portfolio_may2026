import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface MeshOpacityProps {
  scene: THREE.Object3D
  meshNames: string[]
  opacity: number // 0-1
  // Optional override for the group's base colour. Handled here rather than in
  // a component of its own because this one already swaps mesh.material for a
  // private clone - a second component doing the same would clobber it, and
  // whichever mounted last would win.
  color?: string
  // Optional node name to resolve `meshNames` inside, instead of the whole
  // scene.
  //
  // Load-bearing wherever a machine appears more than once. The pre-plodder at
  // the end of the line is the SAME CAD part as the noodler further up it, so
  // pCube3658_A3_0, pCube3698_A3_0 and D_Round_Handles2_A3_0 each exist two or
  // three times over. getObjectByName returns whichever comes first in
  // traversal order, so an unscoped lookup silently fades a different machine
  // than the slider is labelled for - which is exactly what the Noodler slider
  // was doing before this existed.
  root?: string
}

interface ClonedMaterial {
  mesh: THREE.Mesh
  original: THREE.Mesh['material']
  clone: THREE.Material
}

// Controls opacity, and optionally colour, on a group of named meshes. Materials in this model are
// shared across many meshes (confirmed: 18 materials for 672 meshes), so
// setting `.opacity` directly on the existing material would also fade
// every other mesh using it. Cloning gives each target mesh its own
// material instance first, same precaution as the mesh-selection highlight.
export function MeshOpacity({ scene, meshNames, opacity, color, root }: MeshOpacityProps) {
  const clonedRef = useRef<ClonedMaterial[]>([])

  useEffect(() => {
    // Resolving the scope once here rather than per name keeps a missing scope
    // node from silently falling back to the whole scene, which would
    // reintroduce the duplicate-name bug the scope exists to fix.
    let searchRoot: THREE.Object3D | null = scene
    if (root) {
      searchRoot = scene.getObjectByName(root) ?? null
      if (!searchRoot) {
        console.warn(`[MeshOpacity] scope node "${root}" not found; skipping ${meshNames.join(', ')}.`)
        clonedRef.current = []
        return
      }
    }

    clonedRef.current = meshNames.flatMap((name) => {
      const object = searchRoot.getObjectByName(name)
      if (!object || !(object as THREE.Mesh).isMesh) return []
      const mesh = object as THREE.Mesh
      const original = mesh.material
      const clone = (Array.isArray(original) ? original[0] : original).clone()
      mesh.material = clone
      return [{ mesh, original, clone }]
    })

    return () => {
      for (const { mesh, original } of clonedRef.current) {
        mesh.material = original
      }
    }
  }, [scene, meshNames, root])

  useEffect(() => {
    for (const { clone } of clonedRef.current) {
      // Mutating the three.js material clone's own properties, not the ref itself.
      clone.transparent = opacity < 1
      clone.opacity = opacity
      // A faded shell stops writing depth, so it no longer hides what is inside
      // it. Without this a see-through hopper still occludes its own contents in
      // the depth buffer, and anything drawn after it - the material sitting in
      // the hopper - fails the depth test and vanishes. Restored to true at full
      // opacity, where the shell is solid and SHOULD hide what is behind it.
      clone.depthWrite = opacity >= 1
    }
  }, [opacity])

  useEffect(() => {
    if (!color) return
    for (const { clone } of clonedRef.current) {
      // Not every material type carries a colour (MeshDepthMaterial and
      // friends do not), so only tint the ones that do.
      const tintable = clone as THREE.Material & { color?: THREE.Color }
      if (!tintable.color) continue
      // While Wireframe has the part, its own colour is the one Wireframe will
      // restore - recolouring that keeps a tint change (a SKU changeover) from
      // being undone when wireframe is turned off.
      if (tintable.userData.wireframeOriginalColor !== undefined) {
        tintable.userData.wireframeOriginalColor = `#${new THREE.Color(color).getHexString()}`
        continue
      }
      // Mutating the three.js material clone's own properties, not the ref itself.
      tintable.color.set(color)
    }
    // scene/meshNames/root included because they rebuild the clones above, and
    // a fresh clone comes back with the model's original colour.
  }, [scene, meshNames, root, color])

  return null
}
