import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  getCategorySwipeList,
  getProductBySlug,
  type SwipeCard,
} from '@/features/storefront/products/services/product-queries'
import { buildProductDetailData } from '@/features/storefront/products'
import { ProductSwiper } from '@/features/storefront/products'

type SearchParams = Record<string, string | string[] | undefined>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return { title: product ? `${product.name} — Zita Boutique` : 'Zita Boutique' }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const { colour } = await searchParams
  const initialColourValue = (Array.isArray(colour) ? colour[0] : colour) ?? null

  const initial = buildProductDetailData(product, initialColourValue)

  // Same-category siblings back the swipe pager. Ensure the opened product is in
  // the list (it always should be — it's visible), so there's a valid start.
  const list = await getCategorySwipeList(product.categoryId)
  let initialIndex = list.findIndex((c) => c.slug === slug)
  let pagerList: SwipeCard[] = list
  if (initialIndex === -1) {
    pagerList = [
      {
        slug: product.slug,
        name: product.name,
        price: product.price,
        thumbnail: initial.fallbackImageUrl,
      },
    ]
    initialIndex = 0
  }

  return <ProductSwiper list={pagerList} initial={initial} initialIndex={initialIndex} />
}
