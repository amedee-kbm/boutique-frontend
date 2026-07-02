-- ============================================================
-- Zita Boutique — Row Level Security policies
--
-- Roles:
--   anon          → unauthenticated customers browsing the store
--   authenticated + is_anonymous = true  → guest who signed in
--                   anonymously to start a live chat
--   authenticated + is_anonymous = false → the seller (admin)
--   service_role  → Next.js server-side admin client (bypasses RLS)
-- ============================================================

-- ------------------------------------------------------------
-- admins: allowlist of seller accounts.
--
-- The store now has CUSTOMER accounts, which are also non-anonymous
-- authenticated users — so "non-anonymous" can no longer mean "admin".
-- A user is admin ONLY if their id is seeded into public.admins. RLS is
-- enabled with NO policies so the table is unreadable/unwritable from the
-- client; only is_admin() (security definer) and the service-role client
-- touch it.
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key
);

alter table public.admins
  drop constraint if exists admins_user_id_fkey;

alter table public.admins
  add constraint admins_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade;

alter table public.admins enable row level security;

-- ------------------------------------------------------------
-- SEED THE SELLER  ←  REQUIRED MANUAL STEP, EDIT THE EMAIL BELOW
-- Until the seller's id is in public.admins, NO account passes is_admin():
-- the admin panel and every "admin" RLS policy are closed to everyone.
-- Run once with the seller's login email (idempotent; inserts nothing if the
-- email doesn't exist yet, so create the auth user first):
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seller@example.com'
--   on conflict (user_id) do nothing;
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Helper: identify the seller (a user listed in public.admins).
-- Wrapped in (select ...) inside policies for per-statement caching.
-- SECURITY DEFINER so it can read public.admins past that table's RLS lock;
-- search_path pinned to '' so every reference must be schema-qualified.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = (select auth.uid())
  )
$$;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table public.categories   enable row level security;
alter table public.products      enable row level security;
alter table public.product_images enable row level security;
alter table public.chat_sessions  enable row level security;
alter table public.chat_messages  enable row level security;

-- ============================================================
-- Indexes on columns used in RLS policies
-- (Postgres does NOT auto-index FK columns)
-- ============================================================
create index if not exists products_visible_idx
  on public.products (visible);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

create index if not exists chat_sessions_created_by_idx
  on public.chat_sessions (created_by);

create index if not exists chat_messages_session_id_idx
  on public.chat_messages (session_id);

-- FK from chat_sessions.created_by → auth.users.id
-- Drizzle does not manage cross-schema FKs, so we add it here.
alter table public.chat_sessions
  drop constraint if exists chat_sessions_created_by_fkey;

alter table public.chat_sessions
  add constraint chat_sessions_created_by_fkey
  foreign key (created_by)
  references auth.users (id)
  on delete set null;

-- ============================================================
-- categories
-- Read: everyone | Write: admin only
-- ============================================================
drop policy if exists "categories: read all"    on public.categories;
drop policy if exists "categories: admin write" on public.categories;

create policy "categories: read all"
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy "categories: admin write"
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- products
-- Read visible only: anon & guests | Read all + write: admin
-- ============================================================
drop policy if exists "products: read visible"  on public.products;
drop policy if exists "products: admin write"   on public.products;

create policy "products: read visible"
  on public.products
  for select
  to anon, authenticated
  using (visible = true or (select public.is_admin()));

create policy "products: admin write"
  on public.products
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- product_images
-- Read: anon sees images for visible products only | admin sees all
-- Write: admin only
-- ============================================================
drop policy if exists "product_images: read"        on public.product_images;
drop policy if exists "product_images: admin write"  on public.product_images;

create policy "product_images: read"
  on public.product_images
  for select
  to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.visible = true
    )
  );

create policy "product_images: admin write"
  on public.product_images
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- product_variant_groups / product_variant_options
-- Read: anon & guests see variants for visible products only;
--       admin sees all. Write: admin only.
-- ============================================================
create index if not exists product_variant_groups_product_id_idx
  on public.product_variant_groups (product_id);

create index if not exists product_variant_options_group_id_idx
  on public.product_variant_options (group_id);

alter table public.product_variant_groups  enable row level security;
alter table public.product_variant_options enable row level security;

drop policy if exists "variant_groups: read"        on public.product_variant_groups;
drop policy if exists "variant_groups: admin write" on public.product_variant_groups;

create policy "variant_groups: read"
  on public.product_variant_groups
  for select
  to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products
      where products.id = product_variant_groups.product_id
        and products.visible = true
    )
  );

create policy "variant_groups: admin write"
  on public.product_variant_groups
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "variant_options: read"        on public.product_variant_options;
drop policy if exists "variant_options: admin write" on public.product_variant_options;

create policy "variant_options: read"
  on public.product_variant_options
  for select
  to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.product_variant_groups g
      join public.products p on p.id = g.product_id
      where g.id = product_variant_options.group_id
        and p.visible = true
    )
  );

create policy "variant_options: admin write"
  on public.product_variant_options
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- chat_sessions
-- Guests own their session (created_by = their uid)
-- Admin can read and update all sessions
-- ============================================================
drop policy if exists "chat_sessions: guest manage own" on public.chat_sessions;
drop policy if exists "chat_sessions: admin all"        on public.chat_sessions;

create policy "chat_sessions: guest manage own"
  on public.chat_sessions
  for all
  to authenticated
  using (
    (select auth.uid()) = created_by
    and not (select public.is_admin())
  )
  with check (
    (select auth.uid()) = created_by
    and not (select public.is_admin())
  );

create policy "chat_sessions: admin all"
  on public.chat_sessions
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- chat_messages
-- Guests: read & insert in their own sessions only,
--         cannot set from_admin = true
-- Admin: read & write all
-- ============================================================
drop policy if exists "chat_messages: guest read own session"   on public.chat_messages;
drop policy if exists "chat_messages: guest insert own session" on public.chat_messages;
drop policy if exists "chat_messages: admin all"                on public.chat_messages;

create policy "chat_messages: guest read own session"
  on public.chat_messages
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.created_by = (select auth.uid())
    )
  );

create policy "chat_messages: guest insert own session"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    not (select public.is_admin())
    and from_admin = false
    and exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.created_by = (select auth.uid())
    )
  );

create policy "chat_messages: admin all"
  on public.chat_messages
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- category_filters / category_filter_options
-- Read: everyone | Write: admin only (mirror categories)
-- ============================================================
create index if not exists category_filters_category_id_idx
  on public.category_filters (category_id);

create index if not exists category_filter_options_filter_id_idx
  on public.category_filter_options (filter_id);

alter table public.category_filters        enable row level security;
alter table public.category_filter_options enable row level security;

drop policy if exists "category_filters: read all"    on public.category_filters;
drop policy if exists "category_filters: admin write" on public.category_filters;

create policy "category_filters: read all"
  on public.category_filters
  for select
  to anon, authenticated
  using (true);

create policy "category_filters: admin write"
  on public.category_filters
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "category_filter_options: read all"    on public.category_filter_options;
drop policy if exists "category_filter_options: admin write" on public.category_filter_options;

create policy "category_filter_options: read all"
  on public.category_filter_options
  for select
  to anon, authenticated
  using (true);

create policy "category_filter_options: admin write"
  on public.category_filter_options
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- product_filter_values
-- Read: anon sees values for visible products only | admin sees all
-- Write: admin only (mirror product_images)
-- ============================================================
create index if not exists product_filter_values_product_id_idx
  on public.product_filter_values (product_id);

create index if not exists product_filter_values_option_id_idx
  on public.product_filter_values (option_id);

alter table public.product_filter_values enable row level security;

drop policy if exists "product_filter_values: read"        on public.product_filter_values;
drop policy if exists "product_filter_values: admin write" on public.product_filter_values;

create policy "product_filter_values: read"
  on public.product_filter_values
  for select
  to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products
      where products.id = product_filter_values.product_id
        and products.visible = true
    )
  );

create policy "product_filter_values: admin write"
  on public.product_filter_values
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- chat_message_items
-- Guests: read & insert items in their own sessions only
-- Admin: read & write all (mirror chat_messages)
-- ============================================================
create index if not exists chat_message_items_message_id_idx
  on public.chat_message_items (message_id);

alter table public.chat_message_items enable row level security;

drop policy if exists "chat_message_items: guest read own session"   on public.chat_message_items;
drop policy if exists "chat_message_items: guest insert own session" on public.chat_message_items;
drop policy if exists "chat_message_items: admin all"                on public.chat_message_items;

create policy "chat_message_items: guest read own session"
  on public.chat_message_items
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.chat_messages m
      join public.chat_sessions s on s.id = m.session_id
      where m.id = chat_message_items.message_id
        and s.created_by = (select auth.uid())
    )
  );

create policy "chat_message_items: guest insert own session"
  on public.chat_message_items
  for insert
  to authenticated
  with check (
    not (select public.is_admin())
    and exists (
      select 1
      from public.chat_messages m
      join public.chat_sessions s on s.id = m.session_id
      where m.id = chat_message_items.message_id
        and s.created_by = (select auth.uid())
    )
  );

create policy "chat_message_items: admin all"
  on public.chat_message_items
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- orders / order_items
-- Orders hold PII (name, phone, address). Guests may insert their own
-- order (created_by = their uid) and read only that own row back — needed
-- for INSERT ... RETURNING id. They cannot update/delete or read others'.
-- Admin reads & manages all (works the inbox, changes status).
-- ============================================================
create index if not exists orders_created_by_idx
  on public.orders (created_by);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

-- FK from orders.created_by → auth.users.id (cross-schema; Drizzle won't manage it).
alter table public.orders
  drop constraint if exists orders_created_by_fkey;

alter table public.orders
  add constraint orders_created_by_fkey
  foreign key (created_by)
  references auth.users (id)
  on delete set null;

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders: guest insert own"  on public.orders;
drop policy if exists "orders: guest read own"     on public.orders;
drop policy if exists "orders: admin all"          on public.orders;

create policy "orders: guest insert own"
  on public.orders
  for insert
  to authenticated
  with check (
    not (select public.is_admin())
    and (select auth.uid()) = created_by
  );

create policy "orders: guest read own"
  on public.orders
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (created_by = (select auth.uid()))
  );

create policy "orders: admin all"
  on public.orders
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "order_items: guest insert own order" on public.order_items;
drop policy if exists "order_items: admin all"              on public.order_items;

create policy "order_items: guest insert own order"
  on public.order_items
  for insert
  to authenticated
  with check (
    not (select public.is_admin())
    and exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.created_by = (select auth.uid())
    )
  );

create policy "order_items: admin all"
  on public.order_items
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================
-- favorites
-- A customer's saved pieces. Owner-only: a signed-in user reads, adds and
-- removes ONLY their own rows (user_id = their uid). Guests (anon) cannot
-- favorite at all — every policy is scoped to authenticated + own uid, and a
-- guest's uid never matches a row they could insert under another id. Admin
-- has no business reading customers' favorites, so there is no admin policy.
-- ============================================================
create index if not exists favorites_product_id_idx
  on public.favorites (product_id);

-- FK from favorites.user_id → auth.users.id (cross-schema; Drizzle won't manage it).
alter table public.favorites
  drop constraint if exists favorites_user_id_fkey;

alter table public.favorites
  add constraint favorites_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade;

alter table public.favorites enable row level security;

drop policy if exists "favorites: owner read"   on public.favorites;
drop policy if exists "favorites: owner insert" on public.favorites;
drop policy if exists "favorites: owner delete" on public.favorites;

create policy "favorites: owner read"
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorites: owner insert"
  on public.favorites
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and not (select public.is_admin())
  );

create policy "favorites: owner delete"
  on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- push_subscriptions
-- Written/read only by the service-role server action (which bypasses
-- RLS). Enable RLS with no policies so nothing else can touch it.
-- ============================================================
create index if not exists push_subscriptions_session_id_idx
  on public.push_subscriptions (session_id);

alter table public.push_subscriptions enable row level security;

-- ============================================================
-- Realtime
-- Broadcast row changes on chat tables so the admin inbox and
-- the customer widget receive live updates. Idempotent.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_sessions'
  ) then
    alter publication supabase_realtime add table public.chat_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ============================================================
-- Storage: product-images bucket
-- Public read so customers can view photos; writes go through the
-- service-role server action, but we add an admin policy for safety.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product-images: public read" on storage.objects;
drop policy if exists "product-images: admin write" on storage.objects;

create policy "product-images: public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product-images: admin write"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));
