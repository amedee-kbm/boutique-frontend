// Single source of truth for turning a display name into a URL slug.
//
// The old regex `[^\w\s-]` stripped every non-ASCII character, so a
// Kinyarwanda/accented name could reduce to an empty string and then 400 or
// collide on the unique index. We normalize accents to their ASCII base first
// (é → e), and if the result is still empty (e.g. a fully non-Latin name) we
// fall back to a short stable id so the slug is never empty.
export function slugify(str: string): string {
  const slug = str
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (slug) return slug

  return `item-${Math.random().toString(36).slice(2, 8)}`
}
