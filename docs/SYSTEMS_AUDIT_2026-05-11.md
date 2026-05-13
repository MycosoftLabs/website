# Mycosoft Systems Audit - 2026-05-11

## Executive Status

The public website and WorldView gateway are online, but the full environmental intelligence stack is not yet customer-ready end to end. The site can render production pages and media, and the public WorldView API discovery endpoints pass. The backend data plane needs work before paid WorldView customers should rely on it: MINDEX ingestion/database contents are not proven live, MAS/MYCA is degraded, Earth2 is unreachable from the website, and MycoBrain/MQTT device telemetry is only partially connected.

## Website And Media

- `https://mycosoft.com` route audit covered 190 static/dynamic pages.
- No broken images were reported by the audit.
- No YouTube hero iframes were reported by the audit.
- Heavy video routes remain:
  - `/about`
  - `/defense`
  - `/defense/fusarium`
  - `/defense2`
  - `/devices/mushroom-1`
  - `/natureos/fusarium`
- Many `request_errors` are video `net::ERR_ABORTED` events caused by audit navigation closing while streaming media is still loading. Those are not missing-file failures, but they do mean the audit script should distinguish expected video cancellation from real errors.
- `/natureos/earth-simulator` is the slowest audited route and should be treated as the first frontend performance target.

## WorldView API

Public smoke test against `https://mycosoft.com` passed:

- `/v1/health`
- `/v1/catalog`
- `/v1/bundles`
- `/v1/openapi.json`
- `/v1/usage` correctly returns 401 without key
- `/v1/snapshot` correctly returns 401 without key
- `/v1/query` correctly returns 401 without key

Authed billing/metering tests were not run because no customer `WORLDVIEW_API_KEY` was provided in this audit shell.

Customer-readiness blockers:

- Confirm Supabase migration `20260423_worldview_v1.sql` is applied in production.
- Confirm RPC `worldview_meter_and_limit` exists and really debits usage.
- Run the smoke test with a real test API key.
- Add a paid-plan test key with scoped datasets and rate limits.

## MINDEX And ETL

Direct MINDEX VM probe:

- `http://192.168.0.189:8000/health` returns healthy.
- API-key `/api/mindex/devices` returns an empty dataset.
- API-key `/api/mindex/taxa?limit=2` returns an empty dataset.
- Internal-token protected paths reject requests because the website production environment is missing `MINDEX_INTERNAL_TOKEN` / `INTERNAL_API_SECRET`.

NatureOS stats currently fall back to external iNaturalist authority totals when MINDEX counts are empty. This is useful for display, but it must not be presented as proof that MINDEX is fully filled. The route has been updated to label fallback data as `external_authority` instead of generic `live`.

Required before paid WorldView launch:

- Restore or run all-life MINDEX ETL on the MINDEX VM.
- Verify taxa, observations, external IDs, traits, genomes, synonyms, and spatial indexes have nonzero production counts.
- Add internal service token to website deployment secrets.
- Add ETL job health endpoints and a daily ingestion freshness report.
- Add customer-facing dataset provenance and freshness metadata to WorldView catalog entries.

## NatureOS

Production endpoint probes:

- `/api/natureos/status` returns 200.
- `/api/natureos/summary` returns 200 but reports `available:false` and `NatureOS backend unreachable`.
- `/api/natureos/live-stats` returns 200.
- `/api/natureos/mindex/health` returns 200.
- `/api/natureos/mindex/stats` returns 200 but was slow and mostly reflects external authority fallback data.
- `/api/natureos/devices/mycobrain` previously returned 500 if either MycoBrain or MINDEX failed. It has been patched to return partial source status instead.

Required:

- Connect NatureOS summary to a real backend or remove the duplicate backend dependency.
- Make all NatureOS widgets show provenance: MINDEX DB, external authority, device telemetry, or unavailable.
- Add route-level latency budgets for the map, search, settings, resources, notifications, and device pages.

## MAS And MYCA

Direct MAS VM probe:

- `http://192.168.0.188:8001/health` returns degraded.
- PostgreSQL and Redis are healthy.
- Collectors are not running.
- CREP reports connection failures.
- MYCA status is dormant with zero active agents/thoughts/world updates.

Required:

- Start and supervise MAS collectors.
- Bring CREP backend connectivity online.
- Start MYCA runtime/agents and verify live activity through website APIs.
- Add a single `/api/myca/ready` contract that checks MAS, collectors, memory, registry, and model backend.

## MycoBrain, MDP, MMP, MQTT

Website VM MycoBrain service:

- `http://127.0.0.1:8003/health` is healthy on the production host.
- It reports zero connected devices.

MycoBrain LAN VM:

- `http://192.168.0.196:8003/health` is healthy.
- `/devices` returns an empty device list.

Operator UIs:

- `http://192.168.0.228:8787/` responds.
- `http://192.168.0.123:8787/` responds but is slower.
- `/api/status` and `/api/sensor` return parseable JSON today.
- Recent operator status still records serial JSON parse errors in `lastError`, so firmware/serial framing needs cleanup.

MQTT status:

- `https://mqtt-status.mycosoft.com/` responds with the status page.

Required:

- Define a single MDP/MMP message envelope with newline-delimited JSON framing, sequence IDs, firmware version, checksum, and schema version.
- Fix firmware serial output so malformed JSON can never be emitted as telemetry.
- Bridge Wi-Fi MQTT devices and serial MycoBrain devices into MINDEX with stable device IDs.
- Add a device ingestion service that writes raw messages, parsed telemetry, validation errors, and last-seen status.
- Expose one internal `/api/devices/ready` endpoint for the website and WorldView API.

## Earth Simulator / Earth2

Website `/api/earth2` returns 200 with `available:false` because MAS Earth2 is unreachable.

Direct Earth2 GPU node probes:

- `http://192.168.0.249:8210/health` timed out.
- `http://192.168.0.249:8210/status` timed out.

Required:

- Confirm Earth2 service process/container on the GPU node.
- Add a low-latency health endpoint with GPU, model, cache, and queue status.
- Add map tile/data cache layers so the frontend does not block on live model calls.
- Separate interactive map data loads into progressive layers: cached base state, fresh MINDEX overlays, then GPU simulations.

## VM Infrastructure

Production website VM observations:

- Blue/green containers are healthy.
- PostgreSQL and Redis containers are healthy.
- Ollama container is running but unhealthy and has no models listed.
- Docker daemon memory use is high.
- Swap is full.
- NAS-related systemd mount `mnt-mycosoft-nas.mount` is failed due to a dependency/order cycle.

Required:

- Schedule a maintenance window to restart Docker or the VM after confirming active deployment state.
- Fix the NAS mount unit dependency cycle.
- Keep website media on a deterministic production asset mount, with YouTube only as a deliberate fallback for scale, never as a visible hero iframe.
- Add VM memory and swap alarms.

## Code Changes Made In This Audit

- Production blue/green compose now defaults MAS to `192.168.0.188:8001` instead of container-local `localhost:8001`.
- Production blue/green compose now explicitly passes MINDEX API variables, `INTEGRATIONS_ENABLED`, and MycoBrain service URLs.
- `env.integrationsEnabled` now enables automatically when MINDEX URL/key are configured.
- `/api/mycobrain/devices` now uses the same MycoBrain URL resolver as `/api/mycobrain/health`.
- `/api/natureos/devices/mycobrain` now returns partial source results and warnings instead of failing the whole route.
- MINDEX research proxy now forwards the internal token when configured.
- NatureOS MINDEX stats now distinguish real MINDEX data from external authority fallback data.

## WorldView Customer Launch Plan

1. Apply and verify WorldView Supabase metering migration in production.
2. Create a real test company, paid plan, scoped API key, and metering budget.
3. Restore MINDEX internal token into website production.
4. Run all-life ETL and verify nonzero production counts directly on MINDEX.
5. Add per-dataset freshness and provenance to `/v1/catalog`.
6. Add `/v1/status` with MINDEX, MAS, MYCA, Earth2, and device-ingest readiness.
7. Run authed smoke tests for `/v1/query`, `/v1/snapshot`, `/v1/tile`, `/v1/stream`, `/v1/usage`, and billing limits.
8. Load-test paid routes with cache-on, cache-cold, and concurrent customers.
9. Add incident-safe degraded responses: never mock, always mark source and freshness.
10. Ship customer docs, API examples, and support runbooks.
