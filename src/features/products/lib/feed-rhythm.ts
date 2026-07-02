// Home feed rhythm. Most tiles sit two-up; every Nth tile spans the full width
// to break the grid the way Zara's feed does. Index 0 is a full-bleed hero.
// Kept as one small rule so the pattern isn't hardcoded per item.
const FULL_BLEED_EVERY = 5

export function isFullBleed(index: number): boolean {
  return index % FULL_BLEED_EVERY === 0
}
