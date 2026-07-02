const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const words = [
  'dress',
  'gown',
  'blouse',
  'top',
  'skirt',
  'jeans',
  'trousers',
  'coat',
  'jacket',
  'heels',
  'handbag',
  'sneakers',
  'outfit',
  'fashion',
  'model',
  'woman',
  'clothing',
  'boutique',
  'sweater',
  'shorts',
]
async function ok(kw) {
  for (let a = 0; a < 3; a++) {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 12000)
      const r = await fetch(`https://loremflickr.com/600/800/${kw}?lock=1`, {
        signal: c.signal,
        redirect: 'follow',
      })
      clearTimeout(t)
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer())
        if (b.length > 8000) return Math.round(b.length / 1024)
      }
    } catch {}
    await sleep(500)
  }
  return null
}
for (const w of words) {
  const k = await ok(w)
  console.log(k ? `OK   ${w} ${k}KB` : `FAIL ${w}`)
  await sleep(250)
}
