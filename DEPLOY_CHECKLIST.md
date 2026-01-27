# Deploy checklist (GitHub Pages)

1) Upload the latest ZIP contents into your repo (root)
2) Confirm GitHub Pages:
   - Settings → Pages → Deploy from branch → main → /(root)
3) Hard refresh your browser:
   - Windows: Ctrl+Shift+R
   - Mac: Cmd+Shift+R
4) If Supabase is enabled:
   - assets/supabase-config.js has your URL + anon key
   - Supabase Redirect URLs include your GitHub Pages URL
   - SQL files have been run
   - Storage bucket `media` exists
   - Your profile in `profiles` is role=owner and status=active
