# Mycosoft System Architecture

> **Last Updated**: 2026-01-15  
> **Version**: 2.0.0 - Fungal-First Architecture

## Overview

The Mycosoft platform is a **fungal-first** environmental monitoring and visualization system. All data layers prioritize MINDEX fungal observations and MycoBrain device data, with transport and military layers serving as secondary correlation tools.

### Design Philosophy

**Primary Focus**: Fungal observations, mushroom science, mycological research  
**Secondary Context**: Environmental events (earthquakes, storms, wildfires)  
**Tertiary/Demo**: Transport (aviation, maritime), military, pollution - OFF by default, toggleable

## System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MYCOSOFT PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Website   │  │    CREP     │  │  NatureOS   │  │   MINDEX    │   │
│  │  Port 3000  │  │  Dashboard  │  │   Earth Sim │  │  Database   │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │          │
│         └────────────────┼────────────────┼────────────────┘          │
│                          │                │                           │
│  ┌───────────────────────┴────────────────┴───────────────────────┐   │
│  │                         API Layer                               │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  Aviation  │  Maritime  │  Satellite  │  Events  │  MycoBrain   │   │
│  └────────────┴────────────┴─────────────┴──────────┴──────────────┘   │
│                          │                                             │
│  ┌───────────────────────┴───────────────────────────────────────┐    │
│  │                      Redis Cache Layer                         │    │
│  └───────────────────────┬───────────────────────────────────────┘    │
│                          │                                             │
│  ┌───────────────────────┴───────────────────────────────────────┐    │
│  │                    Data Collectors                             │    │
│  ├────────────┬────────────┬─────────────┬──────────┬────────────┤    │
│  │ Aviation   │ Maritime   │ Satellite   │ Events   │ Geocoding  │    │
│  │ Collector  │ Collector  │ Collector   │Collector │ Pipeline   │    │
│  ├────────────┼────────────┼─────────────┼──────────┼────────────┤    │
│  │  SQLite    │  SQLite    │  SQLite     │ SQLite   │  SQLite    │    │
│  │  Cache     │  Cache     │  Cache      │ Cache    │  Cache     │    │
│  └────────────┴────────────┴─────────────┴──────────┴────────────┘    │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    MycoBrain Devices                            │   │
│  │              ESP32-S3 Environmental Sensors                     │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| Website | 3000 | Main Next.js application |
| MINDEX API | 8001 | Fungal database API |
| MycoBrain Service | 8765 | Device management |
| Redis | 6379 | Cache layer |
| PostgreSQL | 5432 | Primary database |

## Data Flow

### Fungal Data Pipeline (PRIMARY)

All fungal data takes precedence over other data layers:

1. **MINDEX Database** stores internal fungal observations
2. **Geocoding Service** continuously enriches observations lacking GPS
3. **iNaturalist & GBIF APIs** provide supplementary global fungal data
4. **Dedicated API Routes** serve consolidated fungal data:
   - `/api/crep/fungal` → CREP Dashboard
   - `/api/earth/fungal` → NatureOS Earth Simulator
5. **Redis Pub/Sub** broadcasts real-time geocoding updates
6. **Frontends** display fungal data as the default/primary layer

```
MINDEX + iNaturalist + GBIF → API Routes → CREP/Earth Sim (Fungal ON by default)
                                ↓
                         Redis Cache (real-time updates)
```

### Real-time OEI Data Collection (SECONDARY)

Transport and environmental event data (OFF by default, toggleable):

1. **Collectors** fetch data from external APIs
2. Data is cached in **SQLite** (local) and **Redis** (fast access)
3. **API routes** serve data to frontend
4. **CREP Dashboard** renders on map (layers OFF by default)
5. **Audit Logger** records all events to MINDEX

### Geocoding Pipeline

1. MINDEX flags observations without GPS
2. **Geocoding Service** fetches these observations continuously
3. Builds query from location fields (location_name, region, country)
4. Calls Nominatim/Photon APIs with retry logic
5. Caches results in Redis + SQLite (30-day TTL)
6. Updates MINDEX with enriched GPS coordinates
7. Publishes `observation_geocoded` event to Redis channel

## Technology Stack

### Frontend
- **Next.js 15** - React framework
- **MapLibre GL** - Map rendering
- **Tailwind CSS** - Styling
- **SWR** - Data fetching
- **Framer Motion** - Animations

### Backend
- **Next.js API Routes** - API endpoints
- **Python/FastAPI** - MycoBrain service
- **Redis** - Caching
- **SQLite** - Local persistence
- **PostgreSQL** - Primary database

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Orchestration
- **GitHub Actions** - CI/CD

## Deployment

### Development

```bash
# Start website
npm run dev

# Start services
docker-compose -f docker-compose.services.yml up -d
```

### Production

```bash
# Build production image
docker build -t mycosoft-website -f Dockerfile.production .

# Deploy all services
docker-compose -f docker-compose.services.yml up -d --build
```

## Monitoring

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Loki** - Log aggregation
- **AlertManager** - Alerting

## Security

- Environment variables for secrets
- Redis password authentication
- HTTPS via reverse proxy
- Rate limiting on public APIs

## API Endpoints

### Fungal Data (Primary)

| Endpoint | Description |
|----------|-------------|
| `/api/crep/fungal` | Aggregated fungal data for CREP map |
| `/api/earth/fungal` | Aggregated fungal data for Earth Simulator |
| `/api/mindex/observations` | Direct MINDEX observation access |

### OEI Data (Secondary)

| Endpoint | Description |
|----------|-------------|
| `/api/crep/aviation` | Aircraft positions from OpenSky |
| `/api/crep/maritime` | Vessel positions from AISstream |
| `/api/crep/satellites` | Satellite TLE data from CelesTrak |
| `/api/crep/events` | Natural events (earthquakes, storms) |

## Related Documentation

- [CREP System](./CREP_SYSTEM.md)
- [NatureOS System](./NATUREOS_SYSTEM.md)
- [MINDEX Guide](./MINDEX_GUIDE.md)
- [MycoBrain Guide](./MYCOBRAIN_GUIDE.md)
- [Fungal Data Pipeline](./FUNGAL_DATA_PIPELINE.md)