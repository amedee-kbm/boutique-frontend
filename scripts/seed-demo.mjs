import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'
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
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const sql = postgres(env.DATABASE_URL)
const sb = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const BUCKET = 'product-images'
const pub = (path) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`

const CATS = {
  dresses: 'Dresses',
  tops: 'Tops',
  jeans: 'Jeans',
  shoes: 'Shoes',
  accessories: 'Accessories',
}
const FACETS = {
  dresses: { Length: ['Mini', 'Midi', 'Maxi'], Occasion: ['Casual', 'Party', 'Work'] },
  tops: { Type: ['Blouse', 'T-shirt', 'Crop'], Sleeve: ['Short', 'Long'] },
  jeans: { Fit: ['Skinny', 'Straight', 'Wide'] },
  shoes: { Type: ['Heels', 'Flats', 'Sneakers'] },
  accessories: { Type: ['Bag', 'Jewelry', 'Hat'] },
}
const PRODUCTS = [
  {
    slug: 'satin-evening-gown',
    name: 'Satin Evening Gown',
    cat: 'dresses',
    price: '28000',
    desc: 'Floor-length satin gown with a thigh-high slit and a structured bodice.',
    colours: [
      { value: 'Ivory', hex: '#E6DDC9', imgs: ['dress-a', 'dress-b'] },
      { value: 'Black', hex: '#1A1A1A', imgs: ['dress-d'] },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    facets: { Length: 'Maxi', Occasion: 'Party' },
  },
  {
    slug: 'summer-midi-dress',
    name: 'Summer Midi Dress',
    cat: 'dresses',
    price: '14000',
    desc: 'Lightweight midi dress that falls below the knee.',
    colours: [{ value: 'Cream', hex: '#F1EAD9', imgs: ['dress-e', 'dress-f'] }],
    sizes: ['XS', 'S', 'M', 'L'],
    facets: { Length: 'Midi', Occasion: 'Casual' },
  },
  {
    slug: 'peplum-blouse',
    name: 'Peplum Blouse',
    cat: 'tops',
    price: '9000',
    desc: 'Tailored peplum blouse with three-quarter sleeves.',
    colours: [
      { value: 'Mustard', hex: '#D2A24B', imgs: ['top-a'] },
      { value: 'Cream', hex: '#E9E0CF', imgs: ['top-b'] },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    facets: { Type: 'Blouse', Sleeve: 'Short' },
  },
  {
    slug: 'ribbed-knit-top',
    name: 'Ribbed Knit Top',
    cat: 'tops',
    price: '7500',
    desc: 'Fitted ribbed knit top with a high neck.',
    colours: [{ value: 'Black', hex: '#1A1A1A', imgs: ['top-c', 'top-d'] }],
    sizes: ['S', 'M', 'L', 'XL'],
    facets: { Type: 'Crop', Sleeve: 'Short' },
  },
  {
    slug: 'denim-mini-skirt',
    name: 'Denim Mini Skirt',
    cat: 'jeans',
    price: '11000',
    desc: 'Raw-hem denim mini skirt in a mid wash.',
    colours: [{ value: 'Indigo', hex: '#3C5169', imgs: ['jeans-a', 'bottom-c'] }],
    sizes: ['XS', 'S', 'M', 'L'],
    facets: { Fit: 'Straight' },
  },
  {
    slug: 'tailored-trousers',
    name: 'Tailored Trousers',
    cat: 'jeans',
    price: '12000',
    desc: 'High-waisted tailored trousers with a straight leg.',
    colours: [{ value: 'Charcoal', hex: '#3A3A3A', imgs: ['jeans-b', 'bottom-d'] }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    facets: { Fit: 'Straight' },
  },
  {
    slug: 'suede-pump-heels',
    name: 'Suede Pump Heels',
    cat: 'shoes',
    price: '16000',
    desc: 'Pointed-toe suede pumps with a 9cm block heel.',
    colours: [
      { value: 'Nude', hex: '#C9A88B', imgs: ['heels-a', 'heels-b'] },
      { value: 'Tan', hex: '#8A5A3C', imgs: ['heels-c'] },
    ],
    sizes: ['36', '37', '38', '39', '40', '41'],
    facets: { Type: 'Heels' },
  },
  {
    slug: 'mini-leather-bag',
    name: 'Mini Leather Bag',
    cat: 'accessories',
    price: '13000',
    desc: 'Compact top-handle bag in smooth leather.',
    colours: [
      { value: 'Tan', hex: '#9C6B3F', imgs: ['bag-a', 'bag-c'] },
      { value: 'Yellow', hex: '#E6CF6A', imgs: ['bag-b'] },
    ],
    sizes: [],
    facets: { Type: 'Bag' },
  },
]

async function ensureCategory(slug, name) {
  const [row] = await sql`select id from categories where slug = ${slug}`
  if (row) return row.id
  const [ins] =
    await sql`insert into categories (name, slug) values (${name}, ${slug}) returning id`
  return ins.id
}

async function main() {
  // 1. categories
  const catId = {}
  for (const [slug, name] of Object.entries(CATS)) catId[slug] = await ensureCategory(slug, name)

  // 2. cleanup: remove storage + rows for slugs we manage and the 2 placeholders
  const slugs = [...PRODUCTS.map((p) => p.slug), 'complet', 'fashion-boutique']
  const olds =
    await sql`select i.url from products p join product_images i on i.product_id = p.id where p.slug = any(${slugs})`
  const paths = olds.map((r) => r.url.split(`/${BUCKET}/`)[1]).filter(Boolean)
  if (paths.length) await sb.storage.from(BUCKET).remove(paths)
  await sql`delete from products where slug = any(${slugs})`
  await sql`delete from category_filters where category_id = any(${Object.values(catId)})`
  console.log('cleanup done; removed', paths.length, 'storage objects')

  // 3. facets
  const facetMap = {} // cat -> filterName -> value -> optionId
  for (const [cat, filters] of Object.entries(FACETS)) {
    facetMap[cat] = {}
    let fpos = 0
    for (const [fname, opts] of Object.entries(filters)) {
      const [f] =
        await sql`insert into category_filters (category_id, name, position) values (${catId[cat]}, ${fname}, ${fpos++}) returning id`
      facetMap[cat][fname] = {}
      let opos = 0
      for (const v of opts) {
        const [o] =
          await sql`insert into category_filter_options (filter_id, value, position) values (${f.id}, ${v}, ${opos++}) returning id`
        facetMap[cat][fname][v] = o.id
      }
    }
  }
  console.log('facets seeded')

  // 4. products
  for (const p of PRODUCTS) {
    const [prod] =
      await sql`insert into products (name, slug, description, price, category_id, visible) values (${p.name}, ${p.slug}, ${p.desc}, ${p.price}, ${catId[p.cat]}, true) returning id`
    const pid = prod.id

    // colour group + options
    const [cg] =
      await sql`insert into product_variant_groups (product_id, name, position) values (${pid}, 'Colour', 0) returning id`
    let pos = 0
    let imgPos = 0
    for (let ci = 0; ci < p.colours.length; ci++) {
      const c = p.colours[ci]
      const [opt] =
        await sql`insert into product_variant_options (group_id, value, position, hex) values (${cg.id}, ${c.value}, ${ci}, ${c.hex}) returning id`
      let firstImgId = null
      for (const name of c.imgs) {
        const buf = readFileSync(`scripts/_imgs/${name}.jpg`)
        const path = `${pid}/${name}.jpg`
        const { error } = await sb.storage
          .from(BUCKET)
          .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(`upload ${path}: ${error.message}`)
        const [img] =
          await sql`insert into product_images (product_id, url, alt, position, option_id) values (${pid}, ${pub(path)}, ${p.name + ' — ' + c.value}, ${imgPos++}, ${opt.id}) returning id`
        if (!firstImgId) firstImgId = img.id
      }
      if (firstImgId)
        await sql`update product_variant_options set image_id = ${firstImgId} where id = ${opt.id}`
      pos++
    }

    // size group
    if (p.sizes.length) {
      const [sg] =
        await sql`insert into product_variant_groups (product_id, name, position) values (${pid}, 'Size', 1) returning id`
      for (let i = 0; i < p.sizes.length; i++) {
        await sql`insert into product_variant_options (group_id, value, position) values (${sg.id}, ${p.sizes[i]}, ${i})`
      }
    }

    // facet values
    for (const [fname, val] of Object.entries(p.facets)) {
      const optId = facetMap[p.cat]?.[fname]?.[val]
      if (optId)
        await sql`insert into product_filter_values (product_id, option_id) values (${pid}, ${optId})`
    }

    console.log('product', p.slug, '·', p.colours.length, 'colours,', p.sizes.length, 'sizes')
  }

  // summary
  const [{ count: pc }] = await sql`select count(*) from products`
  const [{ count: ic }] = await sql`select count(*) from product_images`
  console.log(`\nDONE — products=${pc}, images=${ic}`)
  await sql.end()
}
main().catch((e) => {
  console.error('SEED FAILED:', e.message)
  process.exit(1)
})
