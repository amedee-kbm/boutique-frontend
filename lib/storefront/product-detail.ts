import type { GallerySection } from '@/components/storefront/ProductGallery'

export interface DetailColour {
  optionId: string
  value: string
  hex: string | null
  repImageUrl: string | null
}

export interface ProductDetailData {
  id: string
  slug: string
  name: string
  description: string | null
  price: string
  sections: GallerySection[]
  colours: DetailColour[]
  sizes: string[]
  fallbackImageUrl: string | null
  initialColourValue: string | null
}

// The raw shape returned by getProductBySlug — kept structural so this stays a
// pure, server-and-route-handler-safe mapper with no DB import.
interface SourceProduct {
  id: string
  slug: string
  name: string
  description: string | null
  price: string
  images: { id: string; url: string; alt: string | null; optionId: string | null }[]
  variantGroups: {
    id: string
    name: string
    options: { id: string; value: string; imageId: string | null; hex: string | null }[]
  }[]
}

// Maps a product row into the gallery sections / colour swatches / sizes the PDP
// renders. Shared by the RSC page and the on-demand /api/products/[slug] route
// so a server-rendered product and a lazily-fetched neighbour are identical.
export function buildProductDetailData(
  product: SourceProduct,
  initialColourValue: string | null
): ProductDetailData {
  const colourGroup = product.variantGroups.find((g) => g.name === 'Colour')
  const sizeGroup = product.variantGroups.find((g) => g.name === 'Size')

  const imageById = new Map(product.images.map((img) => [img.id, img]))
  const looseImages = product.images.filter((img) => !img.optionId)

  const colours: DetailColour[] = (colourGroup?.options ?? []).map((option) => {
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

  return {
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
}

// The first colour's option id, used to seed the active swatch when a slide loads.
export function firstColourId(data: ProductDetailData): string | null {
  return (
    data.colours.find((c) => c.value === data.initialColourValue)?.optionId ??
    data.colours[0]?.optionId ??
    null
  )
}
