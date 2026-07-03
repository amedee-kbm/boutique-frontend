import type { Metadata } from 'next'

import { HomeFilterEditor } from '@/features/admin/merchandising'
import { getAdminHomeFilters } from '@/features/admin/merchandising/services/merchandising-queries'

export const metadata: Metadata = { title: 'Storefront — Zita Boutique' }

// Seller-editable config; never serve a build snapshot of the strip.
export const dynamic = 'force-dynamic'

export default async function MerchandisingPage() {
  const filters = await getAdminHomeFilters()

  return <HomeFilterEditor initial={filters} />
}
