# FUSARIUM Launchpad — what actually works, what is dead, and what it needs

**Date:** August 31, 2026 · **Author:** Claude · **Method:** six code-grounded traces across the Launchpad, MAS and MINDEX repos, every behavioural claim cited to `file:line`, plus independent verification against the live Stripe account.

No secrets. No CUI. Mycosoft is **pursuing** CMMC Level 2 (Self-Assessment).

---

## 0. First, a correction — nobody was charged and dropped

The trace opened with an alarming headline: *"Four people started a Stripe checkout. None became a customer."* It inferred that from `launchpad_pending_purchases` rows frozen at `checkout_created`, and raised the possibility that Launchpad had been silently dropping revenue since Aug 14.

**I checked Stripe directly. It has not.**

```
18 Launchpad checkout sessions, Aug 13 – Aug 31
paid: 0   still open: 4   expired/abandoned: 14
```

**Every session is `unpaid`.** No card was ever charged, so nothing was dropped. And most of them are ours: `dana@northwindrobotics.com` is the test persona from `scripts/launchpad/verify-checkout-journey.mjs`, and `morgan@mycosoft.org` is Morgan's own runs. The only session from an address that is neither is one expired `$299` cart on Aug 14.

`launchpad_stripe_events` having 0 rows is **consistent with zero payments**, not evidence of a broken webhook. It is not proof the webhook works either — that still needs the check in §3.

**Do not spend the morning hunting lost revenue. There is none.** The funnel has simply never had a real buyer complete it.

---

## 1. What already works — do not rebuild it

The readiness spine is the actual product, and it is real and proven in production:

- **110-requirement register** joining the CMMC reference against tenant state. PATCH hard-sets `state_source: 'customer'`, and the DB enum **has no `'ai'` value at all** — no model can ever mark a control.
- **Deterministic scoring** from `RULE_PACK_V1`, insert-only snapshots with an `inputs_hash`, POA&M rows opened on a 180-day clock. Unassessed scores as Not-Met, so silence cannot inflate a score.
- **Four indicators kept side by side, never blended**, with eligibility explicitly labelled "not a certification or government determination."
- **Live proof:** 108 control states, **114** `control.state.changed` audit events, 6 POA&M items, 126 audit events total. A human has driven this end to end.

Also genuinely finished: evidence index (metadata + sha256 only, no upload endpoint by design), SSP factory (deterministic, no LLM, fail-closed), readiness reports, the document factory (2 live rows, `provider = anthropic (claude-sonnet-4-5)`, emits `[CUSTOMER INPUT REQUIRED]` skeletons rather than inventing facts when no key is present), tenancy, entitlements, the public purchase funnel, Origin Graph screening against real public lists, and the local-agent harness.

---

## 2. Empty but correct — these need a customer, not an engineer

**This is the group that makes Launchpad look unfinished when it isn't.** Every one is working CRUD over an empty table: `launchpad_tasks`, `launchpad_proposal_workspaces`, `launchpad_bom_parts`, `launchpad_training_assignments`, `launchpad_tier1_records`, `launchpad_registration_records`.

A single real customer doing a day's work fills them. **Ship nothing here.**

---

## 3. Genuinely dead — and what each one actually needs

| # | What | The single blocking thing | Lane |
|---|---|---|---|
| 3.1 | **Contract Radar has no data** | `SAM_API_KEY` is declared in `.env.example:199`, **present-but-empty** in `.env.local`, **absent** from prod. The collector is complete (172 lines, real `api.sam.gov/opportunities/v2/search`), the ingest, tables and operator button all exist. It refuses to run keyless rather than inventing notices. **A free api.data.gov key turns it on.** | **Morgan** |
| 3.2 | **Nothing schedules the collectors** | No cron anywhere runs `scripts/launchpad/run-nightly-collectors.ts`. Today the only path is a human clicking "Run SAM ingest". | **Cursor** |
| 3.3 | **~~No capability profile writer~~** | **FIXED — `04c3ae38`.** See §4. | ~~Claude~~ |
| 3.4 | **AI cost ledger cannot write a row** | `launchpad_ai_cost_ledger.task` is `NOT NULL` with no default; `router.ts` passes `taskId: null` at :153/:220/:288 and the insert error is swallowed at `metering.ts:102`. 0 rows, and the AI panel can never show anything. **One line.** | **Cursor** |
| 3.5 | **`/ai/complete` has zero callers** | The BYO-key envelope, dual meter and MAS fallback are all built and unreachable. Largest block of untested surface in the product. Decide: give it one consumer, or delete it and keep `router.ts` as a library. | **Morgan → Claude** |
| 3.6 | **Radar alerts and watches have no UI** | `radar/alerts` is implemented with no consumer; `launchpad_opportunity_watches` has RLS and a unique key and **zero code references** — the Watch button is hardcoded `disabled`. | **Claude** |
| 3.7 | **DSIP + Grants.gov collectors** | `dsip-grants-skeleton.ts` is 22 lines that throw. **Grants.gov needs no key at all** and `grants_gov` is already in the DB CHECK — cheapest second source available. DSIP has no public REST search, which is the real obstacle. | **Cursor** |
| 3.8 | **Advisory (Cal.com) unconfigured** | All five env values empty. Four SKUs ($99–$475) unsellable. Routes return an honest `503`, never a fake slot. **No code needed.** | **Morgan** |
| 3.9 | **Signatures (DocuSign) blocked** | Both auth paths blocked — `DOCUSIGN_SECRET_KEY` empty *and* the RSA PEM path empty. Fails with a precise `blockingReason` rather than pretending. | **Morgan** |
| 3.10 | **CI/CD injects none of the Launchpad secrets** | `STRIPE_SECRET_KEY`, `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`, `LAUNCHPAD_ENABLED`, `LAUNCHPAD_KMS_MASTER_KEY`, `ANTHROPIC_API_KEY`, `SAM_API_KEY` appear in **zero workflow files**. They exist in prod only if hand-added. They survive deploys, but **nothing in the repo can tell you whether production can currently take money.** That is the real defect. | **Cursor** |

---

## 4. What I fixed in this pass

**`04c3ae38` — the capability profile (§3.3), which was the hidden second-order blocker.**

`launchpad_capability_profiles` had **no writer anywhere in the product**. `PATCH /company/capabilities` was fully implemented with zero callers, so the table stayed empty — and empty is not a soft failure downstream:

- `fit-match.ts:149` returns `[]` outright when no profile row exists
- `rank.ts:57` pins `fitScore` to 0
- alerts fan out from matches (`ingest.ts:129`), so they were dead too

**Fixing `SAM_API_KEY` alone would have produced a list of federal notices with no scoring, no matches and no alerts — and nothing in the UI would have explained why.** New page at `/app/launchpad/company/capabilities`, wired into the Company tab strip. NAICS and set-asides are labelled "used for matching"; PSC, agencies and exclusions are labelled "recorded, not scored yet" rather than implying they work. Verified against the live route: PATCH 200, values persist, warning clears.

**`61aec4b5` — corrected the Radar copy**, which said the collectors were "in implementation". That was wrong about SAM and wrong in the direction that makes a finished pipeline look unstarted.

---

## 5. The integration map — MINDEX, MYCA/MAS, FUSARIUM

### MINDEX — **no genuine consumer. Leave it out.**

MINDEX appears in Launchpad exactly once, as a `/health` liveness probe surfaced on the operator page. A grep of the MINDEX repo for `sam.gov`, `opportunit`, `naics`, `sbir` returns **only HIFLD hospital ETL files**. There is nothing to integrate, and building a tie-in would be invention.

### MYCA / MAS — one real asset, currently unused

`MAS/mycosoft-mas/mycosoft_mas/integrations/sam_gov_client.py` is a working SAM client, alongside `grants_gov_client.py`, `sbir_client.py` and `agents/business/grant_agent.py`. **But `GrantAgent` is never registered on any router** — the only imports are `__init__` shims — and MAS uses a *different env var* (`SAM_GOV_API_KEY`) and a *different URL path* than the website.

**Recommendation: do not route collectors through MAS.** It is strictly more work than a cron over code the website already has, and the two implementations disagree. The genuine MAS integration that already works is the **AI fallback** (`lib/launchpad/ai/mas-fallback.ts`) — keep that.

### FUSARIUM — this *is* FUSARIUM

The whole surface lives under `app/api/fusarium/launchpad/`. There is no separate integration to build.

---

## 6. Ordered plan

### Today — Morgan
1. **Skip the lost-revenue hunt** (§0 — there is none).
2. **Confirm prod can take money:** that `/opt/mycosoft/website/.env` really contains `LAUNCHPAD_ENABLED`, `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`, and that the Stripe webhook endpoint is registered against the live host.
3. **Get a free api.data.gov key** → `SAM_API_KEY` on both slots.
4. Fill in the new **capability profile** for Mycosoft — one screen, and Radar can rank the moment the key lands.
5. Click **Run SAM ingest** on `/app/launchpad/admin` as `morgan@mycosoft.org` (a `gmail.com` session gets 403 — the allowlist is `lib/launchpad/operator.ts:15`). One click proves list, detail, amendments, matches and alerts at once.

### This week — Cursor
6. Add every Launchpad secret to CI `set_secret`, and **fail the deploy** if `LAUNCHPAD_ENABLED=1` without `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`.
7. Fix `launchpad_ai_cost_ledger.task` (one line).
8. Nightly collector cron — safe to schedule *before* the key lands, the script exits cleanly without one.

### Next — Claude (me)
9. **Reconcile the two scoring scales before either is user-visible.** `fit-match.ts` emits 0–100, `rank.ts:59` emits 0–1, and the detail page renders `toFixed(0)` — **a real 0–1 match displays as "0"**. This will look like a broken feature the day Radar goes live.
10. Alerts strip + working Watch button.
11. Grants.gov collector *(Cursor)* — keyless, zero schema work.

---

## 7. Not worth building yet

DSIP (no public REST search). Partner Mesh and Enclave Bridge (both need *two* customers; there are zero). Local-agent installers (enrollment and intake already work). BYO-key KMS in production (the platform-key path works without it). **Any MINDEX integration.** Routing collectors through MAS.

---

## 8. Stale claims in earlier handoffs — corrected

- `CLAUDE_TO_CURSOR_GAP_PLAN_AUG13_2026.md:107` says `launchpad_radar_alerts` has "zero writers." **Wrong now** — `ingest.ts:134` and `fit-match.ts:178` both insert. It is transitively dead, not unwritten.
- `01-contract-radar-collectors.md:10` says the ingest route is "currently 501." **Wrong** — fully implemented.
- One trace claimed `PERPLEXITY_API_KEY` is absent from `.env.example`. It is **set in `.env.local`**, as are `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `LAUNCHPAD_KMS_MASTER_KEY`.
