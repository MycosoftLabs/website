# Mycosoft Platform Integrations

This document describes the integration architecture for connecting the Mycosoft website UI with backend platform services.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mycosoft Website                          │
│                     (Next.js Frontend)                           │
├─────────────────────────────────────────────────────────────────┤
│                    BFF Route Handlers                            │
│              (/app/api/mindex/*, /app/api/myca/*)               │
├─────────────────────────────────────────────────────────────────┤
│                   Integration Layer                              │
│                   (/lib/integrations/*)                          │
└───────────┬─────────────────┬─────────────────┬─────────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
     ┌──────────┐      ┌──────────┐      ┌──────────┐
     │  MINDEX  │      │ NatureOS │      │ MYCA MAS │
     │ (FastAPI)│      │ (Domain) │      │ (Agents) │
     └──────────┘      └──────────┘      └──────────┘
```

### Services

1. **MINDEX** - Canonical data layer (FastAPI)
   - Taxa (fungal taxonomy)
   - Observations (geo/time sightings)
   - Device registry (MycoBRAIN devices)
   - Telemetry (latest + historical)

2. **NatureOS** - Platform/domain orchestration layer
   - Ingestion pipelines
   - Event processing
   - Policy enforcement

3. **MYCA MAS** - Multi-agent orchestration
   - Agent definitions
   - Agent runs/workflows
   - Tool adapters (n8n, Asana, Notion)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MINDEX_API_BASE_URL` | Base URL for MINDEX API | Yes (if enabled) |
| `MINDEX_API_KEY` | Server-only API key for MINDEX | Yes (if enabled) |
| `MYCA_MAS_API_BASE_URL` | Base URL for MYCA MAS API | Yes (if enabled) |
| `MYCA_MAS_API_KEY` | Server-only API key for MYCA MAS | Yes (if enabled) |
| `NATUREOS_API_BASE_URL` | Base URL for NatureOS API | Optional |
| `INTEGRATIONS_ENABLED` | Enable/disable live integrations | Yes |
| `NEXT_PUBLIC_USE_MOCK_DATA` | Force mock data in UI | Optional |

**Security Note:** `MINDEX_API_KEY` and `MYCA_MAS_API_KEY` are server-only. Never prefix with `NEXT_PUBLIC_`.

## BFF Routes

### Health Check
- `GET /api/health` - Combined health status of all services

### MINDEX Endpoints
- `GET /api/mindex/taxa?q={query}` - Search taxa
- `GET /api/mindex/devices` - List devices
- `GET /api/mindex/telemetry/latest` - Latest telemetry
- `GET /api/mindex/observations?q={query}&lat={lat}&lng={lng}` - Search observations

### MYCA MAS Endpoints
- `GET /api/myca/runs` - List agent runs
- `POST /api/myca/runs` - Start new agent run
- `GET /api/myca/runs/{id}` - Get run details

## Type Definitions

All types are defined in `/lib/integrations/types.ts`:

- `Device` - Device registry entry
- `TelemetrySample` - Telemetry data point
- `Taxon` - Fungal taxonomy entry
- `Observation` - Geo/time sighting
- `Agent` - Agent definition
- `AgentRun` - Agent execution record
- `ServiceHealth` - Health check response
- `SystemHealth` - Combined system health

## Error Handling

All BFF routes return consistent error shapes:

```typescript
interface ApiError {
  error: string      // Human-readable message
  code: string       // Machine-readable code
  details?: object   // Optional additional info
}
```

Common error codes:
- `MINDEX_ERROR` - MINDEX API error
- `MYCA_ERROR` - MYCA MAS API error
- `VALIDATION_ERROR` - Input validation failed
- `INTEGRATIONS_DISABLED` - Feature flag is off
- `TIMEOUT` - Request timed out
- `NETWORK_ERROR` - Network connectivity issue

## Adding New Integrations

1. Add types to `/lib/integrations/types.ts`
2. Create integration module in `/lib/integrations/{service}.ts`
3. Export from `/lib/integrations/index.ts`
4. Create BFF route in `/app/api/{service}/route.ts`
5. Add mock data to `/lib/integrations/mock-data.ts`
6. Update this documentation

## Feature Flags

When `INTEGRATIONS_ENABLED=false`:
- All BFF routes return mock data
- UI continues to function with realistic placeholder data
- Health check returns `status: "unknown"` for all services

This allows:
- Local development without backend access
- Graceful degradation if backends are unavailable
- Demo mode for presentations
