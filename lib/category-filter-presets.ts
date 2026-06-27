// Seeded default facets so a newly created category isn't a blank slate for the
// non-technical seller. Matched by a normalised category name; an unknown name
// falls back to a generic Occasion facet. All seeded facets are editable and
// removable in the category editor.

export interface FilterPreset {
  name: string
  options: string[]
}

const GENERIC: FilterPreset[] = [
  { name: 'Occasion', options: ['Casual', 'Everyday', 'Party', 'Work'] },
]

const BY_CATEGORY: Record<string, FilterPreset[]> = {
  dresses: [
    { name: 'Length', options: ['Mini', 'Midi', 'Maxi'] },
    { name: 'Occasion', options: ['Casual', 'Party', 'Work'] },
  ],
  tops: [{ name: 'Sleeve', options: ['Sleeveless', 'Short sleeve', 'Long sleeve'] }],
  bottoms: [{ name: 'Fit', options: ['Skinny', 'Straight', 'Wide', 'Loose'] }],
}

export function defaultFiltersForCategory(name: string): FilterPreset[] {
  return BY_CATEGORY[name.trim().toLowerCase()] ?? GENERIC
}
