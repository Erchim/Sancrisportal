# Content Guide (how to add posts, images, and items)

This site is **static** (GitHub Pages). You edit JSON + Markdown files, push to GitHub, and the site updates.

---

## 1) Change the background photo (global)

Replace this file with your own photo (same filename):
- `assets/images/bg.jpg`

Tips:
- Use **1920×1080** (or bigger), JPG.
- Keep it under ~500KB if possible.

---

## 2) Add / replace images

Put images here:
- `assets/images/`

Recommended sizes:
- Covers: **1280×720** (16:9), JPG/WEBP.
- Small thumbnails: **900×600** is also fine.

Use an image inside a post (Markdown):
```md
![Alt text](assets/images/my-photo.jpg)
```

---

## 3) Add a Life article (blog post)

### Step A — create the Markdown
Create:
- `posts/my-new-article.md`

Use this simple structure:
```md
# My title

Intro paragraph.

## Section
Text...
```

### Step B — add it to the list (so it appears on the website)
Edit:
- `data/articles.json`

Add an object inside `"articles": [...]`

Minimal fields:
- `slug` (same as filename, without `.md`)
- `title`
- `date` (`YYYY-MM-DD`)
- `category` (example: `"Life"`)
- `tags` (array)
- `description` (shown under the title)
- `cover` (image path)

Example:
```json
{
  "slug": "my-new-article",
  "title": "Cost of living in San Cristóbal (real numbers)",
  "date": "2026-01-30",
  "category": "Life",
  "tags": ["money","rent","food"],
  "description": "Quick reference costs for rent, food, transport and daily life.",
  "cover": "assets/images/cover_cost.jpg",
  "featured": true,
  "priority": 9
}
```

Notes:
- Higher `priority` shows higher in lists.
- Set `"featured": true` if you want it on the Home page featured list.

---

## 4) Add a Nature place (also opens as a Markdown post)

Nature is powered by:
- `data/places.json` (list)
- `posts/<slug>.md` (detail page)

Add a place object under `"places": [...]` with:
- `slug`, `title`, `description`, `cover`, `tags`
Optional:
- `distance` (example: `"20 min"`), `time` (example: `"Half day"`), `type` (example: `"Waterfall"`)

---

## 5) Add / edit Restaurants, Hotels, Music (detail pages)

These open via `item.html` and read JSON.

### Restaurants
File:
- `data/restaurants.json`

Fields you can use (any are optional):
- `id` (unique)
- `name`
- `description`
- `cover`
- `type` (cuisine/style)
- `price`
- `area`
- `address`
- `hours`
- `phone`
- `instagram`
- `map_url` (Google Maps link)
- `link` (website)
- `tags` (array)

### Hotels
File:
- `data/hotels.json`

Optional fields:
- `price_range` (or `price`)
- `vibe`
- `area`
- `address`
- `whatsapp`
- `phone`
- `booking_url`
- `map_url`
- `link`
- `tags`

### Music / Parties
File:
- `data/music.json`

Optional fields:
- `type` (bar/club/live)
- `best_day`
- `genre`
- `area`
- `address`
- `hours`
- `cover_charge`
- `instagram`
- `map_url`
- `link`
- `tags`

---

## 6) How to publish changes (GitHub Pages)

1) Open your repo on GitHub.
2) Upload the changed files (or drag & drop).
3) **Commit** to `main`.
4) Wait 1–2 minutes and refresh the site.

If CSS looks “old”, do a hard refresh:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`
