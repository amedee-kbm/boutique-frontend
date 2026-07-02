import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
mkdirSync('scripts/_imgs', { recursive: true })
// name -> keywords (loremflickr) ; two locks each for 2 distinct shots per colour
const items = [
  ['dress-navy-1', 'dress,blue,fashion', 11],
  ['dress-navy-2', 'dress,blue,fashion', 12],
  ['dress-rust-1', 'dress,orange,fashion', 21],
  ['dress-rust-2', 'dress,orange,fashion', 22],
  ['dress-black-1', 'dress,black,fashion', 31],
  ['dress-black-2', 'dress,black,fashion', 32],
  ['shirt-white-1', 'shirt,white,linen', 41],
  ['shirt-white-2', 'shirt,white,linen', 42],
  ['shirt-sage-1', 'shirt,green', 51],
  ['shirt-sage-2', 'shirt,green', 52],
  ['skirt-1', 'skirt,fashion', 61],
  ['skirt-2', 'skirt,fashion', 62],
  ['shoes-1', 'heels,shoes', 71],
  ['bag-1', 'handbag,leather', 81],
]
const results = []
for (const [name, kw, lock] of items) {
  const url = `https://loremflickr.com/900/1200/${encodeURIComponent(kw)}?lock=${lock}`
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 20000)
    const r = await fetch(url, { signal: c.signal, redirect: 'follow' })
    clearTimeout(t)
    if (!r.ok) {
      console.log('skip', name, r.status)
      continue
    }
    const raw = Buffer.from(await r.arrayBuffer())
    if (raw.length < 8000) {
      console.log('skip(tiny)', name, raw.length)
      continue
    }
    // normalize to jpg, cap width 900, quality to stay well under 1MB
    const buf = await sharp(raw)
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer()
    const path = `scripts/_imgs/${name}.jpg`
    await sharp(buf).toFile(path)
    results.push({ name, kb: Math.round(buf.length / 1024) })
    console.log('OK', name, Math.round(buf.length / 1024) + 'KB')
  } catch (e) {
    console.log('FAIL', name, e.message)
  }
}
console.log('\nTotal', results.length, 'images; max KB =', Math.max(...results.map((r) => r.kb)))
