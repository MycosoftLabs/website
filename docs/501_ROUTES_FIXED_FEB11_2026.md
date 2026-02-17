# 501 Routes Fixed

**Date**: February 11, 2026
**Author**: stub-implementer agent
**Status**: Complete

## Overview

Fixed 3 API routes that were incorrectly returning HTTP 501 (Not Implemented) status codes. Replaced placeholder logic with real implementations that forward to MINDEX backend or return appropriate error codes.

## Changes Made

### Route 1: WiFiSense POST Control Actions ✅

**File**: `app/api/mindex/wifisense/route.ts`

**Before**: Returned 501 for all control actions with placeholder message.

**After**: 
- Validates action type against whitelist: `set_enabled`, `configure_zone`, `calibrate_device`, `reset_zone`, `update_threshold`
- Forwards control commands to `${MINDEX_API_URL}/wifisense/control` endpoint
- Returns 503 (Service Unavailable) if MINDEX endpoint doesn't exist
- Returns appropriate status codes for other MINDEX errors
- Returns 200 with result on success

**Key Changes**:
```typescript
// Now forwards to MINDEX control endpoint
const controlRes = await fetch(`${MINDEX_API_URL}/wifisense/control`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": env.mindexApiKey || "",
  },
  body: JSON.stringify({ action, ...params }),
  signal: AbortSignal.timeout(15000),
})
```

### Route 2: MINDEX Anchor Records ✅

**File**: `app/api/mindex/anchor/route.ts`

**Before**: Returned 501 when `anchorRecords()` returned `{ ok: false }`.

**After**: 
- Returns 503 (Service Unavailable) when ledger URL is not configured
- Returns 502 (Bad Gateway) when ledger request fails
- Returns 200 (OK) only on success
- No longer uses 501 (route is implemented, just upstream service issues)

**Key Changes**:
```typescript
// Appropriate status code based on error type
const status = result.ok ? 200 : (result.message?.includes("not configured") ? 503 : 502)
return NextResponse.json(result, { status })
```

### Route 3: MINDEX Integrity Verify ✅

**File**: `app/api/mindex/integrity/verify/[id]/route.ts`

**Before**: Returned 501 for all errors in catch block.

**After**: 
- Returns 503 (Service Unavailable) when MINDEX endpoint is unavailable
- Returns 503 (Service Unavailable) for network timeouts
- Returns 422 (Unprocessable Entity) for invalid record format
- Returns 500 (Internal Server Error) for other errors
- No longer uses 501 (verification feature is implemented)

**Key Changes**:
```typescript
// Determine appropriate status code based on error type
let status = 500 // Default to Internal Server Error
let code = "INTEGRITY_VERIFY_FAILED"

if (errorMessage.includes("does not provide")) {
  status = 503
  code = "MINDEX_ENDPOINT_UNAVAILABLE"
}
else if (errorMessage.includes("timeout") || errorMessage.includes("ECONNREFUSED")) {
  status = 503
  code = "MINDEX_UNAVAILABLE"
}
else if (errorMessage.includes("invalid") || errorMessage.includes("malformed")) {
  status = 422
  code = "INVALID_RECORD_FORMAT"
}
```

## HTTP Status Code Usage (Now Correct)

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid request parameters |
| 422 | Unprocessable Entity | Valid request but invalid data format |
| 500 | Internal Server Error | Unexpected error in our code |
| 502 | Bad Gateway | Upstream service (ledger) returned error |
| 503 | Service Unavailable | Upstream service (MINDEX) is unavailable or not configured |
| ~~501~~ | ~~Not Implemented~~ | **No longer used** - all routes are implemented |

## Testing

To verify fixes:

```bash
# Test WiFiSense control (should return 503 or forward to MINDEX)
curl -X POST http://localhost:3010/api/mindex/wifisense \
  -H "Content-Type: application/json" \
  -d '{"action":"set_enabled","enabled":true}'

# Test anchor records (should return 503 or 502, not 501)
curl -X POST http://localhost:3010/api/mindex/anchor \
  -H "Content-Type: application/json" \
  -d '{"record_ids":["rec_123"],"ledger":"hypergraph"}'

# Test integrity verify (should return 503 or 500, not 501)
curl http://localhost:3010/api/mindex/integrity/verify/rec_123
```

## Related Documents

- [WIFISENSE_API_IMPLEMENTATION_FEB12_2026.md](../../WEBSITE/website/docs/WIFISENSE_API_IMPLEMENTATION_FEB12_2026.md)
- [API_CATALOG_FEB04_2026.md](../../MAS/mycosoft-mas/docs/API_CATALOG_FEB04_2026.md)

## Notes

- **NO MOCK DATA** was used in any implementation
- All routes now properly forward to real MINDEX backend or return appropriate service unavailable errors
- HTTP status codes now follow REST API best practices
- 501 is no longer used anywhere in the website codebase (all routes are implemented)
