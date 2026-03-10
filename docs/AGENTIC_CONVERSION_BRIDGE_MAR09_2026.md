# Agentic Conversion Bridge — Mar 09, 2026

**Status:** Internal planning  
**Related:** Public AI Rollout Plan, `/pricing`, `/onboarding`, `/api/beta/onboard`

## Overview

Public AI pages (`/ai`, `/myca`, `/ai/avani`, `/myca/nlm`) use **Request access** and **Talk to us** CTAs that route to `/contact`. No public pricing is invented for MYCA, AVANI, or API capacity. This document records the future bridge to paid agent access.

## Current State (Mar 2026)

- **CTAs:** All AI product pages link to `/contact` for "Request access" and "Talk to us".
- **Pricing:** `/pricing` exists with Free/Pro/Enterprise tiers; treated as scaffolding, not public promises for MYCA/AVANI.
- **Onboarding:** `/onboarding`, `/api/beta/onboard`, and usage tracking exist as implementation scaffolding.
- **Docs:** `/docs` is a minimal developer hub with links to AI platform, NatureOS, and "Request access" for API keys.

## Future Bridge (when ready)

1. **Pricing alignment:** Align public pricing copy with Stripe config, usage enforcement, and actual capacity.
2. **Onboarding flow:** Human and agent onboarding with API key issuance, usage metering, and plan selection.
3. **Paid agent access:** Bridge from "Request access" to authenticated onboarding and API key issuance.
4. **Docs expansion:** Full API reference and integration guides once onboarding and keys are production-ready.
5. **Auth unification:** Unify Supabase and NextAuth where they diverge for a single auth path.

## Public vs Protected

- **Public:** AI product pages, CTAs, `/docs` hub, `/contact`, `/pricing` (high-level).
- **Protected:** Admin dashboards, guardian controls, identity write flows, internal operational surfaces.

## References

- `CURSOR_BRIEF_PUBLIC_AI_PAGE_MYCA_AVANI_MAR09_2026.md`
- `PUBLIC_AI_INFORMATION_ARCHITECTURE_MAR09_2026.md`
- `PR75_AUTH_GUARDS_COMPLETE_MAR09_2026.md` (MAS repo)
