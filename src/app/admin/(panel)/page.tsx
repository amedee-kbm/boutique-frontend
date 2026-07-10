import Link from 'next/link'
import { MessageCircle, Package, Plus, ShoppingBag, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import {
  getDashboardStats,
  getRecentProducts,
} from '@/features/admin/overview/services/overview-queries'
import { formatPrice } from '@/shared/lib/format'
import { PageHeader } from '@/shared/components/PageHeader'
import { ProductThumb } from '@/shared/components/ProductThumb'
import { Button } from '@/shared/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import { Badge } from '@/shared/ui'

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getDashboardStats(), getRecentProducts()])

  const cards = [
    { label: 'New orders', value: stats.newOrderCount, icon: ShoppingBag, href: '/admin/orders' },
    { label: 'Products', value: stats.productCount, icon: Package, href: '/admin/products' },
    { label: 'Categories', value: stats.categoryCount, icon: Tag, href: '/admin/categories' },
    { label: 'Chats', value: stats.chatCount, icon: MessageCircle, href: '/admin/chat' },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quick overview of your store."
        action={
          <Button render={<Link href="/admin/products/new" />}>
            <Plus className="size-4" />
            Add product
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
                <Icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recently added</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No products yet.{' '}
              <Link href="/admin/products/new" className="underline">
                Add your first one.
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <ProductThumb
                    src={p.thumbnail}
                    className="bg-muted size-10 shrink-0 rounded-md border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {p.categoryName ?? 'Uncategorized'} · added{' '}
                      {formatDistanceToNow(p.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatPrice(p.price)}</span>
                    {!p.visible && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
