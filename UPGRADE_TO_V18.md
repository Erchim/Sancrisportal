# Upgrade to v18 (Community, Forum, Businesses)

## 1) Update files on your hosting
Upload the new v18 build (or replace your current folder).

## 2) Supabase database (one-time)
1. In Supabase → SQL Editor, run **`sql/supabase_schema.sql`** if you haven't already.
2. Then run **`sql/supabase_schema_v18_addons.sql`** (new in v18).

This adds:
- `business_profiles`
- `forum_categories`
- `forum_threads`
- `forum_replies`
…plus RLS policies and a few seeded forum categories.

## 3) Supabase Storage (one-time)
Create a public bucket named **`community`** (or set `SUPABASE_BUCKET` in `assets/supabase-config.js` to match your bucket).

## 4) Configure keys
Edit **`assets/supabase-config.js`** and set:
- `window.SUPABASE_URL`
- `window.SUPABASE_ANON_KEY`

## 5) Admin workflow
- First user to sign up becomes **`owner`** automatically.
- Owners/staff can approve users and content in **Admin** (appears in the menu after login).

## 6) New sections
- `/forum.html` (topics + replies, moderated)
- `/businesses.html` (business directory, moderated)
- `/submit-thread.html` and `/submit-business.html` (submission forms)

