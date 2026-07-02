'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ChevronRight, Package } from 'lucide-react'
import { toast } from 'sonner'

import type { AdminOrder, OrderStatus } from '@/lib/db/queries'
import { formatPrice } from '@/shared/lib/format'
import { updateOrderStatus } from '@/features/orders'
import { cn } from '@/shared/lib/utils'
import { FilterChips } from '@/shared/components/admin/ui/FilterChips'
import { SubScreen } from '@/shared/components/admin/ui/SubScreen'
import { ProductThumb } from '@/features/products'
import { Badge } from '@/shared/ui'

type Filter = 'all' | OrderStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'done', label: 'Done' },
]

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  done: 'Done',
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'done', label: 'Done' },
]

function orderTotal(order: AdminOrder) {
  return order.items.reduce((sum, i) => sum + Number(i.price), 0)
}

export function OrdersList({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  const selected = orders.find((o) => o.id === openId) ?? null

  function setStatus(id: string, status: OrderStatus) {
    startTransition(async () => {
      const { error } = await updateOrderStatus(id, status)
      if (error) {
        toast.error(error)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} className="mb-4" />

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Package className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">No orders here yet.</p>
        </div>
      ) : (
        <ul className="bg-background divide-y rounded-lg border">
          {shown.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => setOpenId(order.id)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 p-4 text-left transition-colors"
              >
                <ProductThumb
                  src={order.items[0]?.imageUrl ?? null}
                  className="bg-muted size-12 shrink-0 rounded-md border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="trunc ate text-sm font-medium">{order.guestName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {order.phone} · {order.items.length}{' '}
                    {order.items.length === 1 ? 'piece' : 'pieces'} ·{' '}
                    {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <Badge
                  variant={order.status === 'new' ? 'default' : 'secondary'}
                  className="shrink-0"
                >
                  {STATUS_LABEL[order.status]}
                </Badge>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SubScreen
        open={selected !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        title={selected?.guestName ?? 'Order'}
        subtitle={selected ? formatPrice(orderTotal(selected)) : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={pending}
                    aria-pressed={selected.status === opt.value}
                    onClick={() => setStatus(selected.id, opt.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50',
                      selected.status === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Contact</p>
              <p>
                <a href={`tel:${selected.phone}`} className="underline">
                  {selected.phone}
                </a>
              </p>
              <p className="whitespace-pre-wrap">{selected.address}</p>
              {selected.note && (
                <p className="text-muted-foreground whitespace-pre-wrap">“{selected.note}”</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                {selected.items.length} {selected.items.length === 1 ? 'piece' : 'pieces'}
              </p>
              <ul className="divide-y">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2">
                    <ProductThumb
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-12 shrink-0 rounded-md border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {(item.colorValue || item.sizeValue) && (
                        <p className="text-muted-foreground truncate text-xs">
                          {[item.colorValue, item.sizeValue].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm">{formatPrice(item.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SubScreen>
    </>
  )
}
