import { getCategoryIndex } from '@/features/storefront/categories/services/category-queries'
import { StoreSidebar } from './StoreSidebar'

// Two-column desktop shell for the browse pages: a left category rail plus the
// page content, centred with side gutters. On mobile it collapses to a plain
// full-width column (the sidebar hides itself).
export async function BrowseShell({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryIndex()
  const cats = categories
    .filter((c) => c.productCount > 0)
    .map((c) => ({ name: c.name, slug: c.slug }))

  return (
    <div className="md:mx-auto md:flex md:max-w-[1400px] md:gap-6 md:px-6 xl:gap-8 xl:px-10">
      <StoreSidebar categories={cats} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
