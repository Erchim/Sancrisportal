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


## Add images (covers)
Put images in: `assets/images/`
Recommended size: **1600×900** (or any 16:9).

Then reference in JSON:
- Articles / Places: `cover: "assets/images/myphoto.jpg"`
- Events: `cover: "assets/images/my-event.jpg"`
- Restaurants/Hotels/Music: `cover: "assets/images/myplace.jpg"`

## Add a new blog post (Life or Nature)
1) Create Markdown file in `posts/`:
   - Example: `posts/my-new-post.md`
2) Add an entry in `data/articles.json` (or `data/places.json`):
   - `slug` must match the filename without `.md`
   - `title`, `excerpt`, `description`, `tags`, `cover`

Example entry:
```json
{
  "slug": "my-new-post",
  "title": "Best coffee spots",
  "date": "2026-01-22",
  "category": "Life",
  "tags": ["coffee","cafes"],
  "excerpt": "Short preview for the list.",
  "description": "One sentence under the title on the post page.",
  "cover": "assets/images/cover-life.svg",
  "featured": false,
  "priority": 0
}
```

In Markdown you can add images like:
`![Alt text](assets/images/myphoto.jpg)`

## Add a restaurant / hotel / music venue
Edit:
- `data/restaurants.json`
- `data/hotels.json`
- `data/music.json`

Supported fields:
- `id` (unique), `name` (or `place`), `type/genre`, `price`, `area`, `tags[]`
- `description`, `address`, `map_url`, `link`, `cover`

Items open on:
`item.html?type=restaurants&id=<id>` (same for hotels/music).
