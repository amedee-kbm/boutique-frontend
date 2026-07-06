// A unique id for client-staged rows (variant options, staged images, filter
// keys) and server-side pre-insert ids. Uses crypto.randomUUID where available
// and falls back to a random string on older runtimes that lack it.
export function tempId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}`
}
