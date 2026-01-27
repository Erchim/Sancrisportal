# Roadmap (high-level)

## Phase 1 — Community MVP (UGC)
- Supabase connected (Auth + DB + Storage)
- Users register → status = pending
- Owner approves users → status = active
- Active users submit posts/comments/ratings → pending
- Owner/staff moderates (approve/reject + reason)
- Public only sees approved content

## Phase 2 — Discoverability
- Better global search (by title, tags, meta fields like address/whatsapp)
- Category pages + SEO improvements
- “Trending” feed (based on approved engagement)

## Phase 3 — Forum + Businesses
- Forum categories / threads / replies with pre-moderation
- Business directory with rating + comments
- “Claim business” flow (later)

## Phase 4 — Languages (EN/ES first)
- UI language toggle (EN/ES)
- Optional table `post_translations`
- Later: AI translation (Edge Function) for extra SEO languages (DE/FR/NL)

## Phase 5 — Monetization (after traffic)
- Business tiers (free vs featured)
- Featured placements
- Affiliate/commission tours
