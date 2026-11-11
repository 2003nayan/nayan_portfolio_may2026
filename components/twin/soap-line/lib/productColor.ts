import { createContext, useContext, useEffect } from 'react'
import * as THREE from 'three'

// The soap's colours for the SKU on the line, keyed by sku_config's
// product_color. `mass` is the soap in process - mixer heap through to the cut
// billets; `soap` is the finished, stamped soap and the fringe trimmed off it.
export interface ProductPalette {
  mass: string
  soap: string
}

export const WHITE_PALETTE: ProductPalette = { mass: '#ece9e3', soap: '#ffffff' }

const PALETTES: Record<string, ProductPalette> = {
  white: WHITE_PALETTE,
  pink: { mass: '#eea9d2', soap: '#eea9d2' },
}

/** The palette for a product_color name. No SKU, or one not listed, keeps the white the line was modelled in. */
export function resolveProductPalette(productColor: string | null | undefined): ProductPalette {
  return PALETTES[productColor?.trim().toLowerCase() ?? ''] ?? WHITE_PALETTE
}

export const ProductColorContext = createContext<ProductPalette>(WHITE_PALETTE)

export function useProductColor(): ProductPalette {
  return useContext(ProductColorContext)
}

/**
 * Sets a material's colour in place. The materials are built once and kept -
 * rebuilding one on a changeover would recompile its shader and stall a frame -
 * so a new SKU only changes the colour of the material already on screen.
 */
export function useTint(material: (THREE.Material & { color: THREE.Color }) | null | undefined, color: string) {
  useEffect(() => {
    material?.color.set(color)
  }, [material, color])
}
