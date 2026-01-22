# Events.SanCristobal — Portal (Package A v2)
Static website for GitHub Pages (no backend).

## 1) Edit links / branding
Open: `data/site.json`
- instagram_url
- telegram_url
- submit_form_url
- description

## 2) Add content
- Articles list: `data/articles.json` + write Markdown in `posts/<slug>.md`
- Places list: `data/places.json` + write Markdown in `posts/<slug>.md`
- FAQ: `data/faq.json`
- Events: `data/events.json`
- Hotels/Food/Music: `data/*.json`

## 3) Publish with GitHub Pages
Settings → Pages → Deploy from branch → `main` / root.
URL appears there.

## Notes
- Home page has global search across everything.
- Featured items use `featured: true` + optional `priority`.
