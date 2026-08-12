# Launchpad Handoff 01 — Contract Radar Collectors (Cursor)

**Lane:** Cursor owns the collectors, scheduling, amendment diffing, and fit-matching runtime. Claude built the schema, ingest contract, and UI.

## What exists (built, live in prod Supabase project `hnevnsxnhfibhbsipqvz`)

- `launchpad_opportunities` — global, `unique(source, source_id)` is the dedupe key; **service-role writes only** (RLS revokes app-role writes). Columns match spec §15.3.
- `launchpad_opportunity_amendments` — `(opportunity_id, amendment_no)` unique, `diff jsonb`.
- `launchpad_opportunity_matches` / `launchpad_opportunity_watches` — tenant-scoped, canonical `launchpad_is_member` RLS.
- `POST /api/fusarium/launchpad/radar/ingest` — bearer `LAUNCHPAD_INGEST_TOKEN`, currently **501** with the full `NormalizedOpportunity` contract in the route file (`app/api/fusarium/launchpad/radar/ingest/route.ts`). Replace the 501 body with: validate → service-role batch upsert on `(source, source_id)` → if `source_hash` changed, insert an amendment row with the field-level diff → enqueue fit-matching for affected tenants.
- Read UI: `/app/launchpad/opportunities` renders the table honestly ("no sources connected") until rows exist.

## Build order

1. **SAM.gov collector first** (official API, key via api.data.gov). `fetch_new`/`fetch_updated`, normalize per §15.3, `source_hash = sha256(raw payload)`.
2. DSIP, Grants.gov next (P0 in the backlog: LP-080/081/082); DIU/DARPA/NSPIRES/NSF are 90-day (LP-083–086).
3. **Scheduling:** one central scan per source per cadence — never per-tenant scans (§11.5 economics). Tenant plan gates *delivery frequency* (weekly vs daily digests), not collection.
4. **Fit-matching:** `matchTenants(opportunityIds)` — score against `launchpad_capability_profiles.data` using the §15.4 weights; write `launchpad_opportunity_matches` with `fit_factors` (reasons) and `disqualifiers`. Never emit "% chance of winning."
5. **Enrichment:** credit-metered via `launchpad_spend_credits(t, amount, 'spend:enrichment', ref)` RPC — it enforces balance under an advisory lock. Cache enrichment on the OPPORTUNITY (shared across tenants), spend credits per-tenant for the request.

## Env

`LAUNCHPAD_INGEST_TOKEN` (already in `.env.example`) — mint a long random value, set in both blue-green colors and the collector runtime.

## Tests the collectors must pass (spec §35.5)

Duplicate opportunity → single row; amendment → diff row + alert; deadline timezone preserved verbatim; cancelled notice closes pipeline; `official_url` + `source_hash` stored; stale source flagged; disqualifier prevents high-fit label.
