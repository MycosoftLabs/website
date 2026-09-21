# FUSARIUM / Launchpad audit fixes

**Date:** September 21, 2026  
**Status:** Complete  
**Related:** `fusarium-launchpad-audit-2026-09-21.md` (Morgan / Grok walkthrough)

## Overview

Named website copy, SEO, nav, and shortcut fixes from the 21 Sep 2026 FUSARIUM / Launchpad audit. No marketing hero or video swaps. Work landed on `fix/fusarium-launchpad-audit-sep21` from `origin/main` so Instant Deploy / Trail AR PR #322 stays HELD.

## Outcome

| Finding | Result |
|---|---|
| 1. `/mycosoft-logo.png` JSON-LD 404 | Hosted real PNG at `public/mycosoft-logo.png`; JSON-LD URL unchanged |
| 2. Defense badges over-claim | Softened to DoD-mission / NIST-aligns / pursuing CMMC L2 |
| 3. Scenario numbers | Explicit hypothetical / not-a-customer-result disclaimer |
| 4. Nav Fusarium vs FUSARIUM | Normalized to **FUSARIUM** + existing **Launchpad** label |
| 5. Two federal identities | LLC labeled as federal contracting vehicle; Inc as parent |
| 6. GitHub org profile README | Refreshed on `MycosoftLabs/MycosoftLabs` if write succeeded |
| 7. Website README | Names Launchpad; AVANI = governance |
| 8. Orphan launchpad-demo paths | Removed dead default public paths; no fake videos |
| 9. `/launchpad` `/cmmc` 404s | Redirects to canonical routes |
| 10. `/auth/login` GET 405 | Skipped — POST-only form handler; users use `/login` |
| 11. Public Launchpad docs repo | Skipped new repo; README points at `/fusarium/launchpad` |
| 12. Cloudflare email-protection | Skipped — no site-emitted bad href |

## How to verify

- `http://localhost:3010/mycosoft-logo.png` → 200
- Homepage source includes Organization `logo` at that URL
- `/defense` badges + scenario disclaimer
- Nav: FUSARIUM + Launchpad
- `/launchpad` → `/fusarium/launchpad`; `/cmmc` → `/compliance`
- `/compliance` LLC vs Inc labels
