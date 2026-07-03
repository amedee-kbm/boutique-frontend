'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, MessageSquare, User } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { useUnread } from '@/features/storefront/chat'

const TABS = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  {
    href: '/shop',
    label: 'Shop',
    icon: ShoppingBag,
    match: (p: string) => p === '/shop' || p.startsWith('/category') || p.startsWith('/product'),
  },
  { href: '/chat', label: 'Tubaze', icon: MessageSquare, match: (p: string) => p === '/chat' },
  {
    href: '/account',
    label: 'Account',
    icon: User,
    match: (p: string) => p.startsWith('/account'),
  },
] as const

export function StoreTabBar() {
  const pathname = usePathname()
  const { hasUnread } = useUnread()

  // Product detail is a focused view: top ✕, sticky CTA, no tab bar.
  if (pathname.startsWith('/product/')) return null

  return (
    <nav className="bg-background sticky bottom-0 z-40 grid grid-cols-4 border-t md:hidden">
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] tracking-wide',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.6} />
              {tab.href === '/chat' && hasUnread && (
                <span className="bg-foreground absolute -top-0.5 -right-1 size-2 rounded-full" />
              )}
            </span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
