# NatureOS System Documentation

## Overview

NatureOS is Mycosoft's Earth simulation and environmental monitoring platform. It provides:

- Real-time global event tracking
- Environmental data aggregation
- Weather and climate monitoring
- Biological and geological event detection

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NatureOS Platform                           │
├────────────────┬────────────────┬────────────────┬──────────────┤
│   Earth Sim    │    Weather     │   Biological   │  Geological  │
│    Module      │    Module      │    Module      │   Module     │
└───────┬────────┴───────┬────────┴───────┬────────┴──────┬───────┘
        │                │                │               │
        ▼                ▼                ▼               ▼
┌───────────────────────────────────────────────────────────────┐
│                    Data Integration Layer                      │
├───────────────────────────────────────────────────────────────┤
│  USGS  │  NASA  │  NOAA  │  NWS  │  iNaturalist  │  MINDEX   │
└───────────────────────────────────────────────────────────────┘
```

## Modules

### Earth Simulator

The Earth simulator provides real-time visualization of:

- **Tectonic Activity**: Earthquake monitoring, fault lines
- **Volcanic Events**: Active eruptions, warnings
- **Weather Systems**: Storms, hurricanes, pressure systems
- **Ocean Currents**: Temperature, salinity, currents
- **Magnetic Field**: Geomagnetic activity

### Weather Module

Data sources:
- **NOAA SWPC**: Space weather, solar activity
- **NWS**: National Weather Service alerts
- **OpenWeatherMap**: Current conditions, forecasts

### Biological Module

Tracks biological events:
- **Fungal Blooms**: Mushroom fruiting events
- **Animal Migrations**: Bird, mammal, marine migrations
- **Algal Blooms**: Ocean and freshwater events
- **Disease Outbreaks**: Environmental health alerts

### Geological Module

Monitors geological activity:
- **Earthquakes**: Real-time seismic events from USGS
- **Volcanic Activity**: NASA EONET volcanic events
- **Landslides**: Slope stability events
- **Tsunamis**: Pacific Tsunami Warning Center

## API Endpoints

### Global Events

```typescript
GET /api/natureos/global-events

Response:
{
  events: [
    {
      id: string,
      type: "earthquake" | "wildfire" | "volcanic" | "storm" | "lightning" | "fungal_bloom" | "migration",
      title: string,
      description: string,
      latitude: number,
      longitude: number,
      severity: "info" | "warning" | "critical",
      magnitude?: number,
      timestamp: string,
      source: string,
      metadata: object
    }
  ],
  meta: {
    total: number,
    sources: string[],
    cached: boolean,
    timestamp: string
  }
}
```

### Earthquakes

```typescript
GET /api/natureos/earthquakes
Query params:
  - min_magnitude: number (default: 2.5)
  - hours: number (default: 24)
  - bounds: lat1,lon1,lat2,lon2

Response:
{
  earthquakes: [
    {
      id: string,
      magnitude: number,
      depth: number,
      latitude: number,
      longitude: number,
      place: string,
      time: string,
      url: string,
      felt: number,
      tsunami: boolean
    }
  ]
}
```

### Space Weather

```typescript
GET /api/natureos/space-weather

Response:
{
  solar: {
    kp_index: number,
    solar_wind_speed: number,
    solar_wind_density: number,
    bz: number,
    bt: number
  },
  alerts: [
    {
      type: string,
      severity: string,
      message: string,
      issued_at: string
    }
  ],
  forecast: {
    geomagnetic_storm_probability: number,
    aurora_visibility: string[]
  }
}
```

## Event Types

### Earthquake Events

```json
{
  "type": "earthquake",
  "title": "M 5.2 - 15km NW of Los Angeles, CA",
  "severity": "warning",
  "magnitude": 5.2,
  "depth": 12.5,
  "latitude": 34.1,
  "longitude": -118.5,
  "metadata": {
    "felt": 1250,
    "tsunami": false,
    "alert": "green"
  }
}
```

### Wildfire Events

```json
{
  "type": "wildfire",
  "title": "Active Fire - Sequoia National Forest",
  "severity": "critical",
  "latitude": 36.5,
  "longitude": -118.7,
  "metadata": {
    "acres": 5000,
    "containment": 25,
    "personnel": 500
  }
}
```

### Fungal Bloom Events

```json
{
  "type": "fungal_bloom",
  "title": "Chanterelle Bloom - Pacific Northwest",
  "severity": "info",
  "latitude": 47.6,
  "longitude": -122.3,
  "metadata": {
    "species": "Cantharellus cibarius",
    "observations": 150,
    "peak_expected": "2026-01-20"
  }
}
```

## Data Sources

### USGS Earthquake API

```
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
```

Rate limit: No authentication required, reasonable use expected

### NASA EONET

```
https://eonet.gsfc.nasa.gov/api/v3/events
```

Categories:
- Wildfires (8)
- Volcanoes (12)
- Severe Storms (10)
- Sea and Lake Ice (15)

### NOAA SWPC

```
https://services.swpc.noaa.gov/json/planetary_k_index_1m.json
https://services.swpc.noaa.gov/products/noaa-scales.json
```

## Caching Strategy

```typescript
// Cache TTLs
const CACHE_CONFIG = {
  earthquakes: 60,      // 1 minute
  wildfires: 300,       // 5 minutes
  space_weather: 60,    // 1 minute
  global_events: 60,    // 1 minute
  satellite_passes: 3600 // 1 hour
};
```

## Integration with CREP

NatureOS events are displayed on the CREP dashboard:

```typescript
// Fetch global events
const { data: events } = useSWR(
  '/api/natureos/global-events',
  fetcher,
  { refreshInterval: 30000 }
);

// Render on map
{events?.map(event => (
  <EventMarker key={event.id} event={event} />
))}
```

### Event Marker Styles

| Event Type | Icon | Color |
|------------|------|-------|
| Earthquake | 🌍 | Red (M4+), Orange (M2.5-4), Yellow (M<2.5) |
| Wildfire | 🔥 | Red |
| Volcanic | 🌋 | Orange |
| Storm | ⛈️ | Purple |
| Lightning | ⚡ | Yellow |
| Fungal Bloom | 🍄 | Green |
| Migration | 🦅 | Blue |

## Performance Optimization

### Event Aggregation

Events are aggregated and deduplicated:
1. Merge events from multiple sources
2. Remove duplicates based on location + time
3. Sort by severity (critical first)
4. Limit to 1000 events per request

### Geographic Filtering

Events can be filtered by bounding box:
```typescript
const filteredEvents = events.filter(e => 
  e.latitude >= bounds.south &&
  e.latitude <= bounds.north &&
  e.longitude >= bounds.west &&
  e.longitude <= bounds.east
);
```

## Troubleshooting

### No events showing
1. Check network connectivity to USGS/NASA
2. Verify API endpoints are responding
3. Review browser console for errors

### Stale data
1. Check cache TTL settings
2. Force refresh: add `?nocache=1` to request
3. Clear Redis cache: `redis-cli FLUSHDB`

### Missing event types
1. Verify all source APIs are configured
2. Check that event type is enabled in layer settings
3. Review simulated events if real data unavailable

## Related Documentation

- [CREP System](./CREP_SYSTEM.md)
- [MINDEX Integration](./MINDEX_INTEGRATION.md)
- [API Reference](./API_REFERENCE.md)
