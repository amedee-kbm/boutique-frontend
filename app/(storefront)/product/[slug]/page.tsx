import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getProductBySlug } from '@/lib/db/queries'
import { ProductDetail, type ProductDetailData } from '@/components/storefront/ProductDetail'
import type { GallerySection } from '@/components/storefront/ProductGallery'

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

  const colourGroup = product.variantGroups.find((g) => g.name === 'Colour')
  const sizeGroup = product.variantGroups.find((g) => g.name === 'Size')

  const imageById = new Map(product.images.map((img) => [img.id, img]))
  const looseImages = product.images.filter((img) => !img.optionId)

  const colours = (colourGroup?.options ?? []).map((option) => {
    const images = product.images.filter((img) => img.optionId === option.id)
    const rep = (option.imageId && imageById.get(option.imageId)) || images[0] || null
    return {
      optionId: option.id,
      value: option.value,
      hex: option.hex,
      repImageUrl: rep?.url ?? null,
    }
  })

  const sections: GallerySection[] = []
  for (const option of colourGroup?.options ?? []) {
    const images = product.images.filter((img) => img.optionId === option.id)
    if (images.length > 0) sections.push({ key: option.id, colourId: option.id, images })
  }
  if (sections.length === 0 && looseImages.length > 0) {
    sections.push({ key: 'all', colourId: null, images: looseImages })
  } else if (looseImages.length > 0) {
    sections.push({ key: 'loose', colourId: null, images: looseImages })
  }

  const data: ProductDetailData = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    sections,
    colours,
    sizes: (sizeGroup?.options ?? []).map((o) => o.value),
    fallbackImageUrl: product.images[0]?.url ?? null,
    initialColourValue,
  }

  return <ProductDetail product={data} />
}
