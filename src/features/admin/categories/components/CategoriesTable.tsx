'use client'

import { Pencil, Trash2 } from 'lucide-react'

import { deleteCategory } from '@/features/admin/categories'
import { Button } from '@/shared/ui'
import { Badge } from '@/shared/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui'
import { CategoryDialog } from '@/features/admin/categories'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import type { CategoryFilter } from '@/shared/types'

interface Category {
  id: string
  name: string
  slug: string
  productCount: number
  filters: CategoryFilter[]
}

export function CategoriesTable({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
        No categories yet. Create your first one to start organizing products.
      </p>
    )
  }

  return (
    <div className="bg-background rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Slug</TableHead>
            <TableHead className="text-center">Products</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">
                {category.slug}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{category.productCount}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <CategoryDialog
                    category={category}
                    filters={category.filters}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-11 md:size-7"
                        aria-label="Edit category"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    title="Delete category?"
                    description={
                      category.productCount > 0
                        ? `This category has ${category.productCount} product(s). Move them first or they will block deletion.`
                        : 'This action cannot be undone.'
                    }
                    successMessage="Category deleted"
                    onConfirm={() => deleteCategory(category.id)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-11 md:size-7"
                        aria-label="Delete category"
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
