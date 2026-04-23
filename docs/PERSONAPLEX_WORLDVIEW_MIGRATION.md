# PersonaPlex → Worldview v1 Migration

**Status:** planning · Apr 23, 2026
**Owner:** Morgan (CEO)
**Target PR (after this one merges):** follow-up on PersonaPlex repo

---

## What changes

PersonaPlex (`ws://localhost:8999/ws/crep/commands`) currently fetches data with hand-crafted URLs scattered across its agent prompts. This creates three problems:

1. **No single source of truth** — every new CREP route the website adds needs a PersonaPlex update.
2. **No auth / billing** — PersonaPlex hits internal endpoints anonymously so its usage doesn't hit the agent-economy.
3. **No retries / envelope / cache awareness** — error handling is inconsistent per call site.

The Worldview v1 SDK (`lib/worldview-client.ts`, shipped in PR #107) solves all three. This doc is the migration plan.

---

## Before / after

### Before (PersonaPlex agent prompt fragment)
```
When the user asks about aircraft, call:
  GET https://mycosoft.com/api/oei/flightradar24?bbox=<bbox>
When the user asks about vessels, call:
  GET https://mycosoft.com/api/oei/aisstream?bbox=<bbox>
When the user asks about H2S, call:
  GET https://mycosoft.com/api/crep/sdapcd/h2s
...
```

### After
```
All world-state data comes from Worldview v1. You have a single tool:
  GET https://mycosoft.com/api/worldview/v1/query?type=<dataset_id>&<params>
The dataset catalog is at /api/worldview/v1/catalog (cache it on load).
Bundles at /api/worldview/v1/bundles.
Full OpenAPI at /api/worldview/v1/openapi.json — ingest it as your tool spec.
Always send `Authorization: Bearer <PERSONAPLEX_API_KEY>`.
```

Agent goes from hardcoded URLs → declarative tool list read from the catalog on boot.

---

## Concrete migration steps

### 1. Provision a service API key for PersonaPlex

On the website:
```sql
INSERT INTO public.agent_profiles (profile_id, balance_cents, ...)
VALUES ('<persona-plex-svc-uuid>', 1_000_000, ...);

-- then through /api/agent/keys
POST /api/agent/keys { action: "create", name: "personaplex-voice-bridge" }
-- returns { raw_key: "mk_..." } — store in PersonaPlex env as PERSONAPLEX_WORLDVIEW_KEY
```

Mark the key's `scopes` to `ARRAY['agent']` (or `['agent','fusarium']` if Shodan-backed bundles are needed).

### 2. Install the client

If PersonaPlex is Node/TS:
```ts
// copy lib/worldview-client.ts into the PersonaPlex repo (zero deps)
import { WorldviewClient } from "./worldview-client"
const wv = new WorldviewClient({ apiKey: process.env.PERSONAPLEX_WORLDVIEW_KEY })
```

If PersonaPlex is Python:
```python
# thin wrapper — mirror the TS SDK API
import os, httpx
BASE = "https://mycosoft.com/api/worldview/v1"
KEY  = os.environ["PERSONAPLEX_WORLDVIEW_KEY"]

async def query(type_: str, **params) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{BASE}/query", params={"type": type_, **params},
                         headers={"Authorization": f"Bearer {KEY}"})
    return r.raise_for_status().json()

async def bundle(bundle_id: str, **params) -> dict:
    ...
```

### 3. Boot-time catalog load

On PersonaPlex startup, fetch `/v1/catalog` + `/v1/bundles` and build the agent's tool table from the manifest. Refresh hourly so new datasets surface automatically.

```ts
const [cat, bun] = await Promise.all([wv.catalog(), wv.listBundles()])
const tools = cat.datasets.map(d => ({
  name: d.id,
  description: `${d.name} — ${d.description} (${d.cost_per_request_cents}¢)`,
  parameters: buildParamsFromSupports(d.supports),
}))
```

### 4. Replace hardcoded fetches

For every existing hardcoded fetch in the PersonaPlex prompt / code, swap to `wv.query(...)` or `wv.bundle(...)`.

Grep pattern to find them:
```
rg -n "api/(oei|crep|mindex|eagle|natureos)/" --type ts --type py
```

### 5. Listen to SSE for live data

Replace polling loops with SSE streams:
```ts
wv.stream("live.aircraft", { bbox: currentViewport })
  .on("data", (ev) => updateMapAircraft(ev.payload))
  .on("error", (e) => logError(e))
```

### 6. Respect budget / rate-limit envelope

When a response has `cost_debited` + `balance_remaining`, surface it to whatever component tracks PersonaPlex ops cost. Tie the "agent is rate-limited" user-facing message to `error.code === "RATE_LIMITED"`.

### 7. Remove internal-fetch allowlist

Once PersonaPlex only hits `/api/worldview/v1/*`, you can tighten the website's internal-fetch allowlist on CF Access so non-gateway routes (`/api/crep/*`, `/api/oei/*`) are no longer reachable from outside the container. Worldview becomes the only public API surface.

---

## Acceptance test

On the PersonaPlex repo, run:
```
node scripts/worldview-migration-dryrun.mjs
```

Which should:
- Fetch catalog + bundles
- Call `wv.query("crep.live.aviation.flightradar24", { bbox: "-118,32,-116,34" })` and confirm a `SuccessEnvelope` with `data.aircraft.length > 0`
- Call `wv.snapshot()` and confirm `data.middleware.mindex.reachable === true`
- Open `wv.stream("live.aircraft", ...)` for 10 seconds and confirm at least one `data` event

If all four pass, cut over production PersonaPlex config to set `PERSONAPLEX_WORLDVIEW_KEY` and remove the old direct-fetch URLs.

---

## Rollback

Keep the old direct-fetch code behind a feature flag (`WORLDVIEW_V1_ENABLED=false`) for the first 72h after cutover. If Worldview has an outage, set the flag to false and PersonaPlex falls back to direct fetches until it's fixed.
