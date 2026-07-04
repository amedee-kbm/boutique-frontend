import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  getCategoryBySlug,
  getCategoryFilters,
  getCategoryProductMeta,
  getCategoryProducts,
} from '@/features/storefront/categories/services/category-queries'
import { parseFilterParams, toQueryFilters } from '@/features/storefront/categories'
import { GridCard } from '@/features/storefront/products'
import { FilterSheet } from '@/features/storefront/categories'
import { SortControl } from '@/features/storefront/categories'
import { AppliedChips } from '@/features/storefront/categories'
import { BrowseShell } from '@/widgets/storefront-nav'

type SearchParams = Record<string, string | string[] | undefined>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  return { title: category ? `${category.name} — Zita Boutique` : 'Zita Boutique' }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const selection = parseFilterParams(await searchParams)
  const hasActiveFilters =
    selection.optionIds.length > 0 || selection.hexes.length > 0 || Boolean(selection.price)

  const [products, categoryFilters, meta] = await Promise.all([
    getCategoryProducts(category.id, toQueryFilters(selection)),
    getCategoryFilters(category.id),
    getCategoryProductMeta(category.id),
  ])

  return (
    <BrowseShell>
      <div className="pb-6">
        <div className="border-b px-4 py-3">
          <h1 className="font-heading text-base font-semibold tracking-[0.2em] uppercase">
            {category.name}
          </h1>
        </div>

        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <FilterSheet categoryFilters={categoryFilters} meta={meta} />
          <SortControl />
        </div>

        <AppliedChips categoryFilters={categoryFilters} />

        {products.length === 0 ? (
          <div className="px-4 py-16 text-center">
            {hasActiveFilters ? (
              <>
                <p className="text-sm">No pieces match.</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Clear a filter above to see more.
                </p>
              </>
            ) : (
              <p className="text-sm">No pieces here yet.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 px-3 pt-3 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <GridCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </BrowseShell>
  )
}
