# Public AI Rollout Complete — Mar 09, 2026

**Status:** Complete  
**Related:** AI Public Rollout Plan, `CURSOR_BRIEF_PUBLIC_AI_PAGE_MYCA_AVANI_MAR09_2026.md`, `PUBLIC_AI_INFORMATION_ARCHITECTURE_MAR09_2026.md`

## Summary

The public website is restructured around a new `AI` entry point with MYCA, AVANI, and NLM as the only public AI products. Navigation, marketing, and product pages are aligned; CTAs point to `/contact`; agentic conversion is prepared without inventing pricing.

## Deliverables

### 1. Public AI Information Architecture

- **New `/ai` overview page** — Paired system (MYCA + AVANI), NLM foundation, CTA to contact
- **Retained `/myca`** — MYCA deep-dive (active superintelligence)
- **New `/ai/avani`** — AVANI (guardian/stewardship)
- **Retained `/myca/nlm`** — NLM (ecological intelligence substrate)

Source of truth: `docs/PUBLIC_AI_INFORMATION_ARCHITECTURE_MAR09_2026.md`

### 2. Unified Navigation Shell

- **Header, mobile nav, footer, sitemap** — All use `AI` (replacing `MYCA`) with shared model from `lib/nav-ai.ts`
- **AI menu items:** AI Overview (`/ai`), MYCA (`/myca`), AVANI (`/ai/avani`), NLM (`/myca/nlm`)
- Stale references (`/myca-ai`, etc.) removed; sitemap entries match real routes

### 3. Public Marketing Rewrite

- **Homepage hero:** "Governed AI for humans and agents"
- **About:** New "Governed AI" pillar; MYCA + AVANI links
- **Apps:** Subtitle references MYCA + AVANI as flagship
- **Devices:** Subtitle references MYCA + AVANI

### 4. AI Product Pages

| Route | Purpose |
|-------|---------|
| `/ai` | Overview of paired system; MYCA + AVANI; NLM link |
| `/ai/avani` | AVANI guardian/stewardship |
| `/myca` | MYCA deep-dive (existing, with Request access CTA added) |
| `/myca/nlm` | NLM (existing, with Request access CTA added) |

### 5. Agentic Conversion

- **CTAs:** All AI pages use "Request access" or "Talk to us" → `/contact`
- **No invented pricing:** MYCA/AVANI/API capacity not claimed with public prices
- **`/docs`:** Minimal developer hub (AI Platform, NatureOS, APIs & Integrations, Resources) with "Request access" for API keys
- **Bridge doc:** `docs/AGENTIC_CONVERSION_BRIDGE_MAR09_2026.md` — Future path to pricing, onboarding, API keys, paid agent access

### 6. Public vs Protected

- **Public:** AI overview, product pages, CTAs, `/docs` hub, `/contact`, `/pricing` (high-level)
- **Protected:** Guardian controls, identity write flows, admin dashboards, operational surfaces

## Verification

- [x] Public nav, footer, sitemap, and route structure aligned
- [x] Mobile nav mirrors desktop AI IA
- [x] AI overview explains why MYCA and AVANI are paired
- [x] Public pages do not expose admin-only control claims
- [x] AI CTAs route to `/contact` (no fake pricing)
- [x] Homepage and About reflect the new public story

## Files Changed (website repo)

- `lib/nav-ai.ts` (new)
- `app/ai/page.tsx` (new)
- `app/ai/avani/page.tsx` (new)
- `components/header.tsx`
- `components/mobile-nav.tsx`
- `components/footer.tsx`
- `app/sitemap.ts`
- `app/page.tsx`, `app/about/page.tsx`, `app/apps/page.tsx`, `app/devices/page.tsx`
- `components/home/hero-search.tsx`, `components/apps/apps-portal.tsx`, `components/devices/devices-portal.tsx`
- `app/myca/page.tsx` (Request access CTA added)
- `app/myca/nlm/page.tsx` (Request access CTA added)
- `app/docs/page.tsx` (replaced placeholder with minimal developer hub)

## Documentation

- `docs/PUBLIC_AI_INFORMATION_ARCHITECTURE_MAR09_2026.md`
- `docs/AGENTIC_CONVERSION_BRIDGE_MAR09_2026.md`
- `docs/CURSOR_BRIEF_PUBLIC_AI_PAGE_MYCA_AVANI_MAR09_2026.md`
