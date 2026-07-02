'use client'

import { useState, useTransition } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  addVariantGroup,
  addVariantOption,
  deleteVariantGroup,
  deleteVariantOption,
  reorderVariantGroups,
  setVariantOptionHex,
  setVariantOptionImage,
} from '@/lib/actions/variants'
import { defaultHexForName } from '@/lib/variant-presets'
import { ProductThumb } from '@/components/admin/ProductThumb'
import { VariantBuilder, type BuilderOption } from '@/components/admin/VariantBuilder'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProductImage {
  id: string
  url: string
  alt: string | null
}

interface VariantOption {
  id: string
  value: string
  imageId: string | null
  hex: string | null
}

interface VariantGroup {
  id: string
  name: string
  options: VariantOption[]
}

export function VariantManager({
  productId,
  initialGroups,
  images,
}: {
  productId: string
  initialGroups: VariantGroup[]
  images: ProductImage[]
}) {
  const [groups, setGroups] = useState<VariantGroup[]>(initialGroups)
  const [, startTransition] = useTransition()

  function toggleOption(groupName: string, value: string, selected: boolean) {
    if (selected) {
      startTransition(async () => {
        let groupId = groups.find((g) => g.name === groupName)?.id
        if (!groupId) {
          const created = await addVariantGroup(productId, groupName)
          if (created.error || !created.group) {
            toast.error(created.error ?? 'Could not add group')
            return
          }
          groupId = created.group.id
          setGroups((prev) => [
            ...prev,
            { id: created.group.id, name: created.group.name, options: [] },
          ])
        }
        const added = await addVariantOption(groupId, productId, value)
        if (added.error || !added.option) {
          toast.error(added.error ?? 'Could not add option')
          return
        }
        const option = { ...added.option, imageId: null, hex: null }
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, options: [...g.options, option] } : g))
        )
      })
      return
    }

    const previous = groups
    const group = groups.find((g) => g.name === groupName)
    const option = group?.options.find((o) => o.value === value)
    if (!group || !option) return
    const lastOption = group.options.length === 1

    setGroups((prev) =>
      prev.flatMap((g) => {
        if (g.id !== group.id) return [g]
        const options = g.options.filter((o) => o.id !== option.id)
        return options.length > 0 ? [{ ...g, options }] : []
      })
    )

    startTransition(async () => {
      const removed = await deleteVariantOption(option.id, productId)
      if (removed.error) {
        toast.error(removed.error)
        setGroups(previous)
        return
      }
      if (lastOption) {
        const removedGroup = await deleteVariantGroup(group.id, productId)
        if (removedGroup.error) {
          toast.error(removedGroup.error)
          setGroups(previous)
        }
      }
    })
  }

  function addCustomGroup(name: string) {
    startTransition(async () => {
      const result = await addVariantGroup(productId, name)
      if (result.error || !result.group) {
        toast.error(result.error ?? 'Could not add group')
        return
      }
      setGroups((prev) => [...prev, { id: result.group.id, name: result.group.name, options: [] }])
    })
  }

  function removeGroup(id: string) {
    const previous = groups
    setGroups((prev) => prev.filter((g) => g.id !== id))
    startTransition(async () => {
      const result = await deleteVariantGroup(id, productId)
      if (result.error) {
        toast.error(result.error)
        setGroups(previous)
      }
    })
  }

  function addCustomOption(groupId: string, value: string) {
    startTransition(async () => {
      const result = await addVariantOption(groupId, productId, value)
      if (result.error || !result.option) {
        toast.error(result.error ?? 'Could not add option')
        return
      }
      const option = { ...result.option, imageId: null, hex: null }
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, options: [...g.options, option] } : g))
      )
    })
  }

  function removeOption(groupId: string, optionId: string) {
    const previous = groups
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g
      )
    )
    startTransition(async () => {
      const result = await deleteVariantOption(optionId, productId)
      if (result.error) {
        toast.error(result.error)
        setGroups(previous)
      }
    })
  }

  function reorderGroups(orderedIds: string[]) {
    const previous = groups
    setGroups((prev) =>
      orderedIds.map((id) => prev.find((g) => g.id === id)).filter((g) => g !== undefined)
    )
    startTransition(async () => {
      const result = await reorderVariantGroups(productId, orderedIds)
      if (result.error) {
        toast.error(result.error)
        setGroups(previous)
      }
    })
  }

  function setOptionImage(groupId: string, optionId: string, imageId: string | null) {
    const previous = groups
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, imageId } : o)) }
          : g
      )
    )
    startTransition(async () => {
      const result = await setVariantOptionImage(optionId, productId, imageId)
      if (result.error) {
        toast.error(result.error)
        setGroups(previous)
      }
    })
  }

  function setOptionHex(groupId: string, optionId: string, hex: string | null) {
    const previous = groups
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, hex } : o)) }
          : g
      )
    )
    startTransition(async () => {
      const result = await setVariantOptionHex(optionId, productId, hex)
      if (result.error) {
        toast.error(result.error)
        setGroups(previous)
      }
    })
  }

  function renderColorSwatch(groupId: string, option: BuilderOption) {
    const hex = groups.find((g) => g.id === groupId)?.options.find((o) => o.id === option.id)?.hex
    return (
      <div className="flex items-center gap-1">
        <label
          className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border"
          aria-label={`Colour for ${option.value}`}
        >
          <span className="block size-full" style={{ backgroundColor: hex ?? 'transparent' }} />
          {!hex && (
            <span className="text-muted-foreground absolute inset-0 grid place-items-center text-[10px]">
              +
            </span>
          )}
          <input
            type="color"
            value={hex ?? defaultHexForName(option.value)}
            onChange={(e) =>
              setGroups((prev) =>
                prev.map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        options: g.options.map((o) =>
                          o.id === option.id ? { ...o, hex: e.target.value } : o
                        ),
                      }
                    : g
                )
              )
            }
            onBlur={(e) => setOptionHex(groupId, option.id, e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        {hex && (
          <button
            type="button"
            onClick={() => setOptionHex(groupId, option.id, null)}
            aria-label={`Clear colour for ${option.value}`}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    )
  }

  function renderOptionImage(groupId: string, option: BuilderOption) {
    const imageId = groups
      .find((g) => g.id === groupId)
      ?.options.find((o) => o.id === option.id)?.imageId
    const image = images.find((img) => img.id === imageId) ?? null
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={images.length === 0}
          render={
            <button
              type="button"
              aria-label={`Image for ${option.value}`}
              className="bg-muted text-muted-foreground hover:bg-muted/70 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border disabled:opacity-50"
            >
              {image ? (
                <ProductThumb
                  src={image.url}
                  alt={image.alt ?? ''}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-4" />
              )}
            </button>
          }
        />
        <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
          <DropdownMenuItem onClick={() => setOptionImage(groupId, option.id, null)}>
            <ImageIcon className="size-4" />
            No image
          </DropdownMenuItem>
          {images.map((img) => (
            <DropdownMenuItem
              key={img.id}
              onClick={() => setOptionImage(groupId, option.id, img.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ''} className="size-6 rounded object-cover" />
              {img.alt || 'Product image'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function renderOptionTrailing(groupId: string, option: BuilderOption) {
    return (
      <div className="flex items-center gap-2">
        {renderColorSwatch(groupId, option)}
        {images.length > 0 && renderOptionImage(groupId, option)}
      </div>
    )
  }

  return (
    <VariantBuilder
      groups={groups}
      onToggleOption={toggleOption}
      onAddCustomGroup={addCustomGroup}
      onRemoveGroup={removeGroup}
      onAddCustomOption={addCustomOption}
      onRemoveOption={removeOption}
      onReorderGroups={reorderGroups}
      renderOptionTrailing={renderOptionTrailing}
    />
  )
}
