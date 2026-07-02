import sharp from 'sharp'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// only items still missing; <=2 tags
const items = [
  ['dress-navy-1', 'dress,blue', 11],
  ['dress-navy-2', 'dress,blue', 12],
  ['dress-rust-1', 'dress,orange', 21],
  ['dress-rust-2', 'dress,red', 22],
  ['dress-black-1', 'dress,black', 31],
  ['dress-black-2', 'gown,black', 32],
  ['shirt-white-1', 'shirt,white', 41],
  ['shirt-white-2', 'blouse,white', 42],
  ['shirt-sage-1', 'shirt,green', 51],
  ['shirt-sage-2', 'blouse,green', 52],
  ['bag-1', 'handbag', 81],
  ['shoes-2', 'heels', 72],
]
async function getOne(kw, lock) {
  for (let a = 0; a < 4; a++) {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 20000)
      const r = await fetch(
        `https://loremflickr.com/900/1200/${encodeURIComponent(kw)}?lock=${lock}`,
        { signal: c.signal, redirect: 'follow' }
      )
      clearTimeout(t)
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer())
        if (b.length > 8000) return b
      }
    } catch {}
    await sleep(800)
  }
  return null
}
const ok = []
for (const [name, kw, lock] of items) {
  const raw = await getOne(kw, lock)
  if (!raw) {
    console.log('FAIL', name)
    continue
  }
  const buf = await sharp(raw)
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer()
  await sharp(buf).toFile(`scripts/_imgs/${name}.jpg`)
  ok.push(name)
  console.log('OK', name, Math.round(buf.length / 1024) + 'KB')
  await sleep(400)
}
console.log('\nadded', ok.length)
