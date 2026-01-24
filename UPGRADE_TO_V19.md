# Upgrade to v19 (Community: reports + ratings summary + “My” dashboard)

This upgrade adds:
- **Reports** (users can report content/comments/replies; staff can handle in Admin).
- **Business sorting** by **Top rated** and **A–Z**.
- A **My dashboard** page (`my.html`) listing your submissions, forum activity, and reports.

---

## 1) Update files on GitHub Pages

Replace your website files with the new v19 files (or copy the changed files):
- `assets/community.mjs`
- `assets/auth-nav.mjs`
- `assets/app.js`
- `assets/style.css`
- `admin.html`
- `businesses.html`
- `forum-thread.html`
- **NEW:** `my.html`
- **NEW:** `sql/supabase_schema_v19_addons.sql`

All HTML/JS/CSS cache-busters were bumped to `?v=20.0`.

---

## 2) Run SQL in Supabase

In Supabase **SQL Editor**, run **in order**:

1. `sql/supabase_schema.sql`
2. `sql/supabase_schema_v18_addons.sql`
3. **NEW:** `sql/supabase_schema_v19_addons.sql`

This creates the `reports` table, RLS policies, and the `business_rating_summary` view.

---

## 3) Admin workflow

Open `admin.html` (as an **owner/staff** account):

- **Reports**: click **Approve** to mark a report as `handled`, or **Reject** to set `rejected`.
- **Ratings**: approve/reject works as before, but now also drives the **Top rated** sort in Businesses.

---

## Notes

- Reporting is available only to **approved (active)** accounts (same as commenting).
- If you skip the v19 SQL file, the site will still load, but:
  - Reporting will fail.
  - “Top rated” sorting will fall back to newest order.
