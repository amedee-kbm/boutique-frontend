import type { Metadata } from 'next'

import { getAllCategories } from '@/features/admin/categories/services/category-queries'
import { ProductEditor } from '@/features/admin/products'

export const metadata: Metadata = { title: 'New product — Zita Boutique' }

export default async function NewProductPage() {
  const categories = await getAllCategories()

  return <ProductEditor categories={categories} />
}
