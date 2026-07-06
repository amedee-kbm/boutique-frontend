import type { ReactElement } from 'react'

// Brand monogram for every generated app icon. Near-black field, white "Z" —
// the storefront's primary/foreground pairing, rendered without a font file so
// it builds under `next/og` Satori with no extra asset.
const FIELD = '#111111'
const GLYPH = '#ffffff'

export function Monogram({
  size,
  rounded = false,
  maskable = false,
}: {
  size: number
  // Soft-corner the field (browser favicon); launchers mask their own shape.
  rounded?: boolean
  // Shrink the glyph into the inner safe zone so platform masks never clip it.
  maskable?: boolean
}): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: FIELD,
        color: GLYPH,
        borderRadius: rounded ? size * 0.22 : 0,
        fontSize: size * (maskable ? 0.46 : 0.64),
        fontWeight: 800,
        fontFamily: 'sans-serif',
        letterSpacing: -size * 0.04,
      }}
    >
      Z
    </div>
  )
}
