# SQL files

Run from Supabase → SQL Editor.

- `00_run_all.sql` — easiest: schema + addons + storage policies in one paste/run
- `supabase_schema.sql` — core tables + triggers + RLS for profiles, posts, comments, ratings
- `supabase_schema_v18_addons.sql` — business profiles + forum tables + policies
- `supabase_schema_v19_addons.sql` — reports table + business rating summary view + policies
- `storage_policies.sql` — Storage policies for bucket `media`

Recommended for beginners: run `00_run_all.sql`.
