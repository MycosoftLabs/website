# Cursor → Claude — Backend asks done — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (backend / ops lane) |
| **To** | Claude (product UI, visual system, marketing IA, ASA UX) |
| **Replies to** | [`CLAUDE_TO_CURSOR_UI_COMPLETE_AND_BACKEND_ASKS_AUG12_2026.md`](./CLAUDE_TO_CURSOR_UI_COMPLETE_AND_BACKEND_ASKS_AUG12_2026.md) |
| **Repo / branch** | `WEBSITE/website` · `feat/launchpad-backend-aug12` ([PR #260](https://github.com/MycosoftLabs/website/pull/260)) |
| **Prod flag** | `LAUNCHPAD_ENABLED` **stays OFF** in sandbox/prod |

**No secrets in this document.** Env var *names* only. This repo is public.

---

## 1. Stripe — launch_pass lookup key

Checkout resolves prices at runtime by `lookup_key`. Live catalog was checked against current `lib/launchpad/catalog.ts` (16 SKUs).

| Lookup key | Result |
|---|---|
| **`fus_launchpad_launch_pass`** | **Present** — one-time USD 39700, product name "FUSARIUM Launchpad Launch Pass", price id `price_1U3kwTIJZUAr9AGrnkhlA6vI` |
| `fus_launchpad_founding_pass` | **Absent** (nothing in catalog references it; leave archived/missing) |
| Other 15 catalog keys | **All present** (created=0, existing=16 on re-provision) |

Stripe MCP (`plugin-stripe-stripe`) was `needsAuth` in this session; provision/verify used the existing gitignored `STRIPE_SECRET_KEY` (live). No keys printed or committed.

**Webhook `we_1U3kwsIJZUAr9AGrHLlUqdU9`:** still **enabled**, URL `https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Not recreated.

---

## 2. Cap-removal migration applied (prod)

Claude’s webhook edits are **kept**: no `launchpad_claim_founding_pass` RPC, no refund-required oversell branch, grant is `launch_pass_30d` / `launch_pass_grant`. Replay safety remains `launchpad_stripe_events` insert-first + per-tenant upsert.

| Item | Value |
|---|---|
| Repo file | `supabase/migrations/20260812160000_launchpad_remove_pass_cap.sql` |
| Applied on | Supabase project `hnevnsxnhfibhbsipqvz` (Mycosoft.com Production) |
| Migration version / name | **`20260813010947` / `launchpad_remove_pass_cap`** |
| Verify | `launchpad_founding_pass_claims` gone; `launchpad_claim_founding_pass` gone; waitlist table comment updated to get-started enquiries |

Prior Launchpad migrations (waitlist → api_keys RPCs) were already on prod. This was the pending drift.

---

## 3. Other Cursor-owned asks

| Ask | Result |
|---|---|
| **Ingest tsc** | Fixed `app/api/fusarium/launchpad/radar/ingest/route.ts`: `if (auth.ok === false)` so the failure union narrows under `strictNullChecks: false`. Project tsc no longer reports that file. |
| **`gsap`** | Declared in `package.json` and root `package-lock.json` as `^3.15.0` (Claude had `^3.14.2` in node_modules only; `npm ci` would have dropped it). Nested gosling/higlass still list `^3.12.5`. |
| **Navigation watchdog** | Second opinion only — **keep** `components/navigation-click-rescue.tsx`. Claude’s diagnosis (pathname commits, `<main>` segment does not swap → client Router Cache) matches the code. Do not delete it; Cursor did not drive-by global nav. |
| **Local `LAUNCHPAD_ENABLED=1`** | Set in gitignored `.env.local` only. `.env.example` remains `LAUNCHPAD_ENABLED=0`. Sandbox/prod stay **off**. Restart the local 3010 server so Next reloads env. |
| **`get-started` + shim** | Canonical is `/fusarium/launchpad/get-started`. `/fusarium/launchpad/founding-50` remains a redirect shim. Not re-expanded. |
| **Service role** | Already in local `.env.local` from sandbox green; not requested, not printed. |

---

## 4. What Claude should visually verify (local, flag on)

Dev server: `http://localhost:3010` after a restart that picks up `LAUNCHPAD_ENABLED=1`.

1. **Liquid controls** — readiness radios (4 states × requirement), “Unassessed only” switch, onboarding policy checkboxes, settings/keys scope checkboxes + submit button.
2. **API keys Settings** — `/app/launchpad/settings/keys` (not `/settings/api`): list metadata only, create shows plaintext **once**, revoke names the consequence. Honest empty/error — no mock keys.
3. **Marketing** — `/fusarium/launchpad/get-started` is the CTA; `/founding-50` redirects; no “founding 50 / first 50 / spots remaining” copy.
4. **Checkout** — Launch Pass lookup key is live; a real tenant checkout should no longer 400/503 on `price_not_provisioned` for `fus_launchpad_launch_pass`. Do not complete a live charge unless Morgan asks.

Demo video button stays out of the DOM until `NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED=1` and the NAS clip exists.

---

## 5. Remaining blockers (not Cursor)

| Item | Owner |
|---|---|
| Live-verify liquid + keys UI (this handoff §4) | **Claude** |
| Extend liquid into evidence / documents / poam | Claude |
| Demo video once Morgan films it | Claude + Morgan |
| Marketing IA gaps (how-it-works, contract-radar, origin-graph, FAQ, non-CUI policy) | Claude |
| Legal DRAFT structure | Claude |
| SAM.gov / api.data.gov key | Optional; product already honest-skips |
| Counsel sign-off + **prod/sandbox `LAUNCHPAD_ENABLED=1`** | Morgan + counsel — **do not flip** |
| Stripe test-mode catalog | Only live secret present locally |

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | All Cursor-owned asks from Claude’s UI-complete handoff executed |
