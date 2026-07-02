'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createCategory, updateCategory } from '@/features/categories'
import type { CategoryFilter } from '@/lib/db/queries'
import { CategoryFilterManager } from '@/features/categories'
import { Button } from '@/shared/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Label } from '@/shared/ui'

interface CategoryDialogProps {
  category?: { id: string; name: string; slug: string }
  filters?: CategoryFilter[]
  trigger?: React.ReactElement
}

export function CategoryDialog({ category, filters, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(category)

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateCategory(category!.id, formData)
        : await createCategory(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEditing ? 'Category updated' : 'Category created')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="size-4" />
              New category
            </Button>
          )
        }
      />
      <DialogContent>
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>
              Categories group your products. The slug appears in the store URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={category?.name}
                placeholder="e.g. Dresses"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={category?.slug}
                placeholder="e.g. dresses (leave blank to auto-generate)"
                required={isEditing}
              />
              <p className="text-muted-foreground text-xs">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          {isEditing && (
            <div className="border-t py-4">
              <CategoryFilterManager categoryId={category!.id} initialFilters={filters ?? []} />
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
