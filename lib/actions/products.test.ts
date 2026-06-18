// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { productFormSchema } from '@/lib/actions/products'

const base = { name: 'Floral Dress', slug: 'floral-dress', price: '29.99' }

describe('productFormSchema', () => {
  it('accepts a full valid product', () => {
    const result = productFormSchema.safeParse({
      ...base,
      description: 'A lovely dress',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      visible: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a minimal product and defaults visible to true', () => {
    const result = productFormSchema.parse(base)
    expect(result.visible).toBe(true)
    expect(result.description).toBeUndefined()
  })

  it('rejects an empty name', () => {
    expect(productFormSchema.safeParse({ ...base, name: '' }).success).toBe(false)
  })

  it('rejects a slug with spaces or uppercase', () => {
    expect(productFormSchema.safeParse({ ...base, slug: 'Floral Dress' }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, slug: 'Floral' }).success).toBe(false)
  })

  it.each(['10', '10.5', '10.50', '1299.00'])('accepts valid price %s', (price) => {
    expect(productFormSchema.safeParse({ ...base, price }).success).toBe(true)
  })

  it.each(['abc', '10.999', '$10', '10.', '-5'])('rejects invalid price %s', (price) => {
    expect(productFormSchema.safeParse({ ...base, price }).success).toBe(false)
  })

  it('accepts null or omitted categoryId', () => {
    expect(productFormSchema.safeParse({ ...base, categoryId: null }).success).toBe(true)
    expect(productFormSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a non-uuid categoryId', () => {
    expect(productFormSchema.safeParse({ ...base, categoryId: 'not-a-uuid' }).success).toBe(false)
  })
})
