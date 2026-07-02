'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, Package, ShoppingBag, Tag } from 'lucide-react'

import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/logout-button'
import { ThemeToggle } from '@/components/admin/ThemeToggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/chat', label: 'Chat', icon: MessageSquare },
]

const sidebarActionClasses =
  'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

interface AdminSidebarProps {
  userEmail: string
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="bg-background fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-semibold tracking-tight">Zita Boutique</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              sidebarActionClasses,
              isActive(href, exact)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Account */}
      <div className="border-t p-4">
        <div className="bg-muted/40 mb-4 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="text-xs font-medium">
                {userEmail.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
            </div>
          </div>
        </div>

        <div>
          <ThemeToggle className={sidebarActionClasses} />
          <LogoutButton className={sidebarActionClasses} />
        </div>
      </div>
    </aside>
  )
}
