import sharp from 'sharp'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// name, pexels URL (will bump width). Curated single-model dress shots.
const items = [
  [
    'dress-a',
    'https://images.pexels.com/photos/17776594/pexels-photo-17776594/free-photo-of-model-posing-in-a-dress.jpeg',
  ],
  [
    'dress-b',
    'https://images.pexels.com/photos/17471951/pexels-photo-17471951/free-photo-of-silver-dress-photoshoot-model.jpeg',
  ],
  [
    'dress-c',
    'https://images.pexels.com/photos/18437709/pexels-photo-18437709/free-photo-of-young-elegant-woman-in-a-dress-posing-outside.jpeg',
  ],
  [
    'dress-d',
    'https://images.pexels.com/photos/15298631/pexels-photo-15298631/free-photo-of-smiling-woman-in-evening-black-and-red-dress.jpeg',
  ],
  [
    'dress-e',
    'https://images.pexels.com/photos/17016525/pexels-photo-17016525/free-photo-of-elegant-woman-in-a-white-dress.jpeg',
  ],
  [
    'dress-f',
    'https://images.pexels.com/photos/14995950/pexels-photo-14995950/free-photo-of-young-woman-posing-in-dress.jpeg',
  ],
]
async function get(u) {
  for (let a = 0; a < 4; a++) {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 20000)
      const r = await fetch(u + '?auto=compress&cs=tinysrgb&w=900', {
        signal: c.signal,
        redirect: 'follow',
      })
      clearTimeout(t)
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer())
        if (b.length > 10000) return b
      } else console.log('  status', r.status)
    } catch (e) {
      console.log('  err', e.message)
    }
    await sleep(700)
  }
  return null
}
let max = 0
for (const [name, u] of items) {
  const raw = await get(u)
  if (!raw) {
    console.log('FAIL', name)
    continue
  }
  const buf = await sharp(raw)
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
  await sharp(buf).toFile(`scripts/_imgs/${name}.jpg`)
  const kb = Math.round(buf.length / 1024)
  max = Math.max(max, kb)
  console.log('OK', name, kb + 'KB')
  await sleep(300)
}
console.log('max', max, 'KB')
