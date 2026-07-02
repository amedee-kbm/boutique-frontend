import type { Metadata } from 'next'

import { getAllCategories, getAllProducts } from '@/lib/db/queries'
import { ProductsBulkEdit } from '@/components/admin/ProductsBulkEdit'

export const metadata: Metadata = { title: 'Bulk Edit — Zita Boutique' }

export default async function BulkEditPage() {
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()])

  return (
    <ProductsBulkEdit
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        categoryId: p.categoryId ?? null,
        visible: p.visible,
        thumbnail: p.thumbnail,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  )
}
