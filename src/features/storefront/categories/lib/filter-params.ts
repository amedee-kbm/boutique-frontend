import { parseAsArrayOf, parseAsString, parseAsStringEnum } from 'nuqs'

import type { SortOption } from './filters'
// nuqs parsers for the client filter controls. Kept in their own module because
// nuqs parser factories are client-only — importing them into a Server Component
// breaks the build. Arrays serialise comma-separated, matching parseFilterParams.
export const filterParsers = {
  f: parseAsArrayOf(parseAsString).withDefault([]),
  colour: parseAsArrayOf(parseAsString).withDefault([]),
  price: parseAsString.withDefault(''),
  sort: parseAsStringEnum<SortOption>(['newest', 'price-asc', 'price-desc']).withDefault('newest'),
}
