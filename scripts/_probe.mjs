const hosts = [
  ['loremflickr-fashion', 'https://loremflickr.com/900/1200/fashion,dress'],
  [
    'pexels',
    'https://images.pexels.com/photos/2728994/pexels-photo-2728994.jpeg?auto=compress&w=900',
  ],
  ['pixabay', 'https://cdn.pixabay.com/photo/2016/11/29/03/53/woman-1865707_960_720.jpg'],
  ['picsum', 'https://picsum.photos/seed/zt/900/1200'],
  ['placehold', 'https://placehold.co/900x1200/jpg'],
  ['fastly-picsum', 'https://fastly.picsum.photos/id/237/900/1200.jpg'],
]
for (const [name, url] of hosts) {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 12000)
    const r = await fetch(url, { signal: c.signal, redirect: 'follow' })
    clearTimeout(t)
    const buf = Buffer.from(await r.arrayBuffer())
    console.log(
      name,
      r.status,
      r.headers.get('content-type') || '?',
      Math.round(buf.length / 1024) + 'KB'
    )
  } catch (e) {
    console.log(name, 'FAIL', e.message)
  }
}
