import { NextResponse } from 'next/server'

import { getProductBySlug } from '@/features/storefront/products/services/product-queries'
import { buildProductDetailData } from '@/features/storefront/products'

// On-demand PDP detail for a neighbouring product, fetched as the swipe pager
// (P4) approaches a slide. Mirrors the RSC page's mapping via the shared builder.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(buildProductDetailData(product, null))
}
