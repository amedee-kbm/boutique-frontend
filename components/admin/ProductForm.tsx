'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateProduct } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'

interface Category {
  id: string
  name: string
}

interface ProductFormProps {
  categories: Category[]
  product: {
    id: string
    name: string
    slug: string
    description: string | null
    price: string
    categoryId: string | null
    visible: boolean
  }
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [visible, setVisible] = useState(product.visible)

  function onSubmit(formData: FormData) {
    formData.set('visible', String(visible))

    startTransition(async () => {
      const result = await updateProduct(product.id, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Product saved')
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product.name}
              placeholder="e.g. Floral Summer Dress"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="price"
                  name="price"
                  type="text"
                  inputMode="decimal"
                  defaultValue={product.price}
                  placeholder="29.99"
                  className="pl-6"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={product.categoryId ?? ''}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={product.slug}
              placeholder="auto-generated from name if left blank"
              required
            />
            <p className="text-muted-foreground text-xs">
              Appears in the store link for this product.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product.description ?? ''}
              placeholder="Describe the fabric, fit, sizes available…"
              rows={5}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Visible in store</p>
              <p className="text-muted-foreground text-xs">
                Turn off to hide this product from customers.
              </p>
            </div>
            <Switch checked={visible} onCheckedChange={setVisible} aria-label="Visible in store" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
