'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteProduct,
  toggleProductFeatured,
  toggleProductVisibility,
} from '@/features/admin/products'
import { cn } from '@/shared/lib/utils'
import { formatPrice } from '@/shared/lib/format'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Switch } from '@/shared/ui'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FilterChips } from '@/features/admin/ui'
import { ListRow } from '@/features/admin/ui'

interface Product {
  id: string
  name: string
  price: string
  visible: boolean
  featured: boolean
  categoryName: string | null
  thumbnail: string | null
  variantCount: number
}

type Filter = 'all' | 'visible' | 'hidden'

const filterOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
]

function FeaturedToggle({ id, featured }: { id: string; featured: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-11 md:size-7"
      disabled={isPending}
      aria-label={featured ? 'Unpin from home feed' : 'Pin to home feed'}
      aria-pressed={featured}
      onClick={() => {
        startTransition(async () => {
          await toggleProductFeatured(id, !featured)
          toast.success(featured ? 'Unpinned from home' : 'Pinned to home')
        })
      }}
    >
      <Star className={cn('size-4', featured && 'fill-amber-400 text-amber-500')} />
    </Button>
  )
}

function VisibilityToggle({ id, visible }: { id: string; visible: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Switch
      checked={visible}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleProductVisibility(id, checked)
          toast.success(checked ? 'Product is now visible' : 'Product hidden')
        })
      }}
      aria-label="Toggle visibility"
    />
  )
}

export function ProductsList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (filter === 'visible' && !p.visible) return false
      if (filter === 'hidden' && p.visible) return false
      return q === '' || p.name.toLowerCase().includes(q)
    })
  }, [products, query, filter])

  if (products.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
        No products yet. Add your first product to get started.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <FilterChips options={filterOptions} value={filter} onChange={setFilter} />

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Filter products"
          placeholder="Filter products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No products match your filters.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border px-3">
          {visible.map((product) => (
            <ListRow
              key={product.id}
              href={`/admin/products/${product.id}/edit`}
              thumbnail={product.thumbnail}
              title={product.name}
              meta={[
                formatPrice(product.price),
                product.categoryName ?? 'Uncategorized',
                product.variantCount > 0 &&
                  `${product.variantCount} variant${product.variantCount === 1 ? '' : 's'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              accent={product.visible ? undefined : 'Hidden'}
              actions={
                <>
                  <FeaturedToggle id={product.id} featured={product.featured} />
                  <VisibilityToggle id={product.id} visible={product.visible} />
                  <ConfirmDialog
                    title="Delete product?"
                    description="This will permanently remove the product and its images. This cannot be undone."
                    successMessage="Product deleted"
                    onConfirm={async () => {
                      await deleteProduct(product.id)
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-11 md:size-7"
                        aria-label="Delete product"
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    }
                  />
                </>
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
