'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'

import { bulkUpdateProducts } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Category {
  id: string
  name: string
}

interface BulkProduct {
  id: string
  name: string
  slug: string
  price: string
  categoryId: string | null
  visible: boolean
  thumbnail: string | null
}

interface RowEdit {
  name: string
  price: string
  categoryId: string | null
  visible: boolean
}

export function ProductsBulkEdit({
  products,
  categories,
}: {
  products: BulkProduct[]
  categories: Category[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [edits, setEdits] = useState<Map<string, RowEdit>>(() => {
    const m = new Map<string, RowEdit>()
    for (const p of products) {
      m.set(p.id, { name: p.name, price: p.price, categoryId: p.categoryId, visible: p.visible })
    }
    return m
  })

  const [dirty, setDirty] = useState(new Set<string>())

  function patch(id: string, changes: Partial<RowEdit>) {
    setEdits((prev) => {
      const next = new Map(prev)
      next.set(id, { ...next.get(id)!, ...changes })
      return next
    })
    setDirty((prev) => new Set(prev).add(id))
  }

  function handleSave() {
    const updates = products
      .filter((p) => dirty.has(p.id))
      .map((p) => {
        const e = edits.get(p.id)!
        return {
          id: p.id,
          slug: p.slug,
          name: e.name,
          price: e.price,
          categoryId: e.categoryId,
          visible: e.visible,
        }
      })

    if (updates.length === 0) {
      router.push('/admin/products')
      return
    }

    startTransition(async () => {
      const result = await bulkUpdateProducts(updates)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${updates.length} product${updates.length !== 1 ? 's' : ''} updated`)
        router.push('/admin/products')
      }
    })
  }

  return (
    <div>
      <header className="bg-background sticky top-0 z-10 -mx-4 flex items-center justify-between border-b px-4 py-3 md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/admin/products" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">
            Editing {products.length} product{products.length !== 1 ? 's' : ''}
            {dirty.size > 0 && (
              <span className="text-muted-foreground ml-1.5">· {dirty.size} unsaved</span>
            )}
          </span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </header>

      <div className="bg-background mt-4 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead className="min-w-[220px]">Title</TableHead>
              <TableHead className="min-w-[180px]">Category</TableHead>
              <TableHead className="min-w-[160px]">Price (RWF)</TableHead>
              <TableHead className="w-24">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const e = edits.get(product.id)!
              const isDirty = dirty.has(product.id)

              return (
                <TableRow key={product.id} className={isDirty ? 'bg-muted/30' : undefined}>
                  <TableCell className="py-2">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted size-12 rounded" />
                    )}
                  </TableCell>

                  <TableCell className="py-2">
                    <Input
                      value={e.name}
                      onChange={(ev) => patch(product.id, { name: ev.target.value })}
                      className="h-9 text-sm"
                    />
                  </TableCell>

                  <TableCell className="py-2">
                    <select
                      value={e.categoryId ?? ''}
                      onChange={(ev) => patch(product.id, { categoryId: ev.target.value || null })}
                      className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>

                  <TableCell className="py-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={e.price}
                      onChange={(ev) => patch(product.id, { price: ev.target.value })}
                      className="h-9 max-w-[120px] text-sm"
                    />
                  </TableCell>

                  <TableCell className="py-2">
                    <Switch
                      checked={e.visible}
                      onCheckedChange={(checked) => patch(product.id, { visible: checked })}
                      aria-label="Toggle visibility"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
