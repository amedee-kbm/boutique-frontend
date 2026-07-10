'use client'

import { useState, useTransition } from 'react'
import { useMutation } from '@tanstack/react-query'
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
} from '@/features/admin/products'
import { defaultHexForName } from '../consts/variant-presets'
import { ProductThumb } from '@/shared/components/ProductThumb'
import { VariantBuilder, type BuilderOption } from './VariantBuilder'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui'

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

  // Optimistic writes with rollback: each snapshots `groups` in onMutate, applies
  // the change immediately, and restores the snapshot if the server action fails.
  const rollback = (err: Error, _vars: unknown, ctx: { previous: VariantGroup[] } | undefined) => {
    toast.error(err.message)
    if (ctx) setGroups(ctx.previous)
  }

  // Untick a value: remove the option, and if it was the group's last one, remove
  // the group too. Both server calls happen in the one mutation so a failure at
  // either step rolls the whole optimistic edit back.
  const removeOptionCascade = useMutation({
    mutationFn: async ({ group, option }: { group: VariantGroup; option: VariantOption }) => {
      const removed = await deleteVariantOption(option.id, productId)
      if (removed.error) throw new Error(removed.error)
      if (group.options.length === 1) {
        const removedGroup = await deleteVariantGroup(group.id, productId)
        if (removedGroup.error) throw new Error(removedGroup.error)
      }
    },
    onMutate: ({ group, option }) => {
      const previous = groups
      setGroups((prev) =>
        prev.flatMap((g) => {
          if (g.id !== group.id) return [g]
          const options = g.options.filter((o) => o.id !== option.id)
          return options.length > 0 ? [{ ...g, options }] : []
        })
      )
      return { previous }
    },
    onError: rollback,
  })

  const removeGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteVariantGroup(id, productId)
      if (result.error) throw new Error(result.error)
    },
    onMutate: (id: string) => {
      const previous = groups
      setGroups((prev) => prev.filter((g) => g.id !== id))
      return { previous }
    },
    onError: rollback,
  })

  const removeOptionMutation = useMutation({
    mutationFn: async ({ optionId }: { groupId: string; optionId: string }) => {
      const result = await deleteVariantOption(optionId, productId)
      if (result.error) throw new Error(result.error)
    },
    onMutate: ({ groupId, optionId }) => {
      const previous = groups
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g
        )
      )
      return { previous }
    },
    onError: rollback,
  })

  const reorderGroupsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const result = await reorderVariantGroups(productId, orderedIds)
      if (result.error) throw new Error(result.error)
    },
    onMutate: (orderedIds: string[]) => {
      const previous = groups
      setGroups((prev) =>
        orderedIds.map((id) => prev.find((g) => g.id === id)).filter((g) => g !== undefined)
      )
      return { previous }
    },
    onError: rollback,
  })

  const setOptionImageMutation = useMutation({
    mutationFn: async ({
      optionId,
      imageId,
    }: {
      groupId: string
      optionId: string
      imageId: string | null
    }) => {
      const result = await setVariantOptionImage(optionId, productId, imageId)
      if (result.error) throw new Error(result.error)
    },
    onMutate: ({ groupId, optionId, imageId }) => {
      const previous = groups
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, imageId } : o)) }
            : g
        )
      )
      return { previous }
    },
    onError: rollback,
  })

  const setOptionHexMutation = useMutation({
    mutationFn: async ({
      optionId,
      hex,
    }: {
      groupId: string
      optionId: string
      hex: string | null
    }) => {
      const result = await setVariantOptionHex(optionId, productId, hex)
      if (result.error) throw new Error(result.error)
    },
    onMutate: ({ groupId, optionId, hex }) => {
      const previous = groups
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, hex } : o)) }
            : g
        )
      )
      return { previous }
    },
    onError: rollback,
  })

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

    const group = groups.find((g) => g.name === groupName)
    const option = group?.options.find((o) => o.value === value)
    if (!group || !option) return
    removeOptionCascade.mutate({ group, option })
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
    removeGroupMutation.mutate(id)
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
    removeOptionMutation.mutate({ groupId, optionId })
  }

  function reorderGroups(orderedIds: string[]) {
    reorderGroupsMutation.mutate(orderedIds)
  }

  function setOptionImage(groupId: string, optionId: string, imageId: string | null) {
    setOptionImageMutation.mutate({ groupId, optionId, imageId })
  }

  function setOptionHex(groupId: string, optionId: string, hex: string | null) {
    setOptionHexMutation.mutate({ groupId, optionId, hex })
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
