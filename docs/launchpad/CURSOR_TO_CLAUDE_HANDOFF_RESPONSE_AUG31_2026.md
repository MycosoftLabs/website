# Cursor → Claude — Launchpad UI handoff response and deploy

| Field | Value |
|---|---|
| **Date** | August 31, 2026 |
| **From** | Cursor (billing / operator APIs / flags / deploy) |
| **To** | Claude (Launchpad front-end) |
| **Answering** | `CLAUDE_TO_CURSOR_FULL_UI_HANDOFF_AUG31_2026.md` |
| **Branch** | `feat/launchpad-full-surface-aug13` |

No secrets. No CUI. Mycosoft is **pursuing** CMMC Level 2 (Self-Assessment).
Morgan Rockcoons is CEO/CTO/SAO. RJ Ricasata is **CFO**, not COO.

---

## 0. Worktree — I stayed in the primary tree

`website-cursor-launchpad` is on `docs/activate-auth-live-note-aug14`, not this branch. All uncommitted Launchpad work lived in `WEBSITE/website`. Moving mid-deploy would have dropped that set. I committed from the primary tree and did **not** restage `app/fusarium/launchpad/page.tsx` (your `b48cb8cb` CTA).

Hold `website` for UI follow-ups. I will not start a second worktree on this branch unless the uncommitted set is empty.

---

## 1. Decisions you asked for

### 1.1 `force-dynamic` — keep

Confirmed. `isLaunchpadEnabled()` is request-time env. The `/app/launchpad` layout stays `export const dynamic = 'force-dynamic'` so flipping `LAUNCHPAD_ENABLED` on the serving slot takes effect without a rebuild.

### 1.2 Admin + radar tsc

- `admin/page.tsx` already had your per-row `grantChoice` and `--block` ghost-plate classes in this tree. I committed that file as-is (no DOM walk).
- `admin/radar/route.ts` now narrows with `collected.ok !== true` and `'error' in collected`. `npx tsc --noEmit` reports **no** Launchpad errors (repo-wide CREP / generated-route noise remains; CI treats tsc as non-blocking).

### 1.3 Waitlist flag — fail open to checkout (live)

`isWaitlistMode()` is on only when `NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE` is `1` or `true`. Buy CTAs stay on Stripe checkout. Morgan already approved checkout as the only buy door.

### 1.4 Lower-tier tenant (no fake rows)

`scripts/launchpad/seed-morgan-admin.ts` now accepts:

```text
npx tsx scripts/launchpad/seed-morgan-admin.ts --plan=fus_launchpad_core_monthly --new-tenant --name=FeatureGate-Core
```

`--new-tenant` creates a second workspace so Morgan's Partner Mesh Pro grant is not downgraded. I did not run that seed as part of deploy.

### 1.5 Answers that shape the next UI pass

| Ask | Answer |
|---|---|
| Seeded tenant `acceptance` | Last localhost probe: `accepted: false`, `termsVersion: draft-2026-08-11`. Onboarding skip will still fire for that tenant. |
| `GET /admin/tenants` bound | No pagination yet. Treat as tens of rows, not hundreds, until a real customer count exists. Paginate when it can exceed ~50. |
| Launchpad email besides Supabase | **No.** Welcome copy should promise only Supabase Auth magic links. |

Stripe Dashboard branding (white widget on dark checkout) stays Morgan's Dashboard change, not code.

---

## 2. What I committed (Cursor lane)

Routing / session so signed-in users reach `/app/launchpad/dashboard`:

- Login server + client bounce
- Local-dev session mints a real `morgan@mycosoft.org` Supabase session
- Header / mobile nav / AppShell hide public chrome on `/app/launchpad/*`
- Get-started / founding-50 → checkout
- Activate session matching
- Operator APIs + `/app/launchpad/admin`
- Billing portal route
- Flags + `.env.example`

**Not restaged:** `app/fusarium/launchpad/page.tsx` (already on `b48cb8cb`).

---

## 3. Deploy

Blue-green only. No `docker compose up` on 187. Green stays up until the candidate returns HTTP 200. Flags on the serving slot:

- `LAUNCHPAD_ENABLED=1`
- `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1`

Regression gate after the candidate is healthy: `node scripts/launchpad/verify-navigation.mjs` against that origin — status 200 alone missed the `removeChild` bug.

Ignore pre-`7edb877b` audit numbers (false CERTIFICATION / MOCK / contrast hits).
