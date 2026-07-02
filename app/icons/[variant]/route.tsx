import { ImageResponse } from 'next/og'

import { Monogram } from '@/lib/pwa/monogram'

const VARIANTS = {
  '192': { size: 192, maskable: false },
  '512': { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
} as const

type Variant = keyof typeof VARIANTS

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params
  const config = VARIANTS[variant as Variant]
  if (!config) return new Response('Not found', { status: 404 })

  return new ImageResponse(<Monogram size={config.size} maskable={config.maskable} />, {
    width: config.size,
    height: config.size,
  })
}
