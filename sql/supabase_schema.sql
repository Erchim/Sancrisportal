-- Events San Cristobal / SanCris Portal
-- Community layer (Supabase) — schema + RLS + moderation
--
-- How to use:
-- 1) Create a Supabase project
-- 2) Open SQL Editor -> run this whole file
-- 3) Create Storage bucket "media" (public = ON)
-- 4) Run sql/storage_policies.sql
--
-- Notes:
-- - Pre-moderation: anything user-submitted is created as status='pending'
-- - Only approved content is visible publicly
-- - Users can submit only after you set their profile status to 'active'

-- Extensions (gen_random_uuid)
create extension if not exists pgcrypto;

-- =========================
-- Profiles
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  phone text,
  role text not null default 'user' check (role in ('owner','staff','business','user')),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper checks used inside RLS
create or replace function public.is_active_user(uid uuid)
returns boolean language sql stable security definer as $$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.status = 'active'
  );
$$;

create or replace function public.is_staff(uid uuid)
returns boolean language sql stable security definer as $$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.status = 'active' and p.role in ('owner','staff')
  );
$$;

-- =========================
-- Posts
-- =========================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  slug text unique,
  lang text not null default 'en',
  post_type text not null default 'story',
  cover_url text,
  content_md text not null default '',
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- =========================
-- Translations (optional for later)
-- =========================
create table if not exists public.post_translations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  lang text not null,
  title text,
  content_md text,
  source text not null default 'ai',
  status text not null default 'draft' check (status in ('draft','approved')),
  created_at timestamptz not null default now(),
  unique (post_id, lang)
);

-- =========================
-- Comments + ratings (content_ref supports legacy pages too)
-- content_ref format examples:
--   post:<uuid>
--   legacy:<slug>
--   item:restaurants:<id>
--   event:<id>
-- =========================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content_ref text not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_ref on public.comments(content_ref);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  content_ref text not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (content_ref, author_id)
);
create index if not exists idx_ratings_ref on public.ratings(content_ref);

-- =========================
-- Audit trail for moderation decisions
-- =========================
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('profile','post','comment','rating')),
  entity_id uuid not null,
  decision text not null check (decision in ('approved','rejected','suspended')),
  decided_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- =========================
-- Reports (optional for later)
-- =========================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  content_ref text not null,
  comment_id uuid references public.comments(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_translations enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.approvals enable row level security;
alter table public.reports enable row level security;

-- PROFILES
-- Users can read/update their own profile; public can see active profiles; staff can see all

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_select_public_active" on public.profiles;
create policy "profiles_select_public_active" on public.profiles
for select to anon
using (status = 'active');

drop policy if exists "profiles_select_authenticated_active" on public.profiles;
create policy "profiles_select_authenticated_active" on public.profiles
for select to authenticated
using (status = 'active');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_staff_manage" on public.profiles;
create policy "profiles_staff_manage" on public.profiles
for all to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- POSTS

drop policy if exists "posts_select_approved" on public.posts;
create policy "posts_select_approved" on public.posts
for select to anon
using (status = 'approved');

drop policy if exists "posts_select_approved_auth" on public.posts;
create policy "posts_select_approved_auth" on public.posts
for select to authenticated
using (status = 'approved' or public.is_staff(auth.uid()) or author_id = auth.uid());

drop policy if exists "posts_insert_active" on public.posts;
create policy "posts_insert_active" on public.posts
for insert to authenticated
with check (public.is_active_user(auth.uid()) and author_id = auth.uid() and status = 'pending');

drop policy if exists "posts_update_author_pending" on public.posts;
create policy "posts_update_author_pending" on public.posts
for update to authenticated
using (author_id = auth.uid() and status = 'pending')
with check (author_id = auth.uid());

drop policy if exists "posts_staff_manage" on public.posts;
create policy "posts_staff_manage" on public.posts
for all to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- COMMENTS

drop policy if exists "comments_select_approved" on public.comments;
create policy "comments_select_approved" on public.comments
for select to anon
using (status = 'approved');

drop policy if exists "comments_select_auth" on public.comments;
create policy "comments_select_auth" on public.comments
for select to authenticated
using (status = 'approved' or public.is_staff(auth.uid()) or author_id = auth.uid());

drop policy if exists "comments_insert_active" on public.comments;
create policy "comments_insert_active" on public.comments
for insert to authenticated
with check (public.is_active_user(auth.uid()) and author_id = auth.uid() and status = 'pending');

drop policy if exists "comments_update_author_pending" on public.comments;
create policy "comments_update_author_pending" on public.comments
for update to authenticated
using (author_id = auth.uid() and status = 'pending')
with check (author_id = auth.uid());

drop policy if exists "comments_staff_manage" on public.comments;
create policy "comments_staff_manage" on public.comments
for all to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- RATINGS

drop policy if exists "ratings_select_approved" on public.ratings;
create policy "ratings_select_approved" on public.ratings
for select to anon
using (status = 'approved');

drop policy if exists "ratings_select_auth" on public.ratings;
create policy "ratings_select_auth" on public.ratings
for select to authenticated
using (status = 'approved' or public.is_staff(auth.uid()) or author_id = auth.uid());

drop policy if exists "ratings_upsert_active" on public.ratings;
create policy "ratings_upsert_active" on public.ratings
for insert to authenticated
with check (public.is_active_user(auth.uid()) and author_id = auth.uid() and status = 'pending');

drop policy if exists "ratings_update_author_pending" on public.ratings;
create policy "ratings_update_author_pending" on public.ratings
for update to authenticated
using (author_id = auth.uid() and status = 'pending')
with check (author_id = auth.uid());

drop policy if exists "ratings_staff_manage" on public.ratings;
create policy "ratings_staff_manage" on public.ratings
for all to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- APPROVALS (staff only)

drop policy if exists "approvals_staff_only" on public.approvals;
create policy "approvals_staff_only" on public.approvals
for all to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- REPORTS (authenticated users can report; staff can read)

drop policy if exists "reports_insert_auth" on public.reports;
create policy "reports_insert_auth" on public.reports
for insert to authenticated
with check (auth.uid() is not null);

drop policy if exists "reports_select_staff" on public.reports;
create policy "reports_select_staff" on public.reports
for select to authenticated
using (public.is_staff(auth.uid()));

-- TRANSLATIONS (staff only for now)

drop policy if exists "translations_staff_only" on public.post_translations;
create policy "translations_staff_only" on public.post_translations
for all to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));
