# CREP API Caching Implementation - Feb 18, 2026

## Summary

Implemented in-memory caching across all CREP API routes to prevent overwhelming the development server with excessive external API calls. This provides:

- **Reduced API load**: Single fetch per TTL period instead of fetch-per-request
- **Near-instant responses**: Cached data returned immediately
- **Stale-while-revalidate**: Continue serving stale data while refreshing in background
- **Graceful error handling**: Return empty data with 200 status instead of 500 to prevent dashboard crashes

## Caching Configuration by Route

| Route | TTL | Stale Max | Notes |
|-------|-----|-----------|-------|
| `/api/oei/satellites` | 2 min | 5 min | Long TTL due to slow TLE fetching |
| `/api/oei/flightradar24` | 30 sec | 2 min | Real-time aircraft data |
| `/api/oei/aisstream` | 30 sec | - | Real-time vessel data |
| `/api/oei/space-weather` | 2 min | - | Space conditions update slowly |
| `/api/mycobrain/devices` | 60 sec | - | Local device data |
| `/api/crep/demo/elephant-conservation` | 10 min | - | Conservation data |
| `/api/crep/fungal` | 5 min | - | Already had caching |
| `/api/natureos/global-events` | 1 min | - | Already had caching |

## How It Works

### Cache Structure

```typescript
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 120_000 // 2 minutes
```

### Cache Check Flow

1. Check if `refresh=true` query param forces refresh
2. Check if cache entry exists and is not expired
3. If valid cache, return immediately with `cached: true` flag
4. If stale but within max age, return stale data (stale-while-revalidate)
5. If no cache or too old, fetch fresh data
6. Store new data in cache before returning

### Usage

```typescript
// Force cache refresh
/api/oei/satellites?category=starlink&refresh=true

// Normal request (uses cache)
/api/oei/satellites?category=starlink
```

### Response Fields

All cached routes now include:
- `cached: boolean` - Whether this response came from cache
- `available: boolean` - Whether data was successfully fetched
- `timestamp: string` - When data was fetched

## Error Handling

All routes now return 200 status with graceful fallbacks on error:

```typescript
// Instead of throwing 500 errors:
return NextResponse.json({
  source: "service_name",
  timestamp: new Date().toISOString(),
  total: 0,
  data: [],
  available: false,
  cached: false,
  error: String(error),
})
```

This prevents the dashboard from crashing when a single API fails.

## Files Modified

1. `app/api/oei/satellites/route.ts` - Added 2-minute cache
2. `app/api/oei/flightradar24/route.ts` - Added 30-second cache + graceful errors
3. `app/api/oei/aisstream/route.ts` - Added 30-second cache + graceful errors
4. `app/api/oei/space-weather/route.ts` - Added 2-minute cache + graceful errors
5. `app/api/mycobrain/devices/route.ts` - Added 60-second cache
6. `app/api/crep/demo/elephant-conservation/route.ts` - Added 10-minute cache

## Additional Infrastructure

### Unified API Endpoint (Future)

A unified endpoint at `/api/crep/unified` was also created to aggregate all CREP data into a single call, further reducing frontend load:

- `lib/crep/data-cache.ts` - Centralized caching utility
- `lib/crep/crep-data-service.ts` - Unified data fetching service
- `app/api/crep/unified/route.ts` - Single endpoint for all CREP data
- `hooks/use-crep-data.ts` - React hook for frontend consumption

### Console Logging

All routes now log cache status:
```
[Satellites] Cache HIT for "starlink" (85s remaining)
[Satellites] Cache SET for "starlink" (TTL: 120s)
[FlightRadar24] Cache HIT (25s remaining)
[AISStream] Cache SET (TTL: 30s)
```

## Benefits

1. **Development Server Stability**: No more server crashes from API spam
2. **Faster Page Loads**: Cached responses return in <10ms
3. **Reduced External API Calls**: Respects rate limits on iNaturalist, NOAA, etc.
4. **Graceful Degradation**: Dashboard stays functional even when APIs fail
5. **Easy Debugging**: Console logs show cache behavior

## Recommended Next Steps

1. Refactor `CREPDashboardClient.tsx` to use the `useCREPData` hook
2. Set up cache invalidation for manual refresh buttons
3. Add cache statistics endpoint for monitoring
4. Consider Redis for persistent caching across server restarts
