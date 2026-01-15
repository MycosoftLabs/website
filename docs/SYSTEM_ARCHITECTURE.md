# Mycosoft System Architecture

## Overview

The Mycosoft platform consists of multiple integrated systems for environmental monitoring, data collection, and visualization.

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

### Real-time Data Collection

1. **Collectors** fetch data from external APIs
2. Data is cached in **SQLite** (local) and **Redis** (fast access)
3. **API routes** serve data to frontend
4. **CREP Dashboard** renders on map
5. **Audit Logger** records all events to MINDEX

### Geocoding Pipeline

1. MINDEX flags observations without GPS
2. **Geocoding Service** fetches these observations
3. Builds query from location fields
4. Calls Nominatim/Photon APIs
5. Caches results in Redis + SQLite
6. Updates MINDEX with enriched GPS

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

## Related Documentation

- [CREP System](./CREP_SYSTEM.md)
- [NatureOS System](./NATUREOS_SYSTEM.md)
- [MINDEX Guide](./MINDEX_GUIDE.md)
- [MycoBrain Guide](./MYCOBRAIN_GUIDE.md)
