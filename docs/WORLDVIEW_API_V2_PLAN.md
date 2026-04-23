# Worldview API v2 — Unified Data Gateway

**Status:** design · Apr 23, 2026
**Owner:** Morgan (CEO)
**Target:** `mycosoft.com/api/worldview/v1/*`

---

## 1. Intent

Expose **every** dataset in MINDEX, CREP, and NatureOS through a single, agent-first, token-metered API so any agent, external system, or app can pull world-state data from one place. Today that data is scattered across ~120 route handlers in the website repo plus MINDEX's FastAPI; Worldview consolidates them under a uniform contract without moving the underlying compute.

Morgan's exact constraints (Apr 22–23, 2026):
- "all we added to crep needs to work in worldview api"
- "at cost to agents and users token rate limited bundled and organized for users mostly agents"
- "also https://mycosoft.com/agent … all that needs to be referenced and probably updated after"

---

## 2. Three-layer architecture — where code lives

```
 Agents / Users ─▶ mycosoft.com/api/worldview/v1/*         ← WEBSITE REPO
                   (gateway: auth / meter / limit / bundle)
                          │
                  ┌───────┼───────┐
                  ▼       ▼       ▼
               MINDEX   MAS   External ETL pulls
               (VM .189) (.188)
```

**Website repo** owns the gateway: auth (Supabase `agent_api_keys`), cost metering (`balance_cents`), rate limiting (token bucket), dataset registry, bundle definitions, response envelope, OpenAPI generation, edge cache. **Thin aggregator — never the heavy compute layer.**

**MINDEX** owns entity storage + PostGIS queries + taxonomy ltree. Worldview proxies bbox / entity-type / time-range queries to MINDEX and returns normalized GeoJSON/JSON.

**MAS** owns MYCA workflows, PersonaPlex, agent runtime. Worldview calls MAS for agent-specific operations (waypoint verify, entity feed subscriptions).

**External ETL pulls** (OSM Overpass, FIRMS, OpenAQ, AirNow, AISStream, FlightRadar24, Shodan) are run from the website repo as scheduled GHA crons, write baked geojson to `public/data/crep/*` + upsert to MINDEX. Worldview reads from MINDEX (authoritative) with fallback to static baked files (cold-path resilience).

Rationale for the split is in `README` section at the bottom.

---

## 3. URL surface

All routes live under `/api/worldview/v1/` with version pinning so future changes don't break existing agents.

| Route | Method | Auth | Cost | Purpose |
|-------|--------|------|------|---------|
| `/v1/health` | GET | none | 0 | Liveness — free, no auth |
| `/v1/catalog` | GET | none | 0 | List every dataset + cost + auth tier |
| `/v1/bundles` | GET | none | 0 | List every bundle |
| `/v1/openapi.json` | GET | none | 0 | OpenAPI 3.1 spec — auto-generated from registry |
| `/v1/snapshot` | GET | **agent key** | 1 | Aggregated world-state snapshot (replaces existing `/api/worldview/snapshot`) |
| `/v1/query` | GET | **agent key** | varies | Unified dataset query: `?type=<id>&bbox=&limit=&cursor=` |
| `/v1/bundle/{bundle_id}` | GET | **agent key** | varies | Fetch a pre-defined bundle |
| `/v1/stream/{channel}` | GET (SSE) | **agent key** | 5 / min | Server-sent event channel (live entities, MYCA verified, alerts) |
| `/v1/tile/{z}/{x}/{y}.{ext}` | GET | **agent key** | 0.1 | Vector / raster tile proxy (for map consumers) |
| `/v1/usage` | GET | **agent key** | 0 | Caller's balance + rate-limit state + today's usage |

**Removed / migrated:**
- Existing `/api/worldview/snapshot` stays but becomes a thin alias → `/api/worldview/v1/snapshot` with zero-cost public snapshot preserved for back-compat, full agent-metered version behind auth.
- Every `/api/crep/*`, `/api/mindex/*`, `/api/oei/*`, `/api/eagle/*`, `/api/natureos/*` route keeps working as-is but **also** becomes discoverable through `/v1/query?type=<id>`. Agents stop hand-crafting URLs; they read the catalog.

---

## 4. Authentication

Two layers, both already exist in `lib/agent-auth.ts`:

1. **Agent API key** — `Authorization: Bearer mk_<64-hex>`. Keys in Supabase `agent_api_keys` with scopes, rate limits, balance. Agents buy keys at `mycosoft.com/agent` via Stripe or crypto.
2. **Supabase JWT cookie** — browser dashboards on mycosoft.com auto-auth with user JWT. Same scopes table.

**New:** Worldview adds a **context gate** on top of the auth layer:
- `public` scope — read `/v1/health`, `/v1/catalog`, `/v1/bundles`, `/v1/openapi.json`
- `agent` scope — everything in `public` + `/v1/snapshot`, `/v1/query` (subset), `/v1/stream`, most bundles
- `fusarium` scope — everything + Shodan exposure, military_verified, waypoint-verify auto-add
- `ops` scope — everything + admin endpoints (usage reset, key revocation)

Scope enforcement in `lib/worldview/middleware.ts`. Returns `403 insufficient_scope` with the needed scope in the response body so agents know what tier to upgrade to.

---

## 5. Rate limiting + cost metering

Each dataset in the registry declares:
```ts
{
  id: "ais-vessels",
  cost_per_request: 2,        // token-cents (1 token = $0.01)
  rate_weight: 3,             // 1 request burns 3 rate-limit units
  scope: "agent",             // required scope
  cache_ttl_ms: 60_000,       // server-side cache
}
```

**Rate limiting** — token bucket per API key:
- `rate_limit_per_minute`: default 60 (agent tier), 300 (fusarium), 1000 (ops)
- `rate_limit_per_day`: default 10_000
- `rate_weight` from dataset manifest is subtracted from the bucket; a heavy query can cost 10+ units while `/v1/health` costs 0.
- On exceed: `429 Too Many Requests` with `Retry-After` header + current bucket state.

**Cost metering** — per-request cents debit:
- `balance_cents` on `agent_api_keys` row is decremented by `cost_per_request`.
- Cached responses cost **50%** (still non-zero so spamming doesn't incentivize cache-pollution).
- On insufficient balance: `402 Payment Required` with top-up link to `mycosoft.com/agent`.
- Usage events logged to `agent_usage_events` table for billing + analytics.

Both checks sit in `lib/worldview/middleware.ts`, run before the dataset handler ever executes.

---

## 6. Dataset registry — the single source of truth

`lib/worldview/registry.ts` exports a `DATASETS` array. Each entry:

```ts
{
  id: "crep.tx-lines.sub-transmission",
  name: "Sub-Transmission Lines (OSM)",
  category: "infrastructure.power",
  description: "OSM-community-mapped ≤115 kV transmission lines...",
  underlying_routes: ["/api/mindex/proxy/tx_lines", "public/data/crep/transmission-lines-sub-transmission.geojson"],
  response_shape: "geojson.FeatureCollection",
  supports: { bbox: true, cursor: true, time_range: false, stream: false },
  scope: "agent",
  cost_per_request: 3,
  rate_weight: 5,
  cache_ttl_ms: 24 * 60 * 60 * 1000,
  handler: async (params) => { /* thin wrapper around the underlying route */ },
}
```

Initial registry covers ~60 datasets across 10 categories:
- **infrastructure.power**: tx_lines (major + sub), substations, power_plants, pipelines, data_centers
- **infrastructure.comms**: cell_towers, am_fm_antennas, submarine_cables, submarine_cable_landings
- **infrastructure.transport**: ports, railways, roads, border_crossings
- **infrastructure.defense**: military_bases, sdtj_military, myca_verified_entities
- **live.aviation**: flightradar24, opensky, helicopters
- **live.maritime**: aisstream, vessels, ports_live
- **live.space**: satellites, orbital_objects, iss_track
- **live.environmental**: buoys, earthquakes, wildfires_firms, nws_alerts, space_weather
- **sensors.airquality**: airnow_current, airnow_bbox, openaq, sdapcd_h2s
- **sensors.water**: noaa_coops_tides, cdip_buoys, tjnerr_sondes
- **sensors.biodiversity**: inaturalist, gbif, ebird
- **cameras**: eagle_sources, caltrans, surfline, hpwren, alertcalifornia, earthcam
- **mindex.knowledge**: species, compounds, genomes, taxa, phylogeny, smells
- **mindex.telemetry**: mycobrain_devices, telemetry_latest, samples
- **projects.oyster**: plume, emit_detections, tijuana_estuary, cross_border_air
- **projects.goffs**: mojave_wilderness, climate_stations, inat_goffs
- **security.shodan**: (fusarium-only) shodan_search, shodan_host, shodan_exposure_layer
- **natureos**: global_events, intel_reports, biodiversity_analytics, mycelium_network

Every entry above gets a handler shim that wraps the existing route. **No existing route is deleted** — Worldview just adds a unified layer on top.

---

## 7. Bundles — pre-composed dataset groups

Agents usually want a correlated set of datasets (e.g. "give me everything about Tijuana right now"). Bundles are declarative compositions:

```ts
{
  id: "tijuana-situational",
  name: "Tijuana Situational Awareness",
  description: "Cross-border oyster plume + H2S + cameras + weather + AQI for TJ estuary",
  datasets: [
    "crep.projects.oyster.plume",
    "crep.sensors.airquality.sdapcd-h2s",
    "crep.cameras.caltrans-d11",
    "crep.infra.tx-lines.sub-transmission",
    "crep.live.environmental.nws-alerts",
    "crep.sensors.airquality.airnow-current",
  ],
  default_params: { bbox: [-117.35, 32.40, -116.85, 32.72] },
  cost_per_request: 12,   // discounted vs sum of individual costs
  rate_weight: 20,
  scope: "agent",
  cache_ttl_ms: 5 * 60_000,
}
```

Initial bundles:

| Bundle ID | What it returns | Scope | Cost |
|-----------|-----------------|-------|------|
| `situational.tijuana` | Oyster plume + H2S + cams + AQI + NWS | agent | 12 |
| `situational.san-diego-county` | SDTJ coverage + live entities + weather | agent | 15 |
| `situational.goffs-mojave` | Mojave preserve + climate + biodiversity | agent | 10 |
| `situational.border-crossings` | CBP POE + Caltrans D11 + wait times | agent | 10 |
| `infrastructure.power-grid-us` | HIFLD + OSM sub-transmission + substations | agent | 18 |
| `live.world-movers` | All aircraft + vessels + satellites snapshot | agent | 20 |
| `environmental.wildfire-watch` | FIRMS + HPWREN cams + NWS + ALERT california | agent | 15 |
| `environmental.space-weather` | Aurora + DONKI + sun-earth correlation | agent | 8 |
| `security.critical-infrastructure` (fusarium) | Shodan + substations + data centers + CVE match | fusarium | 50 |
| `intel.myca-verified` | Recent MYCA-verified entities + SSE channel | agent | 5 |

Bundles are first-class: `GET /v1/bundle/{bundle_id}?bbox=...` returns a single merged response. Agents get structured output without N round-trips.

---

## 8. Response envelope

Every Worldview v1 response uses a uniform envelope so agents write one parser:

```json
{
  "ok": true,
  "request_id": "wx-2026-04-23t03-15-22-8f3a",
  "dataset": "crep.live.aviation.flightradar24",
  "cost_debited": 2,
  "balance_remaining": 9998,
  "rate_limit": {
    "limit_per_minute": 60,
    "remaining_per_minute": 57,
    "reset_at": "2026-04-23T03:16:00Z"
  },
  "cache": "miss",
  "generated_at": "2026-04-23T03:15:22Z",
  "ttl_s": 30,
  "data": { /* the actual payload — GeoJSON FC, JSON array, whatever the dataset declares */ },
  "meta": {
    "count": 2028,
    "source": "flightradar24.com",
    "cursor_next": null
  }
}
```

Error envelope:
```json
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Balance 0 cents, need 3. Top up at https://mycosoft.com/agent",
    "details": { "needed_cents": 3, "balance_cents": 0 }
  },
  "request_id": "wx-..."
}
```

Error codes: `UNAUTHENTICATED`, `INSUFFICIENT_SCOPE`, `INSUFFICIENT_BALANCE`, `RATE_LIMITED`, `DATASET_NOT_FOUND`, `INVALID_PARAMS`, `UPSTREAM_UNREACHABLE`, `TIMEOUT`.

---

## 9. OpenAPI auto-generation

`GET /api/worldview/v1/openapi.json` returns a full OpenAPI 3.1 spec generated from the registry + bundles. Includes:
- All dataset paths with parameter types + example responses
- Auth scheme (bearer token + Stripe top-up link)
- Cost table per endpoint
- Rate limit metadata in `x-rate-limit-*` extensions
- Scope requirements in `x-required-scope`

Agents can feed this spec straight into LangChain / LlamaIndex / OpenAI function-calling to get first-class tool access to every Mycosoft dataset without hand-writing bindings.

The same spec powers a human-readable docs page at `/docs/worldview` (Swagger UI embed).

---

## 10. Update to `mycosoft.com/agent`

Current `/agent` page buys a $1 connection fee. Update to:

1. **Tier table** — Public / Agent / Fusarium / Ops with monthly prices + rate limits + included credits.
2. **Dataset browser** — reads `/v1/catalog` live so new datasets surface automatically without code changes to the agent page.
3. **Bundle showcase** — live demo pulling `/v1/bundle/situational.tijuana` with the caller's key to show what they'd get.
4. **Usage dashboard** — `/agent/dashboard` reads `/v1/usage` to show balance + today's requests + rate-limit state.
5. **Revised JSON-LD** — `WebAPI` schema with full endpoint list so LLM crawlers can discover.

---

## 11. Caching strategy

Three cache layers:

1. **Browser / agent-side** — `Cache-Control: private, max-age=<ttl_s>` from the envelope. Agents can respect or ignore.
2. **Worldview disk cache** — `var/cache/worldview/<dataset_id>-<param_hash>.json`. Respects each dataset's `cache_ttl_ms`. Stored on the website container's persistent volume (our VM 187 Docker path is persistent per your CLAUDE.md). Hit flags `cache: "hit"` in the envelope.
3. **MINDEX's own cache** — MINDEX already has its own read-through cache. Worldview respects MINDEX's ETag / If-Modified-Since headers.

Cost tier for cached hits is 50% of live cost (never free — prevents cache-pollution spam).

---

## 12. Streaming — SSE channels

`GET /v1/stream/{channel}` opens a Server-Sent Events stream. Channels:
- `live.aircraft` — every 5s, bbox-scoped ADS-B deltas
- `live.vessels` — AIS deltas
- `myca.verified-entities` — re-exposes the existing `/api/myca/entity-feed`
- `sensors.h2s.tjrv` — TJ River Valley H2S real-time
- `alerts.nws` — NWS CAP alerts
- `alerts.shodan` (fusarium) — new critical exposures

Cost: 5 cents per minute of open stream. Rate limit: can hold N streams where N = rate_limit_per_minute / 10. Heartbeat every 15s.

---

## 13. Phasing — shipping plan

| Phase | Scope | Ship window |
|-------|-------|-------------|
| **P0** (this PR) | Plan doc, registry scaffold, envelope, middleware, 5 example datasets, catalog, health, snapshot v1 wrap, agent-page-link update | today |
| **P1** | All 60 registry entries wired as thin shims, full `/v1/query` unified handler, all 10 bundles, OpenAPI spec, updated `/agent` dashboard | next 2-3 days |
| **P2** | SSE streams, `/v1/tile` proxy, Shodan fusarium bundle (pending key), 10+ usage analytics queries, admin `/ops` endpoints | next week |
| **P3** | PersonaPlex voice bridge migrates from ad-hoc fetches to Worldview v1, external partners onboard with keys | ongoing |

---

## 14. Rollout principles

- **Zero-breakage**: every existing route keeps working. Worldview v1 is additive. Old `/api/worldview/snapshot` stays as a public unauthenticated endpoint for dashboards that already consume it.
- **Observable**: every request writes a `usage_event` row. Admin dashboard surfaces top datasets / top callers / error rates.
- **Billable from day one**: we start debiting `balance_cents` immediately so the revenue mechanic works without a second migration.
- **Opt-in scopes**: Fusarium datasets only return to keys flagged with the `fusarium` scope. Same key can be upgraded without re-issuing.
- **Honest UX**: if MINDEX is down, the envelope says so (`cache: "stale"` + `meta.source: "mindex-last-known"`) rather than pretending. We observed MINDEX unreachable during the Apr 22 audit; that failure mode must be surfaced, not hidden.

---

## 15. Risks / open questions

- **MINDEX reachability** — today's biggest hole is `MINDEX_API_URL=localhost:8000` in the web container. Fix that secret before P1 or every Worldview query returns stale/empty data.
- **Memory ceiling on web container** — observed 492 MB. Heavy queries must stream or paginate; no `await fetch` of a 400 MB geojson into memory.
- **Stripe webhook reliability** — `balance_cents` top-ups depend on webhooks. Add a reconciliation job.
- **Scope explosion** — keeping 4 scopes simple. If a new scope is proposed (e.g. "intel", "medical"), reject unless it's justified by multiple datasets.
- **SSE connection limits** — Node.js single-process SSE can hold ~1000 connections before GC pressure. If we exceed that, move the SSE endpoints to a dedicated node or to the MAS repo.
- **Data sovereignty** — Shodan data and some MINDEX entities have US-export restrictions. Scope gates enforce this server-side; gateway logs every access for audit.

---

## 16. Why website repo owns the gateway (recap)

Already covered above, summarized here for the README:

1. Supabase `agent_api_keys` table lives here. Auth is here.
2. Stripe + crypto payment flows live here. Billing is here.
3. `mycosoft.com/agent` page is here. Public surface is here.
4. JWT cookies for mycosoft.com authenticate here. Cross-origin would need CORS gymnastics otherwise.
5. Edge-of-world-net: the website is the public-facing Cloudflare-tunneled container that's already hardened for external traffic. MINDEX + MAS are on internal VMs (.188, .189) that should not be directly exposed.
6. Next.js middleware is a natural fit for per-request token bucket + cost meter.

MINDEX and MAS stay focused on their core responsibilities; Worldview is the layer that composes them into a product.
