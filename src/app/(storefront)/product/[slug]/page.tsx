import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  getCategorySwipeList,
  getProductBySlug,
} from '@/features/storefront/products/services/product-queries'
import { buildProductDetailData } from '@/features/storefront/products'
import { ProductDetail } from '@/features/storefront/products'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return { title: product ? `${product.name} — Zita Boutique` : 'Zita Boutique' }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const data = buildProductDetailData(product, null)

  // Same-category siblings shown under the product, minus the one being viewed.
  const more = (await getCategorySwipeList(product.categoryId)).filter((c) => c.slug !== slug)

  return <ProductDetail data={data} more={more} />
}
