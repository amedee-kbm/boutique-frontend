import postgres from 'postgres'
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
const sql = postgres(env.DATABASE_URL)
const q = async (label, query) => {
  try {
    const r = await sql.unsafe(query)
    console.log(label, JSON.stringify(r))
  } catch (e) {
    console.log(label, 'ERR', e.message)
  }
}
await q('products:', 'select count(*) c, count(*) filter (where visible) v from products')
await q('categories:', 'select count(*) from categories')
await q('variant_groups:', 'select count(*) from product_variant_groups')
await q('variant_options:', 'select count(*) c, count(hex) with_hex from product_variant_options')
await q('images:', 'select count(*) c, count(option_id) with_option from product_images')
await q('category_filters:', 'select count(*) from category_filters')
await q('filter_options:', 'select count(*) from category_filter_options')
await q('product_filter_values:', 'select count(*) from product_filter_values')
await q('chat_message_items:', 'select count(*) from chat_message_items')
await sql.end()
