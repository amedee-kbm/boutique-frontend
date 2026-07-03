import { ImageResponse } from 'next/og'

import { Monogram } from '@/features/pwa/lib/monogram'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<Monogram size={size.width} rounded />, size)
}
