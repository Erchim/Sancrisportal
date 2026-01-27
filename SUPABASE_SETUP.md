# Supabase setup (from zero) — Events San Cristobal Portal

This site is a static frontend (GitHub Pages) + Supabase for:
- Auth (email magic link)
- Database (posts, comments, ratings, forum, businesses)
- Storage (images)

## A. Create a Supabase project
1. Go to Supabase and create a **New project**
2. Save the **database password** (you will need it later)
3. Wait until the project finishes provisioning

## B. Put your Supabase keys into the website
1. In Supabase: **Project Settings → API**
2. Copy:
   - **Project URL**
   - **anon public key**
3. In your GitHub repo, open: `assets/supabase-config.js`
4. Replace placeholders:

```js
export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";
```

Commit and push.

## C. Allow redirects (so magic-link returns to your website)
In Supabase: **Authentication → URL Configuration**
Add your GitHub Pages URLs:

- `https://<USERNAME>.github.io/<REPO>/`
- `https://<USERNAME>.github.io/<REPO>/account.html`
- `https://<USERNAME>.github.io/<REPO>/admin.html`
- `https://<USERNAME>.github.io/<REPO>/submit-post.html`
- `https://<USERNAME>.github.io/<REPO>/community.html`

Save.

> Tip: if you test locally, also add `http://localhost:8000/account.html`.

## D. Create tables (SQL)
In Supabase: **SQL Editor → New query**

### Option 1 (recommended): run ONE file
Open `sql/00_run_all.sql` in this repo, copy everything into SQL Editor, press **Run**.

### Option 2: run files one-by-one
Run in order:
1) `sql/supabase_schema.sql`
2) `sql/supabase_schema_v18_addons.sql`
3) `sql/supabase_schema_v19_addons.sql`
4) `sql/storage_policies.sql`

After this, go to **Table Editor** and confirm you see tables like:
`profiles`, `posts`, `comments`, `ratings`, `reports`, and (if addons ran) `business_profiles`, `forum_threads`, etc.

## E. Create Storage bucket for images
In Supabase: **Storage → New bucket**
- Name: `media`
- Public: **ON** (for v1)

## F. Create your owner/admin user
1. Open your website: `account.html`
2. Sign in with your email (magic link)
3. In Supabase: **Table Editor → profiles**
4. Find your row and set:
- `role` = `owner`
- `status` = `active`

Now you can open: `admin.html`

## G. Test end-to-end
1) As owner, open `submit-post.html` and submit a post (it becomes `pending`)
2) Open `admin.html` → Approve it
3) Open `community.html` → the post is now visible publicly

## Troubleshooting
### Magic link does not return to your site
- Redirect URLs not added correctly (must include your full GitHub Pages path)
- Try again after saving Redirect URLs

### Admin says "no access"
- Your profile is not `role=owner` and `status=active`
- Or your SQL was not run, so `profiles` table / trigger is missing

### Images don’t upload
- `media` bucket missing
- `storage_policies.sql` not run
