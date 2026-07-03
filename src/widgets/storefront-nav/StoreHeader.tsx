'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/shared/lib/utils'
import { useUnread } from '@/features/storefront/chat'
import { BagButton } from '@/features/bag'

const NAV = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  {
    href: '/shop',
    label: 'Shop',
    match: (p: string) => p === '/shop' || p.startsWith('/category') || p.startsWith('/product'),
  },
  { href: '/chat', label: 'Tubaze', match: (p: string) => p === '/chat' },
  { href: '/account', label: 'Account', match: (p: string) => p.startsWith('/account') },
] as const

export function StoreHeader() {
  const pathname = usePathname()
  const { hasUnread } = useUnread()
  const isDetail = pathname.startsWith('/product/')

  return (
    // The PDP supplies its own mobile top bar (✕ · favorite · share · bag), so
    // the global header is desktop-only there.
    <header
      className={cn(
        'bg-background/90 sticky top-0 z-40 flex h-14 items-center justify-between border-b pr-1 pl-4 backdrop-blur md:px-8',
        isDetail && 'hidden md:flex'
      )}
    >
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className={cn(
            'font-heading text-lg font-semibold tracking-[0.2em] uppercase',
            isDetail && 'hidden md:block'
          )}
        >
          Zita
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative text-[11px] tracking-[0.15em] uppercase',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
                {item.href === '/chat' && hasUnread && (
                  <span className="bg-foreground absolute -top-1 -right-2 size-1.5 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <BagButton />
    </header>
  )
}
