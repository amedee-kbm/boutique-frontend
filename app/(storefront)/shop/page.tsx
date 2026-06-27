import { getCategoryIndex } from '@/lib/db/queries'
import { CategoryBanner } from '@/components/storefront/CategoryBanner'

export const metadata = { title: 'Shop — Zita Boutique' }

// Reflect catalog changes immediately rather than serving a build snapshot.
export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const categories = await getCategoryIndex()
  const shown = categories.filter((c) => c.productCount > 0)

  if (shown.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-16 text-center text-sm">
        No categories to browse yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-px pb-6 md:grid-cols-2">
      {shown.map((category) => (
        <CategoryBanner key={category.id} category={category} />
      ))}
    </div>
  )
}
