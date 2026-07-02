import type { Metadata } from 'next'

import { getAllCategories } from '@/lib/db/queries'
import { ProductEditor } from '@/features/products'

export const metadata: Metadata = { title: 'New product — Zita Boutique' }

export default async function NewProductPage() {
  const categories = await getAllCategories()

  return <ProductEditor categories={categories} />
}
