'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useUnread } from '@/lib/chat/useUnread'
import { SelectionBag } from './SelectionBag'

const NAV = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  {
    href: '/shop',
    label: 'Shop',
    match: (p: string) => p === '/shop' || p.startsWith('/category') || p.startsWith('/product'),
  },
  { href: '/chat', label: 'Chat', match: (p: string) => p === '/chat' },
] as const

export function StoreHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { hasUnread } = useUnread()
  const isDetail = pathname.startsWith('/product/')

  return (
    <header className="bg-background/90 sticky top-0 z-40 flex h-14 items-center justify-between border-b pr-1 pl-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-8">
        {isDetail && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="-ml-2 flex size-11 items-center justify-center md:hidden"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
        )}

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

      <SelectionBag />
    </header>
  )
}
