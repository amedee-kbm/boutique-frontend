import type { Metadata } from 'next'

import { getAllCategories, getAllCategoryFilters } from '@/lib/db/queries'
import { PageHeader } from '@/components/admin/PageHeader'
import { CategoryDialog } from '@/components/admin/CategoryDialog'
import { CategoriesTable } from '@/components/admin/CategoriesTable'

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
