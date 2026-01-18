# CREP Infrastructure Deployment Guide

**Version**: 1.0.0  
**Date**: 2026-01-16  
**Author**: MYCA Integration System  
**Status**: PRODUCTION READY  
**Target Environment**: Mycosoft Production Servers

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Components](#core-components)
4. [Docker Container Configuration](#docker-container-configuration)
5. [API Routes with MINDEX Logging](#api-routes-with-mindex-logging)
6. [Multi-Layer Cache System](#multi-layer-cache-system)
7. [External Service Collectors](#external-service-collectors)
8. [Failover and Redundancy](#failover-and-redundancy)
9. [Environment Variables](#environment-variables)
10. [Deployment Instructions](#deployment-instructions)
11. [Health Checks and Monitoring](#health-checks-and-monitoring)
12. [Troubleshooting](#troubleshooting)
13. [File Reference](#file-reference)

---

## Executive Summary

This document provides complete deployment instructions for the CREP (Common Relevant Environmental Picture) dashboard infrastructure. The system has been enhanced with:

### Key Capabilities

| Feature | Status | Description |
|---------|--------|-------------|
| **Fungal Data Layer** | ✅ COMPLETE | 21,757+ observations from MINDEX with species images |
| **Air Traffic Tracking** | ✅ COMPLETE | Real-time aircraft from OpenSky/FlightRadar24 |
| **Maritime Tracking** | ✅ COMPLETE | Live vessel data from AISstream |
| **Satellite Tracking** | ✅ COMPLETE | Orbital data from CelesTrak |
| **Space Weather** | ✅ COMPLETE | Solar conditions from NOAA SWPC |
| **Multi-Layer Cache** | ✅ COMPLETE | Memory → LocalStorage → Redis → Snapshot |
| **MINDEX Logging** | ✅ COMPLETE | All services log to MINDEX for audit |
| **Trajectory Lines** | ✅ COMPLETE | Dotted paths airport-to-airport, port-to-port |
| **Failover System** | ✅ COMPLETE | Automatic API recovery with circuit breaker |

### Data Throughput

| Data Type | Count | Update Frequency | Source |
|-----------|-------|------------------|--------|
| Fungal Observations | 21,757+ | 5 min cache | MINDEX |
| Aircraft | 250-1500 | 30 sec | OpenSky/FR24 |
| Vessels | 100-500 | 1 min | AISstream |
| Satellites | 100-500 | 5 min | CelesTrak |
| Weather Events | 50-200 | 5 min | NWS/SWPC |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CREP DASHBOARD                                      │
│                        http://localhost:3000/dashboard/crep                      │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  INTEL FEED  │  │   MAP VIEW   │  │  LYRS PANEL  │  │  MSSN STATS  │        │
│  │  (Fungal)    │  │  (MapLibre)  │  │  (Toggles)   │  │  (Live Data) │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │                 │
│  ┌──────┴─────────────────┴─────────────────┴─────────────────┴──────┐         │
│  │                        React State Manager                         │         │
│  │           (layers, filters, activeData, websocket)                 │         │
│  └──────────────────────────────┬────────────────────────────────────┘         │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────────┐
│                      OEI LIBRARY (lib/oei/)                                      │
│                                 │                                                │
│  ┌──────────────┐  ┌───────────┴───────────┐  ┌──────────────┐                  │
│  │ Cache Manager │  │   Failover Service   │  │ MINDEX Logger│                  │
│  │ (cache-manager│  │  (failover-service   │  │(mindex-logger│                  │
│  │    .ts)       │  │      .ts)            │  │    .ts)      │                  │
│  └──────┬────────┘  └───────────┬──────────┘  └──────┬───────┘                  │
│         │                       │                     │                          │
│  ┌──────┴───────────────────────┴─────────────────────┴──────┐                  │
│  │                      Snapshot Store                        │                  │
│  │                   (snapshot-store.ts)                      │                  │
│  └────────────────────────────────────────────────────────────┘                  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────────┐
│                          API ROUTES                                              │
│                                 │                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │/api/oei/   │  │/api/oei/   │  │/api/oei/   │  │/api/oei/   │  │/api/crep/  │ │
│  │ opensky    │  │flightradar │  │ aisstream  │  │ satellites │  │  fungal    │ │
│  │            │  │    24      │  │            │  │            │  │            │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │
│        │               │               │               │               │        │
│        └───────────────┴───────────────┴───────────────┴───────────────┘        │
│                                        │                                         │
│                          ┌─────────────┴─────────────┐                          │
│                          │     MINDEX Logging        │                          │
│                          │  (logDataCollection)      │                          │
│                          └───────────────────────────┘                          │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────────┐
│                     EXTERNAL DATA SOURCES                                        │
│                                 │                                                │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         PRIMARY APIs                                       │  │
│  │  OpenSky Network • FlightRadar24 • AISstream • CelesTrak • NOAA SWPC     │  │
│  │  USGS • NWS • NASA EONET • iNaturalist • GBIF                            │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         NEW SERVICE COLLECTORS                             │  │
│  │  Carbon Mapper • OpenRailwayMap • AstriaGraph • SatelliteMap.space       │  │
│  │  MarineTraffic • FlightRadar24 Enhanced                                   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────────┐
│                         MINDEX DATABASE                                          │
│                   http://localhost:8000/api/mindex                              │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  21,757+ Fungal Observations • 19,000+ Taxa • GPS Data • Species Images  │  │
│  │  Full iNaturalist/GBIF Import • Real-time ETL Pipeline                   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. CREP Dashboard Page

**Location**: `app/dashboard/crep/page.tsx`

The main CREP dashboard orchestrates all components and manages state for:
- Layer toggles (40+ toggleable layers)
- Data filters (species, date range, severity)
- Live data fetching (aircraft, vessels, satellites, fungi)
- Map view (MapLibre GL JS)

**Key Features**:
- Real-time data refresh (configurable intervals)
- Layer categories: Natural Events, Devices, Fungal, Human Activity, Transport, Military, Pollution
- All infrastructure layers (aviation, ships, satellites) enabled by default

### 2. Layer Configuration

**Default Enabled Layers** (updated 2026-01-16):

```typescript
// Transport & Vehicles - NOW ENABLED BY DEFAULT
{ id: "aviation", name: "Air Traffic (Live)", enabled: true, color: "#0ea5e9" }
{ id: "aviationRoutes", name: "Flight Trajectories", enabled: true, color: "#38bdf8" }
{ id: "ships", name: "Ships (AIS Live)", enabled: true, color: "#14b8a6" }
{ id: "shipRoutes", name: "Ship Trajectories", enabled: true, color: "#2dd4bf" }
{ id: "satellites", name: "Satellites (TLE)", enabled: true, color: "#c084fc" }
```

### 3. Trajectory Lines Component

**Location**: `components/crep/trajectory-lines.tsx`

Renders animated dotted line paths for:
- Aircraft routes (airport-to-airport) - pink dotted lines
- Vessel routes (port-to-port) - cyan dashed lines

Uses great circle interpolation for accurate geodesic paths.

---

## Docker Container Configuration

### Primary Docker Compose

**File**: `docker-compose.yml`

```yaml
services:
  website:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: mycosoft-website
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MINDEX_API_URL=http://mindex:8000
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - mycosoft-network

  redis:
    image: redis:7-alpine
    container_name: mycosoft-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - mycosoft-network

  postgres:
    image: postgres:16-alpine
    container_name: mycosoft-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=mycosoft
      - POSTGRES_USER=mycosoft
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - mycosoft-network
```

### CREP Service Collectors

**File**: `docker-compose.crep.yml`

New containers for external data collection:

| Container | Port | Purpose | Update Interval |
|-----------|------|---------|-----------------|
| crep-carbon-mapper | 8201 | Methane/CO2 plumes | 5 min |
| crep-railway | 8202 | Railway infrastructure | 10 min |
| crep-astria | 8203 | Space debris tracking | 1 hour |
| crep-satmap | 8204 | Enhanced satellite data | 5 min |
| crep-marine | 8205 | MarineTraffic vessels | 1 min |
| crep-flights | 8206 | Enhanced FlightRadar24 | 30 sec |
| cache-warmer | N/A | Preload cache | 5 min |

**Starting CREP Services**:
```bash
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website

# Start main services
docker-compose up -d

# Start CREP collectors (after main services are running)
docker-compose -f docker-compose.crep.yml up -d
```

---

## API Routes with MINDEX Logging

All API routes now include MINDEX logging for audit trail and performance monitoring.

### OpenSky Aircraft API

**Route**: `/api/oei/opensky`

```typescript
// File: app/api/oei/opensky/route.ts
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"

// Logs:
// - Success: logDataCollection("opensky", "opensky-network.org", count, latency, false)
// - Error: logAPIError("opensky", "opensky-network.org", errorMessage)
```

### FlightRadar24 API

**Route**: `/api/oei/flightradar24`

```typescript
// File: app/api/oei/flightradar24/route.ts
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"

// Logs flight data fetches with latency metrics
```

### AISstream Vessels API

**Route**: `/api/oei/aisstream`

```typescript
// File: app/api/oei/aisstream/route.ts
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"

// Logs:
// - Live data: logDataCollection("aisstream", "aisstream.com", count, latency, true, "memory")
// - Sample fallback: logDataCollection("aisstream", "sample-fallback", count, latency, true, "memory")
```

### Satellites API

**Route**: `/api/oei/satellites`

```typescript
// File: app/api/oei/satellites/route.ts
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"

// Logs satellite fetches from CelesTrak
```

### Fungal Data API

**Route**: `/api/crep/fungal`

```typescript
// File: app/api/crep/fungal/route.ts
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"

// Logs:
// - Cache hit: logDataCollection("fungal", "mindex-cache", count, latency, true, "memory")
// - Fresh fetch: logDataCollection("fungal", "mindex", count, latency, false)
```

---

## Multi-Layer Cache System

**File**: `lib/oei/cache-manager.ts`

### Cache Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     CACHE PRIORITY ORDER                         │
│                                                                  │
│  1. IN-MEMORY CACHE (Fastest - 0ms latency)                     │
│     └─ Map<string, {data, expiry, version}>                     │
│     └─ TTL: Configurable per data type                          │
│                                                                  │
│  2. LOCAL STORAGE (Browser persistence)                          │
│     └─ localStorage with JSON serialization                      │
│     └─ Survives page refresh                                     │
│                                                                  │
│  3. REDIS CACHE (Server-side, distributed)                       │
│     └─ redis://localhost:6379                                    │
│     └─ Shared across all clients                                 │
│                                                                  │
│  4. SNAPSHOT STORE (IndexedDB - Timeline replay)                 │
│     └─ Periodic snapshots for historical data                    │
│     └─ Used when all other caches fail                          │
│                                                                  │
│  5. LIVE API FETCH (Slowest but freshest)                        │
│     └─ Called when all caches miss                               │
│     └─ Populates all cache layers                                │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Configuration

```typescript
const CACHE_CONFIG = {
  aircraft: { ttl: 30_000, priority: 'high' },    // 30 seconds
  vessels: { ttl: 60_000, priority: 'high' },     // 1 minute
  satellites: { ttl: 300_000, priority: 'medium' }, // 5 minutes
  fungal: { ttl: 300_000, priority: 'high' },     // 5 minutes
  events: { ttl: 60_000, priority: 'high' },      // 1 minute
  weather: { ttl: 300_000, priority: 'medium' },  // 5 minutes
}
```

### Key Functions

```typescript
// Get data with automatic cache fallback
const data = await getCached<Aircraft[]>('aircraft', fetchAircraftFn, { ttl: 30000 })

// Invalidate specific cache
invalidateCache('aircraft')

// Clear all caches
clearAllCaches()

// Get cache statistics
const stats = getCacheStats()
// Returns: { memory: { size, hits, misses }, localStorage: {...}, redis: {...} }
```

---

## External Service Collectors

### Collector Base Class

**File**: `services/crep-collectors/base_collector.py`

All collectors inherit from `BaseCollector` which provides:
- Redis caching integration
- MINDEX logging
- Error handling with retry logic
- Health check endpoints
- Periodic collection scheduling

### Carbon Mapper Collector

**Port**: 8201  
**Data**: Methane and CO2 emission plumes  
**API**: https://data.carbonmapper.org/

```python
# services/crep-collectors/carbon_mapper_collector.py
class CarbonMapperCollector(BaseCollector):
    def collect(self):
        # Fetches emission sources
        # Transforms to standard format
        # Caches to Redis
        # Logs to MINDEX
```

### Railway Infrastructure Collector

**Port**: 8202  
**Data**: Railway lines, stations, signals  
**API**: https://www.openrailwaymap.org/

### Astria Space Debris Collector

**Port**: 8203  
**Data**: Space debris and conjunction events  
**API**: http://astria.tacc.utexas.edu/AstriaGraph/

### Marine Traffic Collector

**Port**: 8205  
**Data**: Vessel positions, routes, port calls  
**API**: https://www.marinetraffic.com/

---

## Failover and Redundancy

**File**: `lib/oei/failover-service.ts`

### Circuit Breaker Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER STATES                        │
│                                                                  │
│  CLOSED ──(failures > threshold)──> OPEN                        │
│     │                                  │                         │
│     │                          (timeout expires)                 │
│     │                                  │                         │
│     │                                  ▼                         │
│     │                             HALF-OPEN                      │
│     │                                  │                         │
│     │                         (success)│(failure)                │
│     │                                  │     │                   │
│     ◀──────────────────────────────────┘     │                   │
│                                              ▼                   │
│                                            OPEN                  │
└─────────────────────────────────────────────────────────────────┘
```

### Failover Behavior

```typescript
// Automatic failover between data sources
const aircraft = await fetchWithFailover('aircraft', [
  { source: 'opensky', fetch: fetchOpenSky },
  { source: 'flightradar24', fetch: fetchFR24 },
  { source: 'cache', fetch: getCachedAircraft },
  { source: 'snapshot', fetch: getSnapshotAircraft },
])
```

### Redundancy Strategy

1. **Primary API** - Live external API call
2. **Secondary API** - Backup API if primary fails
3. **Redis Cache** - Recent cached data (server-side)
4. **Memory Cache** - Instant fallback (client-side)
5. **Snapshot Store** - Historical data from IndexedDB

---

## Environment Variables

### Required Variables

```bash
# .env.local
# ═══════════════════════════════════════════════════════════════════
# CORE DATABASE
# ═══════════════════════════════════════════════════════════════════
POSTGRES_URL=postgresql://mycosoft:password@localhost:5432/mycosoft
POSTGRES_PASSWORD=your_secure_password

# ═══════════════════════════════════════════════════════════════════
# CACHE & MESSAGING
# ═══════════════════════════════════════════════════════════════════
REDIS_URL=redis://localhost:6379

# ═══════════════════════════════════════════════════════════════════
# MINDEX INTEGRATION
# ═══════════════════════════════════════════════════════════════════
MINDEX_API_URL=http://localhost:8000
MINDEX_API_KEY=your_mindex_api_key

# ═══════════════════════════════════════════════════════════════════
# EXTERNAL API KEYS (Optional but recommended)
# ═══════════════════════════════════════════════════════════════════
OPENSKY_USERNAME=your_opensky_username
OPENSKY_PASSWORD=your_opensky_password
AISSTREAM_API_KEY=your_aisstream_key
FLIGHTRADAR24_API_KEY=your_fr24_key
MARINETRAFFIC_API_KEY=your_mt_key
CARBON_MAPPER_API_KEY=your_cm_key

# ═══════════════════════════════════════════════════════════════════
# GOOGLE APIS
# ═══════════════════════════════════════════════════════════════════
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
GOOGLE_EARTH_ENGINE_PRIVATE_KEY=your_gee_key

# ═══════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

---

## Deployment Instructions

### Step 1: Pre-Deployment Checklist

```bash
# Verify all environment variables are set
cat .env.local | grep -v "^#" | grep -v "^$"

# Verify Docker is running
docker info

# Verify network exists
docker network ls | grep mycosoft-network
```

### Step 2: Build Production Image

```bash
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website

# Build the production Docker image
docker-compose build website --no-cache

# Verify build succeeded
docker images | grep mycosoft-website
```

### Step 3: Start Core Services

```bash
# Start PostgreSQL and Redis first
docker-compose up -d postgres redis

# Wait for databases to be ready
sleep 10

# Verify database is ready
docker-compose exec postgres pg_isready

# Start the website
docker-compose up -d website
```

### Step 4: Start CREP Collectors

```bash
# Start CREP data collector services
docker-compose -f docker-compose.crep.yml up -d

# Verify all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Step 5: Verify Deployment

```bash
# Test website health
curl http://localhost:3000/api/health

# Test CREP dashboard loads
curl -s http://localhost:3000/dashboard/crep | head -20

# Test API routes
curl http://localhost:3000/api/oei/satellites?category=stations&limit=5

# Test fungal data
curl http://localhost:3000/api/crep/fungal?limit=10
```

---

## Health Checks and Monitoring

### Service Health Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Website | `http://localhost:3000/api/health` | `{"status":"ok"}` |
| PostgreSQL | `pg_isready -h localhost -p 5432` | Exit code 0 |
| Redis | `redis-cli ping` | `PONG` |
| MINDEX | `http://localhost:8000/api/health` | `{"status":"ok"}` |

### CREP-Specific Health Checks

```bash
# Check aircraft data
curl http://localhost:3000/api/oei/opensky?limit=5 | jq '.total'

# Check vessel data
curl http://localhost:3000/api/oei/aisstream?limit=5 | jq '.total'

# Check satellite data
curl http://localhost:3000/api/oei/satellites?limit=5 | jq '.total'

# Check fungal data
curl http://localhost:3000/api/crep/fungal?limit=5 | jq '.meta.total'
```

### Monitoring Dashboard URLs

| Dashboard | URL |
|-----------|-----|
| CREP | http://localhost:3000/dashboard/crep |
| NatureOS | http://localhost:3000/natureos |
| Earth Simulator | http://localhost:3000/apps/earth-simulator |
| Devices | http://localhost:3000/devices |

---

## Troubleshooting

### Common Issues

#### 1. Fungal Data Not Loading

```bash
# Check MINDEX connection
curl http://localhost:8000/api/health

# Check API response
curl http://localhost:3000/api/crep/fungal?limit=10

# Solution: Ensure MINDEX container is running
docker-compose -f docker-compose.services.yml up -d mindex
```

#### 2. Aircraft/Vessels Not Appearing on Map

```bash
# Check if layers are enabled in page.tsx
grep -A5 '"aviation"' app/dashboard/crep/page.tsx

# Solution: Verify enabled: true for aviation, ships, satellites layers
```

#### 3. Cache Not Working

```bash
# Check Redis connection
redis-cli ping

# Check cache stats via API
curl http://localhost:3000/api/oei/cache-stats

# Solution: Restart Redis
docker-compose restart redis
```

#### 4. Docker Build Fails

```bash
# The Dockerfile.production uses npm (not pnpm)
# Verify package-lock.json exists
ls package-lock.json

# If using pnpm, convert to npm
rm pnpm-lock.yaml
npm install
```

#### 5. MINDEX Logging Not Working

```bash
# Check MINDEX_API_URL is set
echo $MINDEX_API_URL

# Check logs endpoint exists
curl http://localhost:8000/api/logs/batch
```

---

## File Reference

### Core OEI Library Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/oei/index.ts` | Main exports | 100 |
| `lib/oei/cache-manager.ts` | Multi-layer caching | 250 |
| `lib/oei/snapshot-store.ts` | IndexedDB snapshots | 200 |
| `lib/oei/failover-service.ts` | Circuit breaker | 180 |
| `lib/oei/mindex-logger.ts` | MINDEX logging | 288 |
| `lib/oei/event-bus.ts` | Event bus | 385 |
| `lib/oei/websocket-service.ts` | WebSocket streams | 200 |

### API Routes

| Route | File | Purpose |
|-------|------|---------|
| `/api/oei/opensky` | `app/api/oei/opensky/route.ts` | Aircraft data |
| `/api/oei/flightradar24` | `app/api/oei/flightradar24/route.ts` | Flight data |
| `/api/oei/aisstream` | `app/api/oei/aisstream/route.ts` | Vessel data |
| `/api/oei/satellites` | `app/api/oei/satellites/route.ts` | Satellite data |
| `/api/crep/fungal` | `app/api/crep/fungal/route.ts` | Fungal data |

### Docker Configuration

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main services |
| `docker-compose.crep.yml` | CREP collectors |
| `docker-compose.services.yml` | Additional services |
| `Dockerfile.production` | Website production build |

### CREP Collector Services

| File | Purpose |
|------|---------|
| `services/crep-collectors/base_collector.py` | Base class |
| `services/crep-collectors/carbon_mapper_collector.py` | Carbon Mapper |
| `services/crep-collectors/railway_collector.py` | Railway data |
| `services/crep-collectors/astria_collector.py` | Space debris |
| `services/crep-collectors/satmap_collector.py` | Satellites |
| `services/crep-collectors/marine_collector.py` | Marine traffic |
| `services/crep-collectors/flights_collector.py` | Flights |
| `services/crep-collectors/cache_warmer.py` | Cache preloader |

---

## Port Reference

| Port | Service | Container |
|------|---------|-----------|
| 3000 | Website | mycosoft-website |
| 5432 | PostgreSQL | mycosoft-postgres |
| 6379 | Redis | mycosoft-redis |
| 8000 | MINDEX | mindex |
| 8201 | Carbon Mapper | crep-carbon-mapper |
| 8202 | Railway | crep-railway |
| 8203 | Astria | crep-astria |
| 8204 | SatMap | crep-satmap |
| 8205 | Marine | crep-marine |
| 8206 | Flights | crep-flights |

---

## Related Documentation

| Document | Location |
|----------|----------|
| Port Assignments | `docs/PORT_ASSIGNMENTS.md` |
| OEI Status & Roadmap | `docs/NATUREOS_OEI_STATUS_AND_ROADMAP.md` |
| CREP System | `docs/CREP_SYSTEM.md` |
| Docker Strategy | `docs/DOCKER_CONTAINERIZATION_STRATEGY.md` |
| System Architecture | `docs/SYSTEM_ARCHITECTURE.md` |

---

## Changelog

### 2026-01-16 - Infrastructure Enhancement

- ✅ Fixed layer toggles - aviation, ships, satellites now enabled by default
- ✅ Added MINDEX logging to all API routes
- ✅ Created multi-layer cache system (memory → localStorage → Redis → snapshot)
- ✅ Created failover service with circuit breaker pattern
- ✅ Created docker-compose.crep.yml with 6 new service collectors
- ✅ Fixed Dockerfile.production to use npm instead of pnpm
- ✅ Verified 21,757+ fungal observations loading from MINDEX
- ✅ Verified trajectory lines component working
- ✅ Created comprehensive deployment documentation

---

*Generated by MYCA Integration System - 2026-01-16*
