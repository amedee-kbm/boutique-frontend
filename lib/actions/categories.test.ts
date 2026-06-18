// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { categoryFormSchema } from '@/lib/actions/categories'

describe('categoryFormSchema', () => {
  it('accepts a valid category', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'tops' }).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(categoryFormSchema.safeParse({ name: '', slug: 'tops' }).success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    expect(categoryFormSchema.safeParse({ name: 'a'.repeat(101), slug: 'tops' }).success).toBe(
      false
    )
  })

  it('rejects slug with spaces', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'my tops' }).success).toBe(false)
  })

  it('rejects slug with uppercase letters', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'Tops' }).success).toBe(false)
  })

  it('rejects slug with special chars', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'tops!' }).success).toBe(false)
  })

  it('accepts slug with hyphens and numbers', () => {
    expect(
      categoryFormSchema.safeParse({ name: 'T-Shirts & Tops', slug: 't-shirts-2025' }).success
    ).toBe(true)
  })
})
