import sharp from 'sharp'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const items = [
  // tops / blouses
  [
    'top-a',
    'https://images.pexels.com/photos/33817210/pexels-photo-33817210/free-photo-of-elegant-woman-in-yellow-top-posing-outdoors.jpeg',
  ],
  [
    'top-b',
    'https://images.pexels.com/photos/18220443/pexels-photo-18220443/free-photo-of-woman-in-elegant-blouse-folded-hands.jpeg',
  ],
  [
    'top-c',
    'https://images.pexels.com/photos/28765912/pexels-photo-28765912/free-photo-of-stylish-woman-posing-on-urban-rooftop.jpeg',
  ],
  [
    'top-d',
    'https://images.pexels.com/photos/37414269/pexels-photo-37414269/free-photo-of-fashionable-woman-in-urban-cityscape.jpeg',
  ],
  // shoes / heels
  ['heels-a', 'https://images.pexels.com/photos/134064/pexels-photo-134064.jpeg'],
  ['heels-b', 'https://images.pexels.com/photos/28821783/pexels-photo-28821783.jpeg'],
  ['heels-c', 'https://images.pexels.com/photos/10070653/pexels-photo-10070653.jpeg'],
  // handbags
  [
    'bag-a',
    'https://images.pexels.com/photos/35666033/pexels-photo-35666033/free-photo-of-stylish-leather-handbags-duo-on-white-background.jpeg',
  ],
  [
    'bag-b',
    'https://images.pexels.com/photos/22434759/pexels-photo-22434759/free-photo-of-bags-on-white-background.jpeg',
  ],
  ['bag-c', 'https://images.pexels.com/photos/5352628/pexels-photo-5352628.jpeg'],
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
