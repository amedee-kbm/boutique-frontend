import { count, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { categories, chatSessions, orders, products } from '@/lib/db/schema'

export async function getDashboardStats() {
  const [productResult, categoryResult, chatResult, newOrderResult] = await Promise.all([
    db.select({ count: count() }).from(products),
    db.select({ count: count() }).from(categories),
    db.select({ count: count() }).from(chatSessions),
    db.select({ count: count() }).from(orders).where(eq(orders.status, 'new')),
  ])

  return {
    productCount: productResult[0].count,
    categoryCount: categoryResult[0].count,
    chatCount: chatResult[0].count,
    newOrderCount: newOrderResult[0].count,
  }
}

export async function getRecentProducts(limit = 5) {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      visible: products.visible,
      createdAt: products.createdAt,
      categoryName: categories.name,
      thumbnail: sql<string | null>`(
        SELECT url FROM product_images
        WHERE product_id = ${products.id}
        ORDER BY position ASC
        LIMIT 1
      )`.as('thumbnail'),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
    .limit(limit)
}
