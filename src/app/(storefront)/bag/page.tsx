import { BagList } from '@/features/storefront/bag'
import { BagHeader } from '@/features/storefront/bag'

export const metadata = { title: 'Your bag — Zita Boutique' }

export default function BagPage() {
  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <BagHeader />
      <BagList />
    </div>
  )
}
