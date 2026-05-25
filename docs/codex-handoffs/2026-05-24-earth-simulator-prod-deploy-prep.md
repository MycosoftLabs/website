# Earth Simulator Production Deploy Prep — May 24, 2026

## Date
- 2026-05-24

## Status
- Deployment prep complete (documentation + runbook ready)
- Code deployment not executed in this step

## Scope Documented
- Earth Simulator performance hardening
- MINDEX-first mover runtime path (aircraft, vessels, satellites)
- Widget/map payload consistency (freshness + lineage)
- API resilience/caching improvements in MINDEX proxy
- Error-pressure reductions (notifications polling, proxy devices behavior)

## Implemented Changes (This Work Session)

### 1) Globe refresh FPS stabilization
- Reduced startup rendering pressure by tightening world-view budgets in:
  - `app/dashboard/crep/CREPDashboardClient.tsx`
- Lowered fungal raster decode/upload cost by reducing AM/ECM tile source size in:
  - `components/crep/layers/fungal-atlas-layer.tsx`
- Deferred heavy live layers until deeper zoom to reduce global refresh load:
  - `LiveTransitLayer` and `LiveAqiLayer` mount at higher zoom threshold.

### 2) MINDEX-first runtime for moving assets
- Switched mover live pump reads to MINDEX proxy endpoints:
  - `/api/mindex/proxy/aircraft`
  - `/api/mindex/proxy/vessels`
  - `/api/mindex/proxy/satellites`
- File:
  - `app/dashboard/crep/CREPDashboardClient.tsx`

### 3) Widget/map synchronization contract
- Updated trackers to consume MINDEX-first proxy payloads instead of direct OEI endpoints:
  - `components/crep/flight-tracker-widget.tsx`
  - `components/crep/vessel-tracker-widget.tsx`
  - `components/crep/satellite-tracker-widget.tsx`
- Added/used common payload semantics:
  - `lineage` (source path visibility: live/fallback)
  - `freshness` (timestamp + stale state)

### 4) Proxy resilience, cache, and latency hardening
- File:
  - `app/api/mindex/proxy/[source]/route.ts`
- Added:
  - Input validation and clamping for bounds/limit
  - Short-lived in-memory cache for hot requests
  - Stale-response serving when upstreams fail
  - Response headers for observability (`X-Proxy-Cache`, `X-MINDEX-Source`)
  - Normalized mover payload shaping for consistent client contracts
  - Special-case handling for `source=devices` to avoid repeated 400 behavior

### 5) API pressure reduction for unauthorized sessions
- File:
  - `components/dashboard/top-nav.tsx`
- Notifications polling now auto-pauses on `401/403` to prevent repeated failing requests.

## Production Readiness Notes

### Expected Improvements
- Lower refresh-time frame drops at global view
- Reduced network fan-out and burst load during initial Earth Simulator startup
- More stable mover data path under upstream provider instability
- Cleaner behavior when auth is absent (notifications)
- Cleaner devices proxy behavior in map contexts

### Known Remaining Workstreams (Not part of this deploy-prep step)
- Single motion authority cleanup (remove remaining dual writer paths)
- MINDEX trajectory/history + projection API contract
- Full satellite category UX + density caps verification pass
- Acceptance telemetry suite for smoothness/trajectory behavior

## Clean Deployment Checklist

### Pre-deploy validation
1. Verify local app boots on port `3010`.
2. Confirm Earth Simulator loads without runtime red-box errors.
3. Confirm key endpoints return success:
   - `/api/mindex/proxy/aircraft?limit=10`
   - `/api/mindex/proxy/vessels?limit=10`
   - `/api/mindex/proxy/satellites?limit=10`
   - `/api/mindex/proxy/devices?limit=10000`
4. Confirm refresh behavior:
   - Globe load: no severe FPS collapse
   - Zoom-in: transit/AQI load only at intended zoom threshold
5. Confirm widget metadata:
   - `lineage` present
   - `freshness` present

### Git hygiene before release
1. Stage only intended Earth Simulator/perf/proxy files.
2. Exclude screenshots/artifacts/log files.
3. Ensure no secrets in diff.
4. Commit with deployment-focused message.

### Deploy to Sandbox VM (192.168.0.187)
1. Push branch to GitHub.
2. SSH to VM.
3. Pull latest code.
4. Rebuild website image with no cache.
5. Restart website container with required NAS assets mount.
6. Purge Cloudflare cache (Purge Everything).
7. Verify:
   - `localhost:3010` vs `sandbox.mycosoft.com`
   - Earth Simulator startup + refresh + mover widgets.

## Post-deploy Smoke Test Matrix
- Earth Simulator initial load
- 3 refreshes in a row (watch FPS stability)
- Mover widgets and map sync (IDs/timestamps visually coherent)
- Fungi AM/ECM switching and coverage sanity
- Notification icon behavior when logged out (no repeated error spam)
- Devices proxy route response on production path

## Rollback Plan
1. Revert to previous known-good commit.
2. Rebuild and restart sandbox container.
3. Purge Cloudflare cache.
4. Re-run smoke test matrix.

## Owner Notes
- This document is a deployment-prep record for production hardening actions completed in this session.
- No deployment command was executed as part of this documentation step.
