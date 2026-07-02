import type { Metadata } from 'next'

import {
  getAllCategories,
  getAllCategoryFilters,
} from '@/features/admin/categories/services/category-queries'
import { PageHeader } from '@/shared/components/PageHeader'
import { CategoryDialog } from '@/features/admin/categories'
import { CategoriesTable } from '@/features/admin/categories'

export const metadata: Metadata = { title: 'Categories — Zita Boutique' }

export default async function CategoriesPage() {
  const [categories, allFilters] = await Promise.all([getAllCategories(), getAllCategoryFilters()])

  const withFilters = categories.map((category) => ({
    ...category,
    filters: allFilters
      .filter((f) => f.categoryId === category.id)
      .map((f) => ({ id: f.id, name: f.name, options: f.options })),
  }))

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group your products so customers can browse."
        action={<CategoryDialog />}
      />
      <CategoriesTable categories={withFilters} />
    </>
  )
}
