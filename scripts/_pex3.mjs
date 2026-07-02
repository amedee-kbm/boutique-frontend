import sharp from 'sharp'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const items = [
  ['jeans-a', 'https://images.pexels.com/photos/5181697/pexels-photo-5181697.jpeg'],
  ['jeans-b', 'https://images.pexels.com/photos/8764921/pexels-photo-8764921.jpeg'],
  ['bottom-c', 'https://images.pexels.com/photos/6070068/pexels-photo-6070068.jpeg'],
  ['bottom-d', 'https://images.pexels.com/photos/5363062/pexels-photo-5363062.jpeg'],
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
      } else console.log(' st', r.status)
    } catch (e) {
      console.log(' er', e.message)
    }
    await sleep(700)
  }
  return null
}
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
  console.log('OK', name, Math.round(buf.length / 1024) + 'KB')
  await sleep(300)
}
