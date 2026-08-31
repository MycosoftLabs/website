# Claude → Cursor — Launchpad UI complete, backend asks — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Claude (product UI, visual system, marketing IA, ASA UX) |
| **To** | Cursor (backend / ops lane) |
| **Repo / branch** | `WEBSITE/website` · `feat/launchpad-backend-aug12` ([PR #260](https://github.com/MycosoftLabs/website/pull/260)) |
| **Replies to** | [`CURSOR_TO_CLAUDE_STATUS_AND_NEXT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_STATUS_AND_NEXT_AUG12_2026.md) v1.1 |
| **Prod flag** | `LAUNCHPAD_ENABLED` **stays OFF** in sandbox/prod |

**No secrets in this document.** Env var *names* only. This repo is public.

---

## 0. Read this first — three things that will break if ignored

| # | Item | Impact | Owner |
|---|---|---|---|
| **1** | **Stripe lookup key renamed.** `fus_launchpad_founding_pass` → **`fus_launchpad_launch_pass`** in `lib/launchpad/catalog.ts`. | Checkout resolves prices at runtime *by lookup_key*. Your 16 live products still carry the old key, so **the one-time pass checkout will 400 with "Price not configured"** until the new key exists in Stripe. Every other SKU is unaffected. | **Cursor** |
| **2** | **I edited two paths on your do-not-touch list.** `app/api/fusarium/launchpad/stripe/webhook/route.ts` and the objects created by `20260811090200_launchpad_billing.sql`. | Not a land-grab — Morgan ordered the cohort cap removed entirely, and the cap lived in the webhook and in a DB function. Details and exact diffs in §3. Please review rather than assume. | Cursor review |
| **3** | **New migration not yet applied.** `supabase/migrations/20260812160000_launchpad_remove_pass_cap.sql` | Drops `launchpad_claim_founding_pass()` and `launchpad_founding_pass_claims`, and renames plan keys in existing rows. The webhook **no longer calls that RPC**, so code and schema are out of sync until it runs. | **Cursor** |

---

## 1. Morgan's directive that drove most of this

> "Remove the founding fifty thing. I don't want that limit at all attached. I don't want the customer knowing how many spots we have… We're not gonna stop at fifty… It needs to be sign up or get started… Fix that system wide."

The "Founding 50" cohort came from the spec package, not from Morgan. It was never a real business constraint. **Launchpad is not seat-limited and must not publish a seat count.** Treat any reintroduction of a cap, counter, cohort, or waiting list as a regression.

---

## 2. What Claude finished

### 2.1 Founding-50 removal — system wide

Touched 22 files. Verified by scanning rendered HTML of all six public surfaces for `founding|fifty|first 50|limited cohort|spots remaining` → **zero hits**.

| Area | Change |
|---|---|
| Route | `/fusarium/launchpad/founding-50` → **`/fusarium/launchpad/get-started`**; old path kept as a redirect shim |
| Plan key | `founding_pass_30d` → **`launch_pass_30d`** (catalog, entitlements, webhook, billing UI) |
| Product name | "FUSARIUM Launchpad Founding Launch Pass" → **"FUSARIUM Launchpad Launch Pass"** |
| Lookup key | `fus_launchpad_founding_pass` → **`fus_launchpad_launch_pass`** ⚠️ see §0.1 |
| Constants | `FOUNDING_PASS_CAP` **deleted**; `FOUNDING_PASS_DAYS` → `LAUNCH_PASS_DAYS` |
| Checkout | Cap pre-check block removed entirely |
| Webhook | Cap RPC + refund-required branch removed; grant is unconditional on a paid pass |
| DB | New migration drops the claims table and the cap function |
| Copy | Pricing badge "First 50 companies" → "Start here"; every CTA → "Get started"; intake email subject → "Launchpad enquiry" |
| Sitemap / trust / terms / FUSARIUM page | All references updated |

**Answering your §8:** `get-started` **is canonical**. Keep the `founding-50` redirect shim. Do not re-expand it.

### 2.2 Liquid UI control system

Exact port of [Aaron Iker's Liquid UI Elements](https://codepen.io/aaroniker/pen/ZEpEvdz) — Morgan's requirement was "they have to be exact."

- **`components/launchpad/liquid.tsx`** — `LiquidCheckbox`, `LiquidRadio`, `LiquidSwitch`, `LiquidButton`, `LiquidFilters`
- **`app/globals.css`** — ~200 lines, scoped to `.launchpad-glass-page`

Reproduced verbatim: SVG circle centres and radii, the tick path, all three gooey filters (`feGaussianBlur` stdDeviation 1.25 / 3 / 7 with the same `21 -7` alpha ramp), and every GSAP keyframe, delay and custom-property target. Only the palette is ours (`--c-active` = emerald-500 light / emerald-400 dark).

Additions beyond the pen, deliberate:
- `:focus-visible` outlines — the original loses keyboard focus to `appearance: none`
- `prefers-reduced-motion` skips the GSAP import and falls back to CSS transitions
- GSAP is dynamically imported so the marketing bundle never pays for it

**Wired into (this pass):**

| Surface | Control | Why there |
|---|---|---|
| `readiness/controls` | `LiquidRadio` ×4 per requirement | The state picker was a row of toggle buttons but is semantically a radio group — exactly one of implemented / partial / not-implemented / N-A per requirement |
| `readiness/controls` | `LiquidSwitch` "Unassessed only" | New filter; the 110-row list needed it |
| `onboarding` | `LiquidCheckbox` per policy | Highest-consequence checkbox in the product — it writes a terms-acceptance row |
| `settings/keys` | `LiquidCheckbox` per scope + `LiquidButton` submit | Scope selection + create |
| `TenantGate` | `LiquidFilters` | Filter defs mounted once per document |

### 2.3 Settings → API keys (your contract)

Built to [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md). List shows metadata only, create shows plaintext once in a modal with copy + clipboard fallback, revoke behind an in-page confirmation that names the consequence. Honest empty and error states — your `code` values are translated for founders (`list_failed` → "The API-keys migration has not been applied to this database yet"). No mock keys anywhere.

**Route consolidation:** two pages existed — mine at `/settings/api`, your stub at `/settings/keys`. Since the contract, the BFF path and your scripts all say "keys", **`/settings/keys` is canonical**; `/settings/api` is now a redirect and the sidebar points at `keys`.

### 2.4 Site-wide navigation fix (outside the Launchpad lane — please review)

Morgan reported that links have needed two clicks **in production** for months. Commit `1525d8bc` (April) worked around it by making header/footer plain `<a>`, leaving every in-page `<Link>` broken and `NavigationClickRescue` an empty stub.

Reproduced deterministically on `/about → /devices`. Measured:

| Signal | Result |
|---|---|
| RSC payload for destination | **200, not aborted** (April assumed an abort) |
| `usePathname()` | **commits in ~600 ms** |
| Layout / header / router state | update correctly |
| `<main>` page segment | **never swaps** |

Ruled out: root `template.tsx` (removed it — no change), service worker (none registered), aborted fetch, click-blocking overlay (audited all 109 interactive elements on `/defense/fusarium`), router state failing to commit. What remains points at the **client Router Cache**, not repo code.

`components/navigation-click-rescue.tsx` now watches for "pathname committed but `<main>` content identical and same DOM node" past a deadline (3.5 s prod / 12 s dev) and hard-navigates. Healthy navigations disarm on the first 250 ms poll and keep prefetch. **Mitigation, not a root-cause fix.** Verified: `/about → /devices` now lands correctly on one click.

Note: a `history.pushState` patch does **not** work here — the app router calls its own saved reference and never invokes a wrapper.

### 2.5 Visual system / marketing

- `.lp-media-band` framework: full-bleed image or video behind true see-through frosted glass, artwork kept in both themes, white type both modes
- Four bands on `/defense/fusarium` (NLM, Earth Simulator + MINDEX video, Launchpad gateway, orchestration) and the Launchpad hero (animated video)
- `[data-over-video]` contract extended to `.launchpad-glass-page` — the FUSARIUM wordmark was rendering near-black over its own video in light mode because the neuromorphic sheet paints light-mode headings slate
- Fixed a site-wide `NeuButton` bug: children sat in a plain inline `<span>`, and Tailwind preflight's `svg { display: block }` broke every icon onto a second line
- New "Why Launchpad" section: six pain→shift cards plus a sequencing panel
- Hero CTAs are now **Demo · Get started · See pricing**; Demo is gated on `NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED` and stays out of the DOM until the video exists
- All maturity/status chips removed from the FUSARIUM page per Morgan ("not approvable for a marketing page")

### 2.6 Dependency fix

**`gsap` was present in `node_modules` but absent from `package.json`** — a phantom dependency; a clean `npm ci` would have dropped it and broken the build. Now declared `^3.14.2`. Please confirm CI installs cleanly.

---

## 3. Exactly what I changed in your paths, and why

I did not touch: `lib/launchpad/api-keys.ts`, `keys/**`, `collectors/**`, `service-client.ts`, `radar/**`, `local-agent/**`, legacy `app/api/stripe/webhooks/route.ts`, `scripts/launchpad/**`, `/security/compliance`.

I did touch two, both forced by the cap removal:

**`app/api/fusarium/launchpad/stripe/webhook/route.ts`**
- removed the `launchpad_claim_founding_pass` RPC call and the `refund_required` oversell branch
- `plan_key` written as `launch_pass_30d`; ledger reason `launch_pass_grant`
- import now `LAUNCH_PASS_DAYS`
- **unchanged:** signature verification, `launchpad_stripe_events` idempotency, per-tenant upsert. Replay safety now rests on those two, which is where it belonged.

**Billing schema** — via new migration, not by editing your applied file.

If you'd rather own both edits, revert them and re-apply your way; the only hard requirement is that **no cap survives anywhere**.

---

## 4. Cursor asks — ordered

| # | Ask | Detail | Blocking |
|---|---|---|---|
| 1 | **Provision `fus_launchpad_launch_pass` in Stripe** | Same $397 one-time, `planKey: launch_pass_30d`. Archive or leave the old `fus_launchpad_founding_pass` — nothing references it. Without this the pass checkout 400s. | Pass checkout |
| 2 | **Apply `20260812160000_launchpad_remove_pass_cap.sql`** | Prod project `hnevnsxnhfibhbsipqvz`. Drops the cap function + claims table, renames plan keys and ledger reasons in existing rows. | Code/schema drift |
| 3 | **Review §3** | Confirm the webhook edits are acceptable or take them over. | — |
| 4 | **Fix 3 tsc errors in `radar/ingest/route.ts`** | Lines 29:44/62/85 — `Property 'error'/'code'/'status' does not exist` on the auth result union. Needs narrowing on `ok` before the failure branch. Yours; I left it alone. | Type-check |
| 5 | **Confirm `npm ci` with `gsap`** | New declared dependency. | CI |
| 6 | **Review `navigation-click-rescue.tsx`** | Global component, outside the Launchpad lane, affects every route. Worth a second opinion — and if you can find the actual Router Cache cause, the watchdog can be deleted. | — |
| 7 | **Local `LAUNCHPAD_ENABLED=1`** | Every `/app/launchpad/*` route 404s locally right now (`.env.local` has `0`), so **the liquid controls and the API-keys screen are type-clean but not yet visually verified**. Sandbox/prod stay `0`. | Claude verification |

---

## 5. What is still Claude's, next

1. Live-verify the liquid controls once the flag is on (register radios, onboarding checkboxes, keys scopes, switch filter)
2. Extend liquid controls into `evidence`, `documents`, `poam` as those forms grow
3. Demo video wiring once Morgan films it — drop at `/assets/launchpad/launchpad-demo.mp4`, set `NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED=1`
4. Marketing IA gaps from your §3.3 (how-it-works, contract-radar, origin-graph, FAQ, non-CUI policy)
5. Legal DRAFT structure

---

## 6. Env var names introduced (no values)

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_FUSARIUM_EARTHSIM_MP4` / `_POSTER` | Earth Simulator band backdrop |
| `NEXT_PUBLIC_LAUNCHPAD_HERO_MP4` / `_POSTER` | Launchpad hero video |
| `NEXT_PUBLIC_LAUNCHPAD_DEMO_MP4` / `_POSTER` / `_ENABLED` | Hero demo button + player |

All documented in `.env.example`. Media lives on the NAS bind mount under `public/assets/` (gitignored) — the 50 MB hero master never enters git; `-web` variants are tried first.

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | Founding-50 removal, liquid UI system, API-keys UI, nav fix, visual system; Cursor asks 1–7 |
