'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createProduct, updateProduct, uploadProductImage } from '@/lib/actions/products'
import { formatPrice } from '@/lib/format'
import { addVariantGroup, addVariantOption } from '@/lib/actions/variants'
import { VariantStager, type StagedVariantGroup } from '@/components/admin/VariantStager'
import { VariantManager } from '@/components/admin/VariantManager'
import { ProductImageManager } from '@/components/admin/ProductImageManager'
import { EditorHeader } from '@/components/admin/ui/EditorHeader'
import { FieldRow } from '@/components/admin/ui/FieldRow'
import { SubScreen } from '@/components/admin/ui/SubScreen'
import { SectionCard } from '@/components/admin/ui/SectionCard'
import { FloatingLabelInput } from '@/components/admin/ui/FloatingLabelInput'
import { MediaZone } from '@/components/admin/ui/MediaZone'
import { ChevronDown } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Category {
  id: string
  name: string
}

interface ProductImage {
  id: string
  url: string
  alt: string | null
}

interface VariantGroup {
  id: string
  name: string
  options: { id: string; value: string }[]
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: string
  categoryId: string | null
  visible: boolean
  images: ProductImage[]
  variantGroups: VariantGroup[]
}

function StatusSelector({
  visible,
  onChange,
}: {
  visible: boolean
  onChange: (visible: boolean) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="gap-1 font-medium">
            {visible ? 'Visible' : 'Hidden'}
            <ChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="center">
        <DropdownMenuRadioGroup
          value={visible ? 'visible' : 'hidden'}
          onValueChange={(value) => onChange(value === 'visible')}
        >
          <DropdownMenuRadioItem value="visible">Visible in store</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="hidden">Hidden from store</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ProductEditor({
  categories,
  product,
}: {
  categories: Category[]
  product?: Product
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(product)

  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product?.price ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '')
  const [visible, setVisible] = useState(product?.visible ?? true)
  const [files, setFiles] = useState<File[]>([])
  const [variantGroups, setVariantGroups] = useState<StagedVariantGroup[]>([])

  const [priceOpen, setPriceOpen] = useState(false)
  const [priceDraft, setPriceDraft] = useState('')
  const [descOpen, setDescOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [variantsOpen, setVariantsOpen] = useState(false)

  const categoryName = categories.find((c) => c.id === categoryId)?.name

  const variantSummary = isEditing
    ? product!.variantGroups.map((g) => g.name).join(', ') || undefined
    : variantGroups.length
      ? variantGroups.map((g) => g.name).join(', ')
      : undefined

  function buildFormData() {
    const formData = new FormData()
    formData.set('name', name)
    formData.set('price', price)
    if (description) formData.set('description', description)
    formData.set('categoryId', categoryId)
    formData.set('visible', String(visible))
    return formData
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Add a product title')
      return
    }

    startTransition(async () => {
      const formData = buildFormData()

      if (product) {
        // Keep the existing slug so store links stay stable.
        formData.set('slug', product.slug)
        const result = await updateProduct(product.id, formData)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Product saved')
        router.refresh()
        return
      }

      const result = await createProduct(formData)
      if (result.error || !result.id) {
        toast.error(result.error ?? 'Could not create product')
        return
      }

      const uploads = await Promise.all(
        files.map((file, index) => {
          const imageData = new FormData()
          imageData.set('file', file)
          return uploadProductImage(result.id, imageData, index)
        })
      )
      for (const upload of uploads) {
        if (upload.error) toast.error(upload.error)
      }

      for (const group of variantGroups) {
        const created = await addVariantGroup(result.id, group.name)
        if (created.error || !created.group) {
          toast.error(created.error ?? 'Could not add variant group')
          continue
        }
        for (const option of group.options) {
          const added = await addVariantOption(created.group.id, result.id, option.value)
          if (added.error) toast.error(added.error)
        }
      }

      toast.success('Product created')
      router.push(`/admin/products/${result.id}/edit`)
    })
  }

  return (
    <div className="space-y-5">
      <EditorHeader
        center={<StatusSelector visible={visible} onChange={setVisible} />}
        saveType="button"
        saving={isPending}
        onSave={handleSave}
        onCancel={() => router.push('/admin/products')}
      />

      <SectionCard label="Media">
        {product ? (
          <ProductImageManager
            key={product.images.map((img) => img.id).join(',')}
            productId={product.id}
            initialImages={product.images}
          />
        ) : (
          <MediaZone onChange={setFiles} />
        )}
      </SectionCard>

      <div className="space-y-3">
        <Input
          aria-label="Product title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product title"
          className="h-11 text-base"
        />

        <SectionCard className="p-0">
          <div className="divide-y">
            <FieldRow
              label="Description"
              value={description}
              emptyLabel="Add description"
              onClick={() => setDescOpen(true)}
            />
            <FieldRow
              label="Category"
              value={categoryName}
              emptyLabel="Select category"
              onClick={() => setCategoryOpen(true)}
            />
            <FieldRow
              label="Price"
              value={price ? formatPrice(price) : undefined}
              emptyLabel="Set price"
              onClick={() => {
                setPriceDraft(price)
                setPriceOpen(true)
              }}
            />
            <FieldRow
              label="Variants"
              value={variantSummary}
              emptyLabel="Add options (color, size, etc.)"
              onClick={() => setVariantsOpen(true)}
            />
          </div>
        </SectionCard>
      </div>

      <SubScreen open={descOpen} onOpenChange={setDescOpen} title="Description">
        <textarea
          aria-label="Product description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the fabric, fit, sizes available…"
          className="h-full min-h-60 w-full resize-none border-0 text-sm outline-none"
        />
      </SubScreen>

      <SubScreen
        open={priceOpen}
        onOpenChange={setPriceOpen}
        title="Price"
        saveLabel="Done"
        onSave={() => setPrice(priceDraft)}
      >
        <FloatingLabelInput
          label="Price"
          prefix="RWF"
          inputMode="numeric"
          value={priceDraft}
          onChange={(e) => setPriceDraft(e.target.value)}
          placeholder="5000"
        />
      </SubScreen>

      <SubScreen open={categoryOpen} onOpenChange={setCategoryOpen} title="Category">
        <div className="divide-y">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start"
            onClick={() => {
              setCategoryId('')
              setCategoryOpen(false)
            }}
          >
            Uncategorized
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              type="button"
              variant="ghost"
              className="h-11 w-full justify-start"
              onClick={() => {
                setCategoryId(c.id)
                setCategoryOpen(false)
              }}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </SubScreen>

      <SubScreen open={variantsOpen} onOpenChange={setVariantsOpen} title="Variants">
        {product ? (
          <VariantManager productId={product.id} initialGroups={product.variantGroups} />
        ) : (
          <VariantStager groups={variantGroups} onChange={setVariantGroups} />
        )}
      </SubScreen>
    </div>
  )
}
