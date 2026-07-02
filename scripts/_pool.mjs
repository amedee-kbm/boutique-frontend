import sharp from 'sharp'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// noun -> list of lock ids (each lock = a distinct photo)
const plan = {
  dress: [1, 2, 3, 4],
  gown: [1, 2],
  blouse: [1, 2, 3, 4],
  jeans: [1, 2],
  trousers: [1, 2],
  coat: [1, 2],
  jacket: [1, 2],
  heels: [1, 2],
  sneakers: [1, 2],
  handbag: [1, 2],
  boutique: [1],
}
async function get(kw, lock) {
  for (let a = 0; a < 5; a++) {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 20000)
      const r = await fetch(`https://loremflickr.com/900/1200/${kw}?lock=${lock}`, {
        signal: c.signal,
        redirect: 'follow',
      })
      clearTimeout(t)
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer())
        if (b.length > 8000) return b
      }
    } catch {}
    await sleep(700)
  }
  return null
}
let n = 0,
  fail = 0,
  maxkb = 0
for (const [kw, locks] of Object.entries(plan)) {
  for (const lock of locks) {
    const raw = await get(kw, lock)
    if (!raw) {
      console.log('FAIL', kw, lock)
      fail++
      continue
    }
    const buf = await sharp(raw)
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer()
    await sharp(buf).toFile(`scripts/_imgs/${kw}-${lock}.jpg`)
    const kb = Math.round(buf.length / 1024)
    maxkb = Math.max(maxkb, kb)
    n++
    await sleep(350)
  }
  process.stdout.write(`${kw}(${locks.length}) `)
}
console.log(`\n\nsaved ${n}, failed ${fail}, max ${maxkb}KB`)
