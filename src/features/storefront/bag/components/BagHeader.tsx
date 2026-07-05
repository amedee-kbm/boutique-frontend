'use client'

import { SectionTitle } from '@/shared/components/SectionTitle'
import { useBag } from '../hooks/useBag'

export function BagHeader() {
  const { count, hydrated } = useBag()
  return (
    <div className="border-b px-4 py-3">
      <SectionTitle as="h1">
        SHOPPING BAG|
        {hydrated && count > 0 && (
          <span className="bg-foreground text-background absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-medium">
            {count}
          </span>
        )}
        |
      </SectionTitle>
    </div>
  )
}
