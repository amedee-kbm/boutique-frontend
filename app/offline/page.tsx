import Link from 'next/link'

import { Button } from '@/components/ui/button'

export const metadata = { title: "You're offline — Zita Boutique" }

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">You’re offline</h1>
      <p className="text-muted-foreground text-sm">
        Zita needs a connection to load new pieces and chat with the seller. Check your network and
        try again.
      </p>
      <Button className="mt-2 rounded-none" render={<Link href="/" />}>
        Try again
      </Button>
    </div>
  )
}
