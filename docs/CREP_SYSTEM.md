# CREP - Common Relevant Environmental Picture

> **Last Updated**: 2026-01-15  
> **Version**: 2.0.0 - Fungal-First Architecture

## Overview

CREP (Common Relevant Environmental Picture) is Mycosoft's real-time environmental awareness dashboard. It is designed as a **fungal-first** visualization system where MINDEX fungal observations and MycoBrain device data are the **primary focus**.

### Fungal-First Design

When users open the CREP dashboard, they see:
1. **Fungal Observations** - Geotagged mushroom sightings from MINDEX/iNaturalist/GBIF
2. **MycoBrain Devices** - Real-time ESP32-S3 environmental sensors
3. **Environmental Events** - Earthquakes, storms, wildfires (context for fungal growth)

Transport layers (aviation, maritime, satellites) and military layers are **OFF by default** and labeled as `[DEMO]` - they can be toggled on for correlation analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CREP Dashboard                            │
│                    (Next.js + MapLibre GL)                       │
├─────────────────────────────────────────────────────────────────┤
│                          API Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Aviation │  │ Maritime │  │Satellite │  │ Global   │        │
│  │   API    │  │   API    │  │   API    │  │ Events   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
┌───────┴─────────────┴─────────────┴─────────────┴───────────────┐
│                         Redis Cache                              │
│              (Fast entity position lookups)                      │
└───────┬─────────────┬─────────────┬─────────────┬───────────────┘
        │             │             │             │
┌───────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
│  Aviation   │ │ Maritime  │ │ Satellite │ │  Events   │
│ Collector   │ │ Collector │ │ Collector │ │ Collector │
│ (OpenSky)   │ │(AISstream)│ │(CelesTrak)│ │ (USGS+)   │
├─────────────┤ ├───────────┤ ├───────────┤ ├───────────┤
│  SQLite     │ │  SQLite   │ │  SQLite   │ │  SQLite   │
│   Cache     │ │   Cache   │ │   Cache   │ │   Cache   │
└─────────────┘ └───────────┘ └───────────┘ └───────────┘
```

## Data Sources

### Aviation
- **OpenSky Network**: Real-time ADS-B data for global aircraft tracking
- **ADS-B Exchange**: Backup source for flight data
- Update interval: 30 seconds
- Coverage: Global

### Maritime
- **AISstream**: WebSocket stream for real-time vessel positions
- **MarineTraffic API**: Backup vessel data
- Update interval: 60 seconds
- Coverage: Global shipping lanes

### Satellites
- **CelesTrak**: TLE data for satellite orbit prediction
- Categories: ISS, Starlink, GPS, Weather, Active satellites
- Update interval: 1 hour
- Uses SGP4 propagation for position estimation

### Global Events
- **USGS Earthquake API**: Real-time seismic events
- **NASA EONET**: Wildfires, volcanic activity, severe storms
- **NWS Alerts**: Weather warnings and advisories
- Update interval: 5 minutes

### Environmental
- **iNaturalist**: Fungal observations and biodiversity data
- **MycoBrain Devices**: Local environmental sensors
- **MINDEX Database**: Historical fungal data

## Layer Controls

### Primary Layers (ON by Default)

| Layer | Description | Default | Category |
|-------|-------------|---------|----------|
| 🍄 Fungal Observations | MINDEX/iNaturalist/GBIF mushroom data | **ON** | PRIMARY |
| MycoBrain Devices | ESP32-S3 environmental sensors | **ON** | PRIMARY |
| SporeBase Sensors | Spore detection network | **ON** | PRIMARY |

### Context Layers (ON for Correlation)

| Layer | Description | Default | Category |
|-------|-------------|---------|----------|
| Seismic Activity | USGS earthquake data | ON | CONTEXT |
| Volcanic Activity | Active eruptions | ON | CONTEXT |
| Wildfires | NASA FIRMS fire detection | ON | CONTEXT |
| Storm Systems | NOAA storm tracking | ON | CONTEXT |

### Secondary Layers (OFF by Default - Demo/Toggleable)

| Layer | Description | Default | Category |
|-------|-------------|---------|----------|
| [DEMO] Air Traffic | FlightRadar24 aircraft | OFF | TRANSPORT |
| [DEMO] Ships (AIS) | AISstream vessel tracking | OFF | TRANSPORT |
| [DEMO] Satellites | CelesTrak orbital data | OFF | TRANSPORT |
| [DEMO] Military Aircraft | Military aviation | OFF | MILITARY |
| [DEMO] Naval Vessels | Military ships | OFF | MILITARY |
| Space Weather | Solar activity | OFF | EVENTS |

## API Endpoints

### Aviation API
```
GET /api/oei/flightradar24
Query params:
  - bounds: lat1,lon1,lat2,lon2
  - limit: number (default: all)
  - altitude_min: meters
  - altitude_max: meters
```

### Maritime API
```
GET /api/oei/aisstream
Query params:
  - bounds: lat1,lon1,lat2,lon2
  - ship_type: cargo|tanker|passenger|etc
  - limit: number
```

### Satellite API
```
GET /api/oei/celestrak
Query params:
  - category: stations|starlink|gps|weather
  - norad_id: specific satellite
```

### Global Events API
```
GET /api/natureos/global-events
Query params:
  - type: earthquake|wildfire|storm|volcanic
  - min_magnitude: number (for earthquakes)
  - hours: number (lookback period)
```

## Performance Optimizations

### Zoom-Based Filtering
Aircraft markers are dynamically filtered based on zoom level:
- Zoom < 3: 50 aircraft max
- Zoom 3-4: 150 aircraft max
- Zoom 4-5: 400 aircraft max
- Zoom 5-6: 800 aircraft max
- Zoom 6+: All aircraft

### Caching Strategy
1. **Redis Cache**: Fast lookups for entity positions (TTL: 60s for aircraft, 120s for vessels)
2. **SQLite Cache**: Local persistence for offline/fallback
3. **Browser Cache**: SWR with 30-second revalidation

### Data Compression
- GeoJSON responses are gzipped
- Trajectory paths use coordinate simplification
- Large datasets use pagination

## Docker Deployment

```bash
# Start all CREP services
docker-compose -f docker-compose.services.yml up -d

# View logs
docker-compose -f docker-compose.services.yml logs -f

# Stop services
docker-compose -f docker-compose.services.yml down
```

## Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# API Keys (optional - enhances data quality)
AISSTREAM_API_KEY=your_key_here
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password

# MINDEX Integration
MINDEX_API_URL=http://localhost:8001
```

## Troubleshooting

### No aircraft showing
1. Check OpenSky API rate limits (anonymous: 100/day)
2. Verify Redis is running: `docker ps | grep redis`
3. Check collector logs: `docker logs mycosoft-aviation-collector`

### No vessels showing
1. AISstream requires API key for full data
2. Fallback sample data should still display
3. Check maritime collector status

### Events not updating
1. Verify network connectivity to USGS/NASA
2. Check event cache TTL (default: 60s)
3. Review browser console for errors

## Related Documentation

- [MINDEX Integration](./MINDEX_INTEGRATION.md)
- [MycoBrain Devices](./MYCOBRAIN_INTEGRATION.md)
- [NatureOS System](./NATUREOS_SYSTEM.md)
