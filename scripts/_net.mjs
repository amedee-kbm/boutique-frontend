import { readFileSync } from 'node:fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ''),
      ]
    })
)
const test = async (label, url) => {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 8000)
    const r = await fetch(url, { signal: c.signal })
    clearTimeout(t)
    console.log(label, 'OK', r.status, r.headers.get('content-length') || '?')
  } catch (e) {
    console.log(label, 'FAIL', e.message)
  }
}
await test('internet(picsum):', 'https://picsum.photos/seed/x/400/500')
await test('supabase:', env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/product-images/')
console.log('SUPABASE_URL host:', new URL(env.NEXT_PUBLIC_SUPABASE_URL).host)
