import { BagList } from '@/components/storefront/BagList'
import { BagHeader } from '@/components/storefront/BagHeader'

export const metadata = { title: 'Your bag — Zita Boutique' }

export default function BagPage() {
  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <BagHeader />
      <BagList />
    </div>
  )
}
