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
-- Helper: identify the seller (non-anonymous authenticated user)
-- Wrapped in (select ...) inside policies for per-statement caching.
-- NOT security definer — only reads JWT, no table access.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (select auth.role()) = 'authenticated'
    and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false
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
