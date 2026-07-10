import Link from 'next/link'

import { Button } from '@/shared/ui'
import { SectionTitle } from '@/shared/components/SectionTitle'

export default function StorefrontNotFound() {
  return (
    <div className="px-4 py-20 text-center">
      <SectionTitle as="h1">Not found</SectionTitle>
      <p className="text-muted-foreground mt-2 text-sm">
        This piece is no longer available, or the link is wrong.
      </p>
      <Button variant="outline" className="mt-5 rounded-none" render={<Link href="/" />}>
        Back to browsing
      </Button>
    </div>
  )
}
