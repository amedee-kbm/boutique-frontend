import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getAllCategories, getCategoryFilters, getProductById } from '@/lib/db/queries'
import { ProductEditor } from '@/features/products'

export const metadata: Metadata = { title: 'Edit product — Zita Boutique' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [product, categories] = await Promise.all([getProductById(id), getAllCategories()])

  if (!product) notFound()

  const categoryFilters = product.categoryId ? await getCategoryFilters(product.categoryId) : []

  return (
    <ProductEditor
      categories={categories}
      categoryFilters={categoryFilters}
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
        visible: product.visible,
        images: product.images.map((img) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          optionId: img.optionId,
        })),
        variantGroups: product.variantGroups,
        filterOptionIds: product.filterOptionIds,
      }}
    />
  )
}
