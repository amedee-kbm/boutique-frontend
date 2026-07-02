'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createProduct, updateProduct, uploadProductImage } from '@/features/products'
import { setProductFilterValue } from '@/features/products'
import { formatPrice } from '@/shared/lib/format'
import { useMediaQuery } from '@/shared/hooks/use-media-query'
import { addVariantGroup, addVariantOption } from '@/features/products'
import type { CategoryFilter } from '@/lib/db/queries'
import { VariantStager, type StagedVariantGroup } from '@/features/products'
import { VariantManager } from '@/features/products'
import { ProductImageManager } from '@/features/products'
import { EditorHeader } from '@/features/admin/ui'
import { FieldRow } from '@/features/admin/ui'
import { SubScreen } from '@/features/admin/ui'
import { SectionCard } from '@/features/admin/ui'
import { FloatingLabelInput } from '@/features/admin/ui'
import { MediaZone } from '@/features/admin/ui'
import { ChevronDown } from 'lucide-react'

import { Input } from '@/shared/ui'
import { Button } from '@/shared/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui'

interface Category {
  id: string
  name: string
}

interface ProductImage {
  id: string
  url: string
  alt: string | null
  optionId: string | null
}

interface VariantGroup {
  id: string
  name: string
  options: { id: string; value: string; imageId: string | null; hex: string | null }[]
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
  filterOptionIds: string[]
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
      <DropdownMenuContent align="end">
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
  categoryFilters = [],
  product,
}: {
  categories: Category[]
  categoryFilters?: CategoryFilter[]
  product?: Product
}) {
  const router = useRouter()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(product)

  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product?.price ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '')
  const [visible, setVisible] = useState(product?.visible ?? true)
  const [files, setFiles] = useState<File[]>([])
  const [variantGroups, setVariantGroups] = useState<StagedVariantGroup[]>([])
  const [filterOptionIds, setFilterOptionIds] = useState<string[]>(product?.filterOptionIds ?? [])

  const [priceOpen, setPriceOpen] = useState(false)
  const [priceDraft, setPriceDraft] = useState('')
  const [descOpen, setDescOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filterSummary =
    filterOptionIds.length > 0 ? `${filterOptionIds.length} selected` : undefined

  function toggleFilterOption(optionId: string, selected: boolean) {
    if (!product) return
    const previous = filterOptionIds
    setFilterOptionIds((prev) =>
      selected ? [...prev, optionId] : prev.filter((id) => id !== optionId)
    )
    startTransition(async () => {
      const result = await setProductFilterValue(product.id, optionId, selected)
      if (result.error) {
        toast.error(result.error)
        setFilterOptionIds(previous)
      }
    })
  }

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
    <div className="mx-auto max-w-screen-xl">
      <EditorHeader
        center={isDesktop ? undefined : <StatusSelector visible={visible} onChange={setVisible} />}
        saveType="button"
        saving={isPending}
        onSave={handleSave}
        onCancel={() => router.push('/admin/products')}
      />

      <div className="mt-5 space-y-5 md:mt-6 md:grid md:grid-cols-[1fr_288px] md:items-start md:gap-8 md:space-y-0">
        {/* ── Main / left column ── */}
        <div className="space-y-5">
          <SectionCard label="Media">
            {product ? (
              <ProductImageManager
                key={product.images.map((img) => img.id).join(',')}
                productId={product.id}
                initialImages={product.images}
                colorOptions={
                  product.variantGroups
                    .find((g) => g.name === 'Colour')
                    ?.options.map((o) => ({ id: o.id, value: o.value, hex: o.hex })) ?? []
                }
              />
            ) : (
              <MediaZone onChange={setFiles} />
            )}
          </SectionCard>

          <Input
            aria-label="Product title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product title"
            className="h-11 text-base"
          />

          {isDesktop ? (
            <>
              <SectionCard label="Description">
                <textarea
                  aria-label="Product description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the fabric, fit, sizes available…"
                  className="min-h-40 w-full resize-y border-0 text-sm outline-none"
                />
              </SectionCard>

              <SectionCard label="Category">
                <select
                  aria-label="Category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </SectionCard>

              <SectionCard label="Price">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">RWF</span>
                  <Input
                    aria-label="Price"
                    type="text"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="5000"
                    className="max-w-[200px]"
                  />
                </div>
              </SectionCard>

              <SectionCard className="p-0">
                <div className="divide-y">
                  <FieldRow
                    label="Variants"
                    value={variantSummary}
                    emptyLabel="Add options (color, size, etc.)"
                    onClick={() => setVariantsOpen(true)}
                  />
                  {isEditing && categoryFilters.length > 0 && (
                    <FieldRow
                      label="Filters"
                      value={filterSummary}
                      emptyLabel="Tag for category filters"
                      onClick={() => setFiltersOpen(true)}
                    />
                  )}
                </div>
              </SectionCard>
            </>
          ) : (
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
                {isEditing && categoryFilters.length > 0 && (
                  <FieldRow
                    label="Filters"
                    value={filterSummary}
                    emptyLabel="Tag for category filters"
                    onClick={() => setFiltersOpen(true)}
                  />
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Right sidebar (desktop only) ── */}
        {isDesktop && (
          <div className="sticky top-16 flex flex-col gap-4">
            <SectionCard label="Status">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground text-sm">
                  {visible ? 'Visible in store' : 'Hidden from store'}
                </span>
                <StatusSelector visible={visible} onChange={setVisible} />
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {/* SubScreens — mobile primary; Variants/Filters also available on desktop */}
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

      <SubScreen open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters">
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Tag this product so it appears under the right category filters.
          </p>
          {categoryFilters.map((filter) => (
            <section key={filter.id} className="space-y-2">
              <h3 className="text-sm font-medium">{filter.name}</h3>
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => {
                  const selected = filterOptionIds.includes(option.id)
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      aria-pressed={selected}
                      className={'rounded-full' /* unslop-ignore: pill chips, P7 */}
                      onClick={() => toggleFilterOption(option.id, !selected)}
                    >
                      {option.value}
                    </Button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </SubScreen>

      <SubScreen open={variantsOpen} onOpenChange={setVariantsOpen} title="Variants">
        {product ? (
          <VariantManager
            productId={product.id}
            initialGroups={product.variantGroups}
            images={product.images}
          />
        ) : (
          <VariantStager groups={variantGroups} onChange={setVariantGroups} />
        )}
      </SubScreen>
    </div>
  )
}
