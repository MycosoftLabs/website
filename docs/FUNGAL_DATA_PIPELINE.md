# Fungal Data Pipeline Documentation

> **Last Updated**: 2026-01-15  
> **Version**: 2.0.0 - Fungal-First Architecture

## Overview

The Fungal Data Pipeline is the **PRIMARY** data system for the Mycosoft platform. All other data layers (transport, military, pollution) are secondary and exist to provide correlative context for understanding how fungi interact with and affect global systems.

## Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FUNGAL-FIRST DATA HIERARCHY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ╔═══════════════════════════════════════════════════════════════════╗    │
│   ║  PRIMARY: MINDEX Fungal Data + MycoBrain Devices                  ║    │
│   ║  - Always ON by default                                           ║    │
│   ║  - Displayed first on map                                         ║    │
│   ║  - Real-time updates via Redis pub/sub                            ║    │
│   ╚═══════════════════════════════════════════════════════════════════╝    │
│                              │                                              │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  CONTEXT: Environmental Events (earthquakes, storms, wildfires)   │    │
│   │  - ON by default for correlation analysis                         │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│   │  SECONDARY [DEMO]: Transport, Military, Pollution                 │    │
│   │  - OFF by default                                                 │    │
│   │  - One-click toggle for correlation demos                         │    │
│   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sources

### Primary Sources (Always Active)

| Source | Type | Update Frequency | Description |
|--------|------|------------------|-------------|
| **MINDEX** | Local DB | Real-time | Mycosoft's fungal observation database |
| **iNaturalist** | External API | 5 min cache | Global citizen science observations |
| **GBIF** | External API | 5 min cache | Biodiversity occurrence data |
| **MycoBrain** | Device telemetry | Real-time | ESP32-S3 environmental sensors |

### Secondary Sources (Demo/Toggleable)

| Source | Type | Default State | Purpose |
|--------|------|---------------|---------|
| FlightRadar24 | Aviation | OFF | Spore dispersal via air traffic |
| AISstream | Maritime | OFF | Marine fungal transport vectors |
| CelesTrak | Satellites | OFF | Remote sensing correlation |
| USGS/NOAA | Events | ON | Environmental context |

## API Endpoints

### CREP Dashboard Endpoint

```
GET /api/crep/fungal
```

**Purpose**: Primary fungal data for CREP map visualization

**Parameters**:
- `limit` (int): Max observations to return (default: 500)
- `source` (string): Filter by source - "mindex", "inat", "gbif", "all"
- `north`, `south`, `east`, `west` (float): Geographic bounds

**Response**:
```json
{
  "observations": [
    {
      "id": "mindex-12345",
      "species": "Chanterelle",
      "scientificName": "Cantharellus cibarius",
      "latitude": 47.6062,
      "longitude": -122.3321,
      "timestamp": "2026-01-15T10:30:00Z",
      "source": "MINDEX",
      "verified": true,
      "imageUrl": "https://...",
      "hasGps": true,
      "geocodeStatus": "complete"
    }
  ],
  "meta": {
    "total": 500,
    "sources": { "mindex": 200, "iNaturalist": 200, "gbif": 100 },
    "pendingGeocode": 15,
    "timestamp": "2026-01-15T14:30:00Z"
  }
}
```

### Earth Simulator Endpoint

```
GET /api/earth/fungal
```

**Purpose**: GeoJSON data for Google Earth Engine visualization

**Parameters**:
- `limit` (int): Max features (default: 1000)
- `days` (int): Lookback period (default: 30)
- `aggregate` (bool): Grid aggregation for heatmap
- `cellSize` (float): Aggregation cell size in degrees
- `format` (string): "geojson" or "json"

**Response**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.3321, 47.6062]
      },
      "properties": {
        "id": "inat-98765",
        "species": "King Bolete",
        "intensity": 0.85,
        "verified": true
      }
    }
  ],
  "metadata": {
    "total": 1000,
    "timeRange": { "start": "2025-12-15", "end": "2026-01-15" }
  }
}
```

## Geocoding Pipeline

### Purpose

Many MINDEX observations have location names but lack precise GPS coordinates. The geocoding pipeline runs continuously in the background to enrich these observations.

### Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MINDEX DB      │────▶│  Geocoding      │────▶│  Redis Cache    │
│  (has_gps=false)│     │  Service :8107  │     │  (positions)    │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Nominatim/     │     │  CREP Dashboard │
                        │  Photon APIs    │     │  (real-time)    │
                        └─────────────────┘     └─────────────────┘
```

### Configuration

```bash
# Environment variables
REDIS_URL=redis://localhost:6379
MINDEX_API_URL=http://localhost:8001
GEOCODING_CACHE_PATH=./data/geocoding_cache.db
GEOCODING_INTERVAL=300  # seconds between batches
```

### Running the Service

```bash
# Docker
docker-compose up geocoding

# Standalone
python services/geocoding/geocoding_service.py
```

### Geocoding Providers

1. **Nominatim** (Primary)
   - OpenStreetMap-based
   - No API key required
   - Rate limit: 1 request/second

2. **Photon** (Fallback)
   - Komoot-hosted OSM geocoder
   - No API key required
   - Fast responses

### Caching Strategy

| Cache | TTL | Purpose |
|-------|-----|---------|
| Redis | 5 min | Fast entity position lookups |
| SQLite | 30 days | Persistent geocoding results |

## Real-time Updates

### Redis Pub/Sub Channels

| Channel | Purpose |
|---------|---------|
| `crep:fungal:updates` | Newly geocoded observations |
| `mycobrain:telemetry` | Device sensor readings |
| `mindex:observations` | New observation submissions |

### Subscribing to Updates

```typescript
// Frontend example
const redis = new Redis(process.env.REDIS_URL);
redis.subscribe('crep:fungal:updates', (message) => {
  const update = JSON.parse(message);
  addObservationToMap(update);
});
```

## Layer Configuration

### CREP Dashboard Layers

```typescript
// Primary layers (enabled by default)
{ id: "fungi", name: "🍄 Fungal Observations", enabled: true }
{ id: "mycobrain", name: "MycoBrain Devices", enabled: true }
{ id: "sporebase", name: "SporeBase Sensors", enabled: true }

// Context layers (enabled for correlation)
{ id: "earthquakes", name: "Seismic Activity", enabled: true }
{ id: "wildfires", name: "Active Wildfires", enabled: true }
{ id: "storms", name: "Storm Systems", enabled: true }

// Secondary layers (OFF by default - demo toggleable)
{ id: "aviation", name: "[DEMO] Air Traffic", enabled: false }
{ id: "ships", name: "[DEMO] Ships (AIS)", enabled: false }
{ id: "satellites", name: "[DEMO] Satellites", enabled: false }
{ id: "militaryAir", name: "[DEMO] Military Aircraft", enabled: false }
```

## Docker Services

### docker-compose.yml Services

```yaml
services:
  geocoding:
    container_name: mycosoft-geocoding
    ports: ["8107:8107"]
    environment:
      - REDIS_URL=redis://redis:6379
      - MINDEX_API_URL=http://mindex:8001
      - GEOCODING_INTERVAL=300
    volumes:
      - geocoding_data:/app/data
```

## Monitoring

### Health Check

```bash
curl http://localhost:8107/health
```

### Metrics

| Metric | Description |
|--------|-------------|
| `geocoding_processed_total` | Total observations processed |
| `geocoding_success_total` | Successfully geocoded |
| `geocoding_cache_hits` | Cache hit rate |
| `geocoding_errors_total` | Failed geocoding attempts |

## Troubleshooting

### No fungal data on map

1. Check MINDEX API: `curl http://localhost:8001/api/v1/observations?limit=1`
2. Check iNaturalist: `curl "https://api.inaturalist.org/v1/observations?iconic_taxa=Fungi&limit=1"`
3. Verify layer is enabled in CREP dashboard

### Geocoding not working

1. Check service status: `docker logs mycosoft-geocoding`
2. Test Nominatim: `curl "https://nominatim.openstreetmap.org/search?q=Seattle&format=json"`
3. Check cache: `sqlite3 ./data/geocoding_cache.db "SELECT COUNT(*) FROM geocoding_cache;"`

### Slow updates

1. Reduce `GEOCODING_INTERVAL` for faster processing
2. Check Redis connection: `redis-cli ping`
3. Increase rate limits if using paid geocoding APIs

## Related Documentation

- [CREP System](./CREP_SYSTEM.md)
- [MINDEX Guide](./MINDEX_GUIDE.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [MycoBrain Integration](./MYCOBRAIN_GUIDE.md)
