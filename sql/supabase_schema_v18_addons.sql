-- Events San Cristobal Portal — Supabase schema addons (v18)
-- Run AFTER sql/supabase_schema.sql

-- =========================
-- Business profiles
-- =========================
create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  description_md text not null default '',
  cover_url text,
  address text,
  phone text,
  website text,
  instagram text,
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists business_profiles_status_created_idx
  on public.business_profiles (status, created_at desc);

alter table public.business_profiles enable row level security;

-- Anyone can view approved businesses
create policy if not exists "Business: view approved"
  on public.business_profiles
  for select
  using (status = 'approved');

-- Owners can view their own submissions
create policy if not exists "Business: owner view own"
  on public.business_profiles
  for select
  to authenticated
  using (owner_id = auth.uid());

-- Active users can submit a business
create policy if not exists "Business: active users can submit"
  on public.business_profiles
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  );

-- Staff can moderate / edit
create policy if not exists "Business: staff manage"
  on public.business_profiles
  for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')))
  with check (true);

-- =========================
-- Forum categories
-- =========================
create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  sort int not null default 100,
  status text not null default 'approved' check (status in ('approved','hidden')),
  created_at timestamptz not null default now()
);

create index if not exists forum_categories_sort_idx
  on public.forum_categories (sort asc);

alter table public.forum_categories enable row level security;

create policy if not exists "Forum categories: view approved"
  on public.forum_categories
  for select
  using (status = 'approved');

create policy if not exists "Forum categories: staff manage"
  on public.forum_categories
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')))
  with check (true);

-- Seed a few categories (safe to re-run)
insert into public.forum_categories (slug, title, description, sort, status)
values
  ('general', 'General', 'Anything about San Cristóbal', 10, 'approved'),
  ('events', 'Events', 'Announcements, meetups, parties', 20, 'approved'),
  ('food', 'Food & Coffee', 'Restaurants, cafés, markets', 30, 'approved'),
  ('nature', 'Nature & Trips', 'Hikes, waterfalls, day trips', 40, 'approved'),
  ('life', 'Life in San Cris', 'Practical living tips', 50, 'approved'),
  ('creators', 'Artists & Creators', 'Music, art, photography', 60, 'approved')
on conflict (slug) do nothing;

-- =========================
-- Forum threads
-- =========================
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body_md text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists forum_threads_status_created_idx
  on public.forum_threads (status, created_at desc);

create index if not exists forum_threads_category_idx
  on public.forum_threads (category_id, created_at desc);

alter table public.forum_threads enable row level security;

create policy if not exists "Forum threads: view approved"
  on public.forum_threads
  for select
  using (status = 'approved');

create policy if not exists "Forum threads: author view own"
  on public.forum_threads
  for select
  to authenticated
  using (author_id = auth.uid());

create policy if not exists "Forum threads: active users create"
  on public.forum_threads
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  );

create policy if not exists "Forum threads: staff manage"
  on public.forum_threads
  for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')))
  with check (true);

-- =========================
-- Forum replies
-- =========================
create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists forum_replies_thread_created_idx
  on public.forum_replies (thread_id, created_at asc);

create index if not exists forum_replies_status_created_idx
  on public.forum_replies (status, created_at desc);

alter table public.forum_replies enable row level security;

create policy if not exists "Forum replies: view approved"
  on public.forum_replies
  for select
  using (status = 'approved');

create policy if not exists "Forum replies: author view own"
  on public.forum_replies
  for select
  to authenticated
  using (author_id = auth.uid());

create policy if not exists "Forum replies: active users create"
  on public.forum_replies
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  );

create policy if not exists "Forum replies: staff manage"
  on public.forum_replies
  for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')))
  with check (true);
