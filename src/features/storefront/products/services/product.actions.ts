'use server'

import { eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { HOME_PAGE_SIZE } from '../consts/home-feed'
import { hexesSql, sizesSql, thumbnailSql, type HomeCard } from './product-queries'

// One page of the home feed, ordered by a *seeded* shuffle. md5(id || seed) is
// random-looking but stable for a given seed, so consecutive pages never overlap
// or drop rows the way ORDER BY random() would. The client mints one seed per
// visit and replays it on every page request.
export async function loadHomeFeedPage(seed: string, offset: number): Promise<HomeCard[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      thumbnail: thumbnailSql,
      hexes: hexesSql,
      sizes: sizesSql,
    })
    .from(products)
    .where(eq(products.visible, true))
    .orderBy(sql`md5(${products.id}::text || ${seed})`)
    .limit(HOME_PAGE_SIZE)
    .offset(offset * HOME_PAGE_SIZE)
}
