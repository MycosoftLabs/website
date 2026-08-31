# Launchpad paid services audit — August 31, 2026

**Date:** August 31, 2026  
**Status:** Code and schema shipped; LLC card test blocked on Morgan’s unused mailbox  
**CUI:** none. Commercial workspace only. Mycosoft is **pursuing** CMMC L2 — no control is claimed Met.

Related plan: Launchpad fully paid-functional (margin on every service).

---

## Outcome

Every SKU that stays for sale now has a working path or an honest disable (`blockingReason` / `saleBlockForProduct`). Empty customer tables remain empty until the customer types. Dead integrations are not sold.

## What shipped (this pass)

| Area | Delivered |
|---|---|
| Money fail-closed | `evaluateBillingReady` + CI step: `LAUNCHPAD_ENABLED=1` without `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` aborts deploy. Probe on 187: webhook secret **is set**. |
| Advisory | Cal.com must include webhook secret to be `configured`. Checkout blocked when Cal.com is not redeemable. Advisory page no longer says scheduling is “coordinated by email.” |
| DocuSign | Customer OAuth remains default. Hosted JWT send consumes `fus_launchpad_envelope_send` ($15). CTA hidden until an unredeemed credit exists. |
| Radar | Official collectors: SAM (keyed) + SBIR.gov public API (DSIP-class, no scrape, no DSIP login) + Grants.gov Search2 (keyless). Collect route on `/api/fusarium/launchpad/radar/collect`. |
| AI credits | Document factory POST gates `documentFactory`, uses `routeCompletion` (`policy_draft`). Grace/read_export pauses AI. Price book 4× third-party / 5× Nemotron/MYCA. Cost ledger writes `actual_cost_cents` / `reserved_cost_cents` / `task` (`unattributed` if needed). Monthly grant keyed on `invoice.id`. Day-1 plan credits on checkout. |
| Partner Mesh | Pro invites; any paid tenant accepts. Invites UI sits outside FeatureGate. Consent ledger unchanged. `partnerSandbox` is not advertised. |
| Schema | `launchpad_envelope_credits`, `launchpad_partner_invites`, `launchpad_radar_enrichment_cache`, `launchpad_tenant_ids_for_email` on Mycosoft.com Production. |

## What we will not do (held)

- Invent MINDEX SAM/SBIR ETL.
- Scrape DSIP or the CAC IR&D portal.
- Route collectors through MAS `GrantAgent`.
- Auto-reload credits.
- `docker compose up` on 187.

## 187 probe (names only, Aug 31, 2026)

Active origin is blue/green nginx. Host git checkout `9a51f071` (stale vs feat). Host `.env`: `LAUNCHPAD_ENABLED`, public checkout, Stripe secret, **Launchpad webhook secret**, MAS URL, and `LAUNCHPAD_INGEST_BEARER` are set. Absent on host and both slots: Cal.com (all seven), DocuSign OAuth, `SAM_API_KEY`, `NVIDIA_NIM_API_KEY`. Containers do not yet have the ingest bearer — next blue-green injects host `.env`. `Mycosoft-LaunchpadCollectors` timer is enabled (next ~06:15 UTC).

## Env still owed by Morgan (chat only — never commit)

Unused LLC mailbox (**not** `morgan@mycosoft.org`). Cal.com four event types + seven names (`CALCOM_API_KEY`, `CALCOM_WEBHOOK_SECRET`, `CALCOM_BOOKING_BASE_URL`, `CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}`). DocuSign Integration Key + Secret + Connect HMAC. `SAM_API_KEY` on both slots. Confirm 241 Nemotron / `NVIDIA_NIM_*`. `LAUNCHPAD_INGEST_BEARER` for the 187 timer (host `.env` + next blue-green inject).

Cal.com webhook: `BOOKING_CREATED` → `https://mycosoft.com/api/fusarium/launchpad/advisory/webhook`  
DocuSign redirect: `/api/fusarium/launchpad/signatures/oauth/callback`  
Stripe Launchpad webhook: `https://mycosoft.com/api/fusarium/launchpad/stripe/webhook`

## LLC customer day (blocked)

Checkout URL: `https://mycosoft.com/fusarium/launchpad/checkout?plan=core&billing=monthly`  
SKU: `fus_launchpad_core_monthly` ($149). Company: **MYCOSOFT, LLC**.

After pay, verify: Stripe `paid`, `launchpad_stripe_events` row, pending `claimed`, Core entitlements, **monthly credits > 0**, tenant name MYCOSOFT LLC.

**Refund + cancel:** Dashboard refund $149 **and** cancel the Core subscription. Refund alone does not revoke (no `charge.refunded` handler). Cancel fires `customer.subscription.deleted`. Keep the LLC tenant as the audit workspace.

## Verify

```text
npx jest lib/launchpad/__tests__/billing-ready.test.ts lib/launchpad/__tests__/price-book.test.ts lib/launchpad/__tests__/public-checkout.test.ts --runInBand
```

Origin `http://192.168.0.187:3000` and `https://mycosoft.com` must return HTTP 200 after blue-green.

## Lessons

- Selling advisory without `CALCOM_WEBHOOK_SECRET` would take money and never redeem the credit.
- Document factory on `lib/reports/llm.ts` was the largest unmetered leak; routing through `routeCompletion` is the only safe path.
- Partner Mesh consent-to-FUSARIUM is not a second customer. Tenant-to-tenant invite is the mesh.
