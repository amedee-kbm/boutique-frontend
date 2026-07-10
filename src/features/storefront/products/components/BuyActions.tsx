import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

import { Button } from '@/shared/ui'

// The PDP call-to-action pair (Add to bag + Chat), shared by the desktop inline
// slot and the mobile sticky bar. The caller owns the wrapper/positioning.
export function BuyActions({ onAddToBag }: { onAddToBag: () => void }) {
  return (
    <>
      <Button type="button" className="h-12 flex-1 rounded-none" onClick={onAddToBag}>
        Add to bag
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-12 flex-1 rounded-none"
        render={<Link href="/chat" />}
      >
        <MessageSquare className="size-4" /> Chat
      </Button>
    </>
  )
}
