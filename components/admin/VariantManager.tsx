'use client'

import { useState, useTransition } from 'react'
import { ImageIcon, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  addVariantGroup,
  addVariantOption,
  deleteVariantGroup,
  deleteVariantOption,
  setVariantOptionImage,
} from '@/lib/actions/variants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductThumb } from '@/components/admin/ProductThumb'
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
}

interface VariantGroup {
  id: string
  name: string
  options: VariantOption[]
}

function OptionInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState('')

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add an option (e.g. M)"
        className="h-7"
      />
      <Button type="submit" size="icon-sm" variant="outline" aria-label="Add option">
        <Plus className="size-4" />
      </Button>
    </form>
  )
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
  const [newGroup, setNewGroup] = useState('')
  const [, startTransition] = useTransition()

  function handleAddGroup() {
    const name = newGroup.trim()
    if (!name) return
    setNewGroup('')
    startTransition(async () => {
      const result = await addVariantGroup(productId, name)
      if (result.error || !result.group) {
        toast.error(result.error ?? 'Could not add group')
        return
      }
      setGroups((prev) => [...prev, { ...result.group, options: [] }])
    })
  }

  function handleDeleteGroup(id: string) {
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

  function handleAddOption(groupId: string, value: string) {
    startTransition(async () => {
      const result = await addVariantOption(groupId, productId, value)
      if (result.error || !result.option) {
        toast.error(result.error ?? 'Could not add option')
        return
      }
      const option = { ...result.option, imageId: null }
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, options: [...g.options, option] } : g))
      )
    })
  }

  function handleSetOptionImage(groupId: string, optionId: string, imageId: string | null) {
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

  function handleDeleteOption(groupId: string, optionId: string) {
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

  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No variants yet. Add a group like “Size” or “Color”, then list its options.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{group.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDeleteGroup(group.id)}
              aria-label={`Delete ${group.name} group`}
            >
              <X className="text-destructive size-4" />
            </Button>
          </div>

          {group.options.length > 0 && (
            <ul className="divide-y">
              {group.options.map((option) => {
                const image = images.find((img) => img.id === option.imageId) ?? null
                return (
                  <li key={option.id} className="flex items-center gap-3 py-2">
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
                        <DropdownMenuItem
                          onClick={() => handleSetOptionImage(group.id, option.id, null)}
                        >
                          <ImageIcon className="size-4" />
                          No image
                        </DropdownMenuItem>
                        {images.map((img) => (
                          <DropdownMenuItem
                            key={img.id}
                            onClick={() => handleSetOptionImage(group.id, option.id, img.id)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.alt ?? ''}
                              className="size-6 rounded object-cover"
                            />
                            {img.alt || 'Product image'}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="flex-1 text-sm">{option.value}</span>

                    <button
                      type="button"
                      onClick={() => handleDeleteOption(group.id, option.id)}
                      aria-label={`Remove ${option.value}`}
                      className="hover:bg-muted text-muted-foreground rounded-full p-1.5"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {images.length === 0 && group.options.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Add product images to assign one per option.
            </p>
          )}

          <OptionInput onAdd={(value) => handleAddOption(group.id, value)} />
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAddGroup()
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="New group (e.g. Size)"
        />
        <Button type="submit" variant="outline" size="sm" aria-label="Add group">
          <Plus className="size-4" />
          Group
        </Button>
      </form>
    </div>
  )
}
