import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { getAllCategories } from '@/lib/db/queries'
import { Button } from '@/components/ui/button'
import { ProductCreateForm } from '@/components/admin/ProductCreateForm'

export const metadata: Metadata = { title: 'New product — Zita Boutique' }

export default async function NewProductPage() {
  const categories = await getAllCategories()

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2" render={<Link href="/admin/products" />}>
        <ArrowLeft className="size-4" />
        Products
      </Button>
      <ProductCreateForm categories={categories} />
    </>
  )
}
