import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function StorefrontNotFound() {
  return (
    <div className="px-4 py-20 text-center">
      <h1 className="font-heading text-base font-semibold tracking-[0.2em] uppercase">Not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This piece is no longer available, or the link is wrong.
      </p>
      <Button variant="outline" className="mt-5 rounded-none" render={<Link href="/" />}>
        Back to browsing
      </Button>
    </div>
  )
}
