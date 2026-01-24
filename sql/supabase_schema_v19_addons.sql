-- Events San Cristobal Portal — Supabase schema addons (v19)
-- Run AFTER:
--   1) sql/supabase_schema.sql
--   2) sql/supabase_schema_v18_addons.sql
--
-- Adds:
-- - reports table (moderation queue)
-- - business rating summary view

-- =========================
-- Reports
-- =========================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  content_ref text not null,
  reason text not null default '',
  details text,
  status text not null default 'pending' check (status in ('pending','handled','rejected')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- Active users can create reports
create policy if not exists "Reports: active users create"
  on public.reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  );

-- Reporter can view own reports
create policy if not exists "Reports: reporter view own"
  on public.reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

-- Staff/Owner can view & manage all reports
create policy if not exists "Reports: staff manage"
  on public.reports
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')))
  with check (true);

-- =========================
-- Rating summaries (for sorting / top lists)
-- =========================
create or replace view public.business_rating_summary as
select
  split_part(content_ref, ':', 2)::uuid as business_id,
  avg(rating)::float as avg_rating,
  count(*)::int as rating_count
from public.ratings
where
  status = 'approved'
  and content_ref like 'business:%'
  and split_part(content_ref, ':', 2) ~ '^[0-9a-fA-F-]{36}$'
group by 1;
