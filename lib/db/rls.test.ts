// @vitest-environment node
//
// Tests RLS policies by switching the Postgres role and JWT claims
// inside a transaction — no HTTP auth flows needed.
//
// How it works:
//   SET LOCAL ROLE <role>          → tells Postgres which role's policies apply
//   set_config('request.jwt.claims', ..., true) → feeds auth.uid() / auth.jwt()
//
// Two real auth users are created in beforeAll (needed for the
// chat_sessions.created_by FK that references auth.users.id).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import postgres from 'postgres'

import { createAdminClient } from '@/lib/supabase/admin'

const db = postgres(process.env.DATABASE_URL!)
const supabase = createAdminClient() // service_role — bypasses RLS for setup

// ── Fixed UUIDs for test fixtures ─────────────────────────────────────────────
const IDS = {
  category: '11111111-1111-1111-1111-111111111111',
  visibleProduct: '22222222-2222-2222-2222-222222222222',
  hiddenProduct: '33333333-3333-3333-3333-333333333333',
  visibleProductImage: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  hiddenProductImage: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  chatSession: '55555555-5555-5555-5555-555555555555',
} as const

// Real auth.users rows — UUIDs resolved in beforeAll
let guestUid: string
let otherGuestUid: string

// ── Role helper ────────────────────────────────────────────────────────────────
// Runs `fn` inside a transaction with the given role + JWT claims.
// SET LOCAL / set_config with local=true are both transaction-scoped.
type Role = 'anon' | 'guest' | 'other-guest' | 'admin'

async function as<T>(role: Role, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  const pgRole = role === 'anon' ? 'anon' : 'authenticated'

  const claims: Record<string, unknown> =
    role === 'anon'
      ? { role: 'anon' }
      : role === 'admin'
        ? {
            role: 'authenticated',
            is_anonymous: false,
            sub: '00000000-0000-0000-0000-000000000000',
          }
        : role === 'other-guest'
          ? { role: 'authenticated', is_anonymous: true, sub: otherGuestUid }
          : { role: 'authenticated', is_anonymous: true, sub: guestUid }

  return db.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE ${pgRole}`)
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`
    return fn(tx)
  })
}

// ── Setup / teardown ──────────────────────────────────────────────────────────
beforeAll(async () => {
  // Create two real auth users so chat_sessions.created_by FK is satisfied
  const [r1, r2] = await Promise.all([
    supabase.auth.admin.createUser({
      email: `rls-guest-${Date.now()}@test.invalid`,
      password: 'rls-test-pw-123!',
      email_confirm: true,
    }),
    supabase.auth.admin.createUser({
      email: `rls-other-${Date.now()}@test.invalid`,
      password: 'rls-test-pw-123!',
      email_confirm: true,
    }),
  ])
  guestUid = r1.data.user!.id
  otherGuestUid = r2.data.user!.id

  // Insert test fixtures using service_role (bypasses RLS)
  await supabase
    .from('categories')
    .upsert({ id: IDS.category, name: 'RLS Test', slug: 'rls-test-category' })

  await supabase.from('products').upsert([
    {
      id: IDS.visibleProduct,
      name: 'Visible Product',
      slug: 'rls-visible',
      price: '10.00',
      category_id: IDS.category,
      visible: true,
    },
    {
      id: IDS.hiddenProduct,
      name: 'Hidden Product',
      slug: 'rls-hidden',
      price: '20.00',
      category_id: IDS.category,
      visible: false,
    },
  ])

  await supabase.from('product_images').upsert([
    {
      id: IDS.visibleProductImage,
      product_id: IDS.visibleProduct,
      url: 'https://example.com/visible.jpg',
      position: 0,
    },
    {
      id: IDS.hiddenProductImage,
      product_id: IDS.hiddenProduct,
      url: 'https://example.com/hidden.jpg',
      position: 0,
    },
  ])

  await supabase
    .from('chat_sessions')
    .upsert({ id: IDS.chatSession, guest_name: 'Test Guest', created_by: guestUid })
})

afterAll(async () => {
  await supabase.from('chat_messages').delete().eq('session_id', IDS.chatSession)
  await supabase.from('chat_sessions').delete().eq('id', IDS.chatSession)
  await supabase
    .from('product_images')
    .delete()
    .in('id', [IDS.visibleProductImage, IDS.hiddenProductImage])
  await supabase.from('products').delete().in('id', [IDS.visibleProduct, IDS.hiddenProduct])
  await supabase.from('categories').delete().eq('id', IDS.category)
  await Promise.all([
    supabase.auth.admin.deleteUser(guestUid),
    supabase.auth.admin.deleteUser(otherGuestUid),
  ])
  await db.end()
})

// ── categories ────────────────────────────────────────────────────────────────
describe('RLS: categories', () => {
  it('anon can read categories', async () => {
    const rows = await as(
      'anon',
      (tx) => tx`
      SELECT id FROM public.categories WHERE id = ${IDS.category}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('anon cannot insert categories', async () => {
    await expect(
      as('anon', (tx) => tx`INSERT INTO public.categories (name, slug) VALUES ('Bad', 'rls-bad')`)
    ).rejects.toThrow()
  })

  it('guest cannot insert categories', async () => {
    await expect(
      as(
        'guest',
        (tx) => tx`INSERT INTO public.categories (name, slug) VALUES ('Bad', 'rls-bad-g')`
      )
    ).rejects.toThrow()
  })

  it('admin can insert and delete categories', async () => {
    const tmpId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    await as(
      'admin',
      (tx) => tx`
      INSERT INTO public.categories (id, name, slug) VALUES (${tmpId}, 'Tmp', 'rls-tmp')
    `
    )
    await supabase.from('categories').delete().eq('id', tmpId)
  })
})

// ── products ──────────────────────────────────────────────────────────────────
describe('RLS: products', () => {
  it('anon can read visible products', async () => {
    const rows = await as(
      'anon',
      (tx) => tx`
      SELECT id FROM public.products WHERE id = ${IDS.visibleProduct}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('anon cannot read hidden products', async () => {
    const rows = await as(
      'anon',
      (tx) => tx`
      SELECT id FROM public.products WHERE id = ${IDS.hiddenProduct}
    `
    )
    expect(rows).toHaveLength(0)
  })

  it('guest cannot read hidden products', async () => {
    const rows = await as(
      'guest',
      (tx) => tx`
      SELECT id FROM public.products WHERE id = ${IDS.hiddenProduct}
    `
    )
    expect(rows).toHaveLength(0)
  })

  it('admin can read hidden products', async () => {
    const rows = await as(
      'admin',
      (tx) => tx`
      SELECT id FROM public.products WHERE id = ${IDS.hiddenProduct}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('anon cannot insert products', async () => {
    await expect(
      as(
        'anon',
        (tx) => tx`
        INSERT INTO public.products (name, slug, price) VALUES ('Bad', 'rls-bad-prod', 1.00)
      `
      )
    ).rejects.toThrow()
  })

  it('admin can update product visibility', async () => {
    await as(
      'admin',
      (tx) => tx`UPDATE public.products SET visible = false WHERE id = ${IDS.visibleProduct}`
    )
    // Restore so other tests see the product as visible
    await supabase.from('products').update({ visible: true }).eq('id', IDS.visibleProduct)
  })
})

// ── product_images ────────────────────────────────────────────────────────────
describe('RLS: product_images', () => {
  it('anon can read images for visible products', async () => {
    const rows = await as(
      'anon',
      (tx) => tx`
      SELECT id FROM public.product_images WHERE id = ${IDS.visibleProductImage}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('anon cannot read images for hidden products', async () => {
    const rows = await as(
      'anon',
      (tx) => tx`
      SELECT id FROM public.product_images WHERE id = ${IDS.hiddenProductImage}
    `
    )
    expect(rows).toHaveLength(0)
  })

  it('admin can read images for hidden products', async () => {
    const rows = await as(
      'admin',
      (tx) => tx`
      SELECT id FROM public.product_images WHERE id = ${IDS.hiddenProductImage}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('anon cannot insert product images', async () => {
    await expect(
      as(
        'anon',
        (tx) => tx`
        INSERT INTO public.product_images (product_id, url, position)
        VALUES (${IDS.visibleProduct}, 'https://example.com/bad.jpg', 99)
      `
      )
    ).rejects.toThrow()
  })
})

// ── chat_sessions ─────────────────────────────────────────────────────────────
describe('RLS: chat_sessions', () => {
  it('guest can read their own session', async () => {
    const rows = await as(
      'guest',
      (tx) => tx`
      SELECT id FROM public.chat_sessions WHERE id = ${IDS.chatSession}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('guest cannot read another guest session', async () => {
    const rows = await as(
      'other-guest',
      (tx) => tx`
      SELECT id FROM public.chat_sessions WHERE id = ${IDS.chatSession}
    `
    )
    expect(rows).toHaveLength(0)
  })

  it('admin can read all sessions', async () => {
    const rows = await as(
      'admin',
      (tx) => tx`
      SELECT id FROM public.chat_sessions WHERE id = ${IDS.chatSession}
    `
    )
    expect(rows).toHaveLength(1)
  })

  it('guest can insert a session with their own uid as created_by', async () => {
    const tmpId = '66666666-6666-6666-6666-666666666666'
    await as(
      'guest',
      (tx) => tx`
      INSERT INTO public.chat_sessions (id, guest_name, created_by)
      VALUES (${tmpId}, 'New Chat', ${guestUid})
    `
    )
    await supabase.from('chat_sessions').delete().eq('id', tmpId)
  })

  it("guest cannot insert a session with another user's uid as created_by", async () => {
    await expect(
      as(
        'guest',
        (tx) => tx`
        INSERT INTO public.chat_sessions (id, guest_name, created_by)
        VALUES ('77777777-7777-7777-7777-777777777777', 'Hack', ${otherGuestUid})
      `
      )
    ).rejects.toThrow()
  })
})

// ── chat_messages ─────────────────────────────────────────────────────────────
describe('RLS: chat_messages', () => {
  it('guest can send a message in their own session', async () => {
    await expect(
      as(
        'guest',
        (tx) => tx`
        INSERT INTO public.chat_messages (session_id, content, from_admin)
        VALUES (${IDS.chatSession}, 'Hello!', false)
      `
      )
    ).resolves.toBeDefined()
  })

  it('guest cannot set from_admin = true (impersonate admin)', async () => {
    await expect(
      as(
        'guest',
        (tx) => tx`
        INSERT INTO public.chat_messages (session_id, content, from_admin)
        VALUES (${IDS.chatSession}, 'Fake admin', true)
      `
      )
    ).rejects.toThrow()
  })

  it('guest can read messages in their own session', async () => {
    const rows = await as(
      'guest',
      (tx) => tx`
      SELECT id FROM public.chat_messages WHERE session_id = ${IDS.chatSession}
    `
    )
    expect(rows.length).toBeGreaterThan(0)
  })

  it('other guest cannot read messages in a session they do not own', async () => {
    const rows = await as(
      'other-guest',
      (tx) => tx`
      SELECT id FROM public.chat_messages WHERE session_id = ${IDS.chatSession}
    `
    )
    expect(rows).toHaveLength(0)
  })

  it('admin can send a reply (from_admin = true)', async () => {
    await expect(
      as(
        'admin',
        (tx) => tx`
        INSERT INTO public.chat_messages (session_id, content, from_admin)
        VALUES (${IDS.chatSession}, 'Hi from admin', true)
      `
      )
    ).resolves.toBeDefined()
  })

  it('admin can read all messages', async () => {
    const rows = await as(
      'admin',
      (tx) => tx`
      SELECT id FROM public.chat_messages WHERE session_id = ${IDS.chatSession}
    `
    )
    expect(rows.length).toBeGreaterThan(0)
  })
})
