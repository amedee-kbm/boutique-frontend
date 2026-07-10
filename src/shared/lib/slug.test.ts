import { describe, expect, it } from 'vitest'

import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates a plain name', () => {
    expect(slugify('Summer Dress')).toBe('summer-dress')
  })

  it('collapses runs of whitespace and underscores', () => {
    expect(slugify('  Red   Silk_Scarf  ')).toBe('red-silk-scarf')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('--Boubou--')).toBe('boubou')
  })

  it('folds accents to their ASCII base rather than deleting them', () => {
    // `é` used to be stripped outright, turning "Créole" into "crole".
    expect(slugify('Créole Élégance')).toBe('creole-elegance')
  })

  it('never returns an empty slug for a fully non-Latin name', () => {
    // This is the bug the helper exists for: a name with no ASCII characters
    // slugged to '', which then 400s or collides on the unique index.
    const slug = slugify('ትግርኛ')

    expect(slug).not.toBe('')
    expect(slug).toMatch(/^item-[a-z0-9]{1,6}$/)
  })

  it('gives distinct fallbacks to two unsluggable names', () => {
    expect(slugify('日本語')).not.toBe(slugify('日本語'))
  })
})
