# CREP Fungal Route Reliability Enhancements

**Date**: March 11, 2026  
**Author**: MYCA  
**Status**: Complete  

## Overview

This document describes reliability enhancements made to the CREP fungal observation data API (`/api/crep/fungal`). The route serves biodiversity data for the CREP dashboard and integrates MINDEX (primary), iNaturalist, and GBIF. The changes ensure graceful degradation, reduce timeouts, and prevent payload limits from breaking the dashboard.

---

## Changes Implemented

### 1. MINDEX API Key Support

- **File**: `app/api/crep/fungal/route.ts`
- **Change**: Added `X-API-Key` header to all MINDEX requests using `process.env.MINDEX_API_KEY` (fallback: `local-dev-key`).
- **Config**: Documented `MINDEX_API_KEY` in `WEBSITE/website/.env.example`:
  - Match the key configured on MINDEX VM (189:8000).
  - Local dev: `MINDEX_API_KEY=dev-local-key` or same as MINDEX VM `API_KEYS`.
  - Production: Use same key as MINDEX VM.

### 2. Graceful Degradation (No 500 on Total Failure)

- **Before**: Unhandled errors could return HTTP 500.
- **After**: Global `try/catch` returns **HTTP 200** with empty `observations` and `meta.error: "Data sources temporarily unavailable"`.
- **Effect**: Dashboard continues to work (empty map) instead of showing a hard error.

### 3. Timeout and Retry for External APIs

- **Function**: `fetchWithRetry(url, options, retries)` for iNaturalist and GBIF.
- **Parameters**:
  - Timeout: 10 seconds per request.
  - Retries: 2 (3 attempts total).
  - Backoff: 500ms × 2^attempt between retries.
- **Effect**: Reduces `ConnectTimeoutError` and transient network failures.

### 4. Cache Size Limit

- **Constant**: `MAX_CACHE_PAYLOAD_BYTES = 1.5 * 1024 * 1024` (1.5 MB).
- **Logic**: Skip caching when serialized payload exceeds 1.5 MB.
- **Effect**: Avoids Next.js ~2MB response limit; large responses are not cached but still returned.

---

## Test Results (Mar 11, 2026)

### Local Test Environment

- **Dev server**: `npm run dev:next-only` on port 3010.
- **MINDEX**: `MINDEX_API_URL=http://${MINDEX_VM_HOST:-localhost}:8000` (VM 189).
- **MINDEX_API_KEY**: Set in `.env.local` (or fallback to `local-dev-key`).

### Test 1: Default Request

```bash
curl -s "http://localhost:3010/api/crep/fungal" | jq '.meta'
```

- **Result**: HTTP 200.
- **Sources**: MINDEX=0, iNaturalist=1807, gbif=423 (fallback used).
- **Total**: 2230 observations.
- **Conclusion**: Graceful fallback works when MINDEX returns 0.

### Test 2: Kingdom Filter

```bash
curl -s "http://localhost:3010/api/crep/fungal?kingdom=Fungi" | jq '.meta'
```

- **Result**: HTTP 200, similar source distribution after kingdom filter.

### Test 3: Cache

- First request: `cached: false`.
- Second request within 5 min: `cached: true`, `cacheAge` set.
- **Conclusion**: Caching behaves as expected.

### MINDEX = 0 (Follow-Up)

During local testing, MINDEX consistently returned 0 observations. Possible causes:

1. **API key**: Missing or invalid `MINDEX_API_KEY` in `.env.local` (401/403).
2. **Reachability**: MINDEX at `${MINDEX_VM_HOST}:8000` not reachable from dev machine.
3. **Data**: No fungal/biodiversity observations in MINDEX database.

**Verification steps**:

- Check `.env.local`: `MINDEX_API_KEY` and `MINDEX_API_URL`.
- Test MINDEX directly: `curl -H "X-API-Key: $MINDEX_API_KEY" "http://${MINDEX_VM_HOST:-localhost}:8000/api/mindex/observations?limit=10"`.
- Inspect MINDEX logs for 401/403 or empty result sets.

---

## Verification Commands

```bash
# Basic health
curl -s "http://localhost:3010/api/crep/fungal?limit=5" | jq '.meta.total, .meta.sources'

# Force cache bypass
curl -s "http://localhost:3010/api/crep/fungal?nocache=true&limit=5" | jq '.meta'

# Force external fallback only
curl -s "http://localhost:3010/api/crep/fungal?fallback=true&limit=5" | jq '.meta'
```

---

## Related Documents

- [CREP Integration Test Plan](./CREP_INTEGRATION_TEST_PLAN_MAR10_2026.md)
- [CREP iNaturalist→MINDEX ETL](../MAS/mycosoft-mas/docs/CREP_INATURALIST_MINDEX_ETL_MAR09_2026.md)
- [External Repo Features Usage & Testing](../MAS/mycosoft-mas/docs/EXTERNAL_REPO_FEATURES_USAGE_AND_TESTING_MAR10_2026.md)
