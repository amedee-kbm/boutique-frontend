import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Table2 } from 'lucide-react'

import { getAllProducts } from '@/features/admin/products/services/product-queries'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui'
import { ProductsList } from '@/features/admin/products'

export const metadata: Metadata = { title: 'Products — Zita Boutique' }

export default async function ProductsPage() {
  const products = await getAllProducts()

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you sell, in one place."
        action={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/admin/products/bulk-edit" />}>
              <Table2 className="size-4" />
              Bulk edit
            </Button>
            <Button render={<Link href="/admin/products/new" />}>
              <Plus className="size-4" />
              Add product
            </Button>
          </div>
        }
      />
      <ProductsList products={products} />
    </>
  )
}
