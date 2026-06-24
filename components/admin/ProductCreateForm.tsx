'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createProduct, uploadProductImage } from '@/lib/actions/products'
import { EditorHeader } from '@/components/admin/ui/EditorHeader'
import { FieldRow } from '@/components/admin/ui/FieldRow'
import { SubScreen } from '@/components/admin/ui/SubScreen'
import { SectionCard } from '@/components/admin/ui/SectionCard'
import { FloatingLabelInput } from '@/components/admin/ui/FloatingLabelInput'
import { MediaZone } from '@/components/admin/ui/MediaZone'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

interface Category {
  id: string
  name: string
}

export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [visible, setVisible] = useState(true)
  const [files, setFiles] = useState<File[]>([])

  const [priceOpen, setPriceOpen] = useState(false)
  const [priceDraft, setPriceDraft] = useState('')
  const [descOpen, setDescOpen] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)

  const categoryName = categories.find((c) => c.id === categoryId)?.name

  function handleSave() {
    if (!name.trim()) {
      toast.error('Add a product title')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('name', name)
      formData.set('price', price)
      if (description) formData.set('description', description)
      formData.set('categoryId', categoryId)
      formData.set('visible', String(visible))

      const result = await createProduct(formData)
      if (result.error || !result.id) {
        toast.error(result.error ?? 'Could not create product')
        return
      }

      for (const file of files) {
        const imageData = new FormData()
        imageData.set('file', file)
        const upload = await uploadProductImage(result.id, imageData)
        if (upload.error) toast.error(upload.error)
      }

      toast.success('Product created')
      router.push(`/admin/products/${result.id}/edit`)
    })
  }

  return (
    <div className="space-y-5">
      <EditorHeader
        title="New product"
        saveType="button"
        saving={isPending}
        onSave={handleSave}
        onCancel={() => router.push('/admin/products')}
      />

      <SectionCard label="Media">
        <MediaZone onChange={setFiles} />
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
              onClick={() => {
                setDescDraft(description)
                setDescOpen(true)
              }}
            />
            <FieldRow
              label="Category"
              value={categoryName}
              emptyLabel="Select category"
              onClick={() => setCategoryOpen(true)}
            />
            <FieldRow
              label="Price"
              value={price ? `$${price}` : undefined}
              emptyLabel="Set price"
              onClick={() => {
                setPriceDraft(price)
                setPriceOpen(true)
              }}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard label="Availability">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Visible in store</p>
            <p className="text-muted-foreground text-xs">
              Turn off to hide this product from customers.
            </p>
          </div>
          <Switch checked={visible} onCheckedChange={setVisible} aria-label="Visible in store" />
        </div>
      </SectionCard>

      <SubScreen
        open={descOpen}
        onOpenChange={setDescOpen}
        title="Description"
        saveLabel="Done"
        onSave={() => setDescription(descDraft)}
      >
        <textarea
          aria-label="Product description"
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
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
          inputMode="decimal"
          value={priceDraft}
          onChange={(e) => setPriceDraft(e.target.value)}
          placeholder="29.99"
        />
      </SubScreen>

      <SubScreen
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        title="Category"
        saveLabel="Done"
      >
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
    </div>
  )
}
