import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  visible: boolean('visible').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  url: text('url').notNull(),
  alt: text('alt'),
  position: integer('position').notNull().default(0),
  // Assigns an image to a colour option so a colour can own several photos.
  optionId: uuid('option_id').references((): AnyPgColumn => productVariantOptions.id, {
    onDelete: 'set null',
  }),
})

export const productVariantGroups = pgTable('product_variant_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
})

export const productVariantOptions = pgTable('product_variant_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .references(() => productVariantGroups.id, { onDelete: 'cascade' })
    .notNull(),
  value: text('value').notNull(),
  position: integer('position').notNull().default(0),
  // Featured image shown when this option is selected (esp. colour swatches).
  imageId: uuid('image_id').references((): AnyPgColumn => productImages.id, {
    onDelete: 'set null',
  }),
  // Solid colour for storefront swatch squares; only meaningful for colour options.
  hex: text('hex'),
})

export const categoryFilters = pgTable('category_filters', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .references(() => categories.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
})

export const categoryFilterOptions = pgTable('category_filter_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  filterId: uuid('filter_id')
    .references(() => categoryFilters.id, { onDelete: 'cascade' })
    .notNull(),
  value: text('value').notNull(),
  position: integer('position').notNull().default(0),
})

export const productFilterValues = pgTable(
  'product_filter_values',
  {
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    optionId: uuid('option_id')
      .references(() => categoryFilterOptions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.optionId] })]
)

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  guestName: text('guest_name').notNull(),
  createdBy: uuid('created_by'), // auth.uid() of the anonymous guest — used for RLS
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastMessageAt: timestamp('last_message_at'),
})

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => chatSessions.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  fromAdmin: boolean('from_admin').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// A message carrying items is an inquiry: one message renders N product cards.
// Snapshot columns let a card still render after the product changes or hides.
export const chatMessageItems = pgTable('chat_message_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .references(() => chatMessages.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  nameSnapshot: text('name_snapshot').notNull(),
  colorValue: text('color_value'),
  sizeValue: text('size_value'),
  priceSnapshot: numeric('price_snapshot', { precision: 10, scale: 2 }).notNull(),
  imageUrlSnapshot: text('image_url_snapshot'),
})
