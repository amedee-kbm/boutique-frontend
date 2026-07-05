'use client'

import { SectionTitle } from '@/shared/components/SectionTitle'
import { CountBadge } from '@/shared/components/CountBadge'
import { useBag } from '../hooks/useBag'

export function BagHeader() {
  const { count, hydrated } = useBag()
  return (
    <div className="border-b px-4 py-3">
      <SectionTitle as="h1">
        SHOPPING BAG|
        {hydrated && count > 0 && <CountBadge count={count} className="absolute top-1 right-0.5" />}
        |
      </SectionTitle>
    </div>
  )
}
