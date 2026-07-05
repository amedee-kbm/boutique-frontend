'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/shared/lib/utils'
import { Eyebrow } from '@/shared/components/Eyebrow'

// Desktop-only category rail (Kikuu "Related Categories"). Hidden on mobile,
// where the bottom tab bar carries navigation. Shows from tablet up.
export function StoreSidebar({ categories }: { categories: { name: string; slug: string }[] }) {
  const pathname = usePathname()

  return (
    <aside className="hidden shrink-0 md:block md:w-44 lg:w-52">
      <div className="sticky top-16 py-6">
        <Eyebrow as="h2" className="font-heading mb-2 px-2 font-semibold">
          Categories
        </Eyebrow>
        <nav className="flex flex-col">
          <SidebarLink href="/shop" active={pathname === '/shop'}>
            All
          </SidebarLink>
          {categories.map((c) => (
            <SidebarLink
              key={c.slug}
              href={`/category/${c.slug}`}
              active={pathname === `/category/${c.slug}`}
            >
              {c.name}
            </SidebarLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded px-2 py-2 text-sm transition-colors',
        active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}
