import { ImageResponse } from 'next/og'

import { Monogram } from '@/features/pwa/lib/monogram'

// iOS masks the apple touch icon itself and renders transparency as black, so
// this stays a full-bleed opaque square.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<Monogram size={size.width} />, size)
}
