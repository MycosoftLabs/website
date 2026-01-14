# NatureOS Live Stats Dashboard - Changelog

## Version 1.0.0 - January 14, 2026

### Overview
Complete overhaul of the NatureOS dashboard to display **real-time, live-updating fungal biodiversity statistics** with animated rolling numbers and scrolling data source marquees.

---

## Features Implemented

### 1. Rolling Number Display (`@fecapark/number-rolling`)
- Integrated the `@fecapark/number-rolling` library for smooth, animated number transitions
- Full numbers displayed (no abbreviations like M, B) - shows exact counts
- Color-coded by metric type:
  - **Green** - Fungal Species
  - **Blue** - Fungal Observations  
  - **Purple** - Fungal Images
  - **Cyan** - Live Devices
- Delta indicators showing hourly change rates (+X/hr)

### 2. Data Source Marquee (News Ticker)
- Horizontal scrolling ticker displaying data sources
- Continuous infinite loop animation
- Shows for each source:
  - Status indicator (green dot = online, yellow = syncing)
  - Source name (GBIF Fungi, iNat Fungi, MycoBank, etc.)
  - Live count (formatted with K, M, B suffixes)
- Pauses on hover for readability
- Gradient fade edges for smooth visual transition

### 3. Fungi-Only Data (Phase 1)
**IMPORTANT**: Current stats are filtered to show **FUNGI KINGDOM ONLY**

| Metric | Approximate Count | Sources |
|--------|-------------------|---------|
| Fungal Species | ~650,000 | GBIF Fungi, iNat Fungi, MycoBank, Index Fungorum |
| Fungal Observations | ~54,000,000 | GBIF Fungi, iNat Fungi, MushroomObserver |
| Fungal Images | ~38,000,000 | iNat Fungi, GBIF Fungi, MushroomObserver |

### 4. Live Stats API (`/api/natureos/live-stats`)
- Simulates real-time data updates
- Aggregates from multiple sources:
  - **GBIF** (Global Biodiversity Information Facility) - Kingdom: Fungi
  - **iNaturalist** - Iconic Taxa: Fungi
  - **MycoBank** - Fungal nomenclature database
  - **Index Fungorum** - Fungal names database
  - **MushroomObserver** - Citizen science fungi observations
- Returns hourly delta rates for each metric
- Updates every 5 seconds on the dashboard

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `components/widgets/rolling-number.tsx` | Animated rolling number component |
| `components/widgets/data-source-marquee.tsx` | Scrolling news ticker for data sources |
| `app/api/natureos/live-stats/route.ts` | Live statistics API endpoint |
| `app/api/natureos/global-events/route.ts` | Global environmental events API |
| `app/api/natureos/intel-reports/route.ts` | Intelligence reports API |
| `hooks/use-live-stats.ts` | Custom hook for fetching live stats |
| `components/widgets/live-counter.tsx` | Basic live counter (superseded by rolling-number) |

### Modified Files
| File | Changes |
|------|---------|
| `components/dashboard/natureos-dashboard.tsx` | Integrated rolling numbers, marquee, fungi-only labels |
| `components/widgets/situational-awareness.tsx` | Fixed timestamp/location handling |
| `components/widgets/nlm-global-events.tsx` | Added all event types, fixed rendering |
| `components/widgets/myca-terminal.tsx` | Fixed timestamp parsing |
| `components/maps/mycelium-map.tsx` | Fixed Google Maps API key validation |
| `lib/google-maps-loader.ts` | Added API key validation |
| `Dockerfile.container` | Added Google Maps API key as build arg |

---

## Bug Fixes

### Google Maps Not Loading
- **Issue**: Map showed "Loading Map..." with InvalidKeyMapError
- **Fix**: Added validation to check if API key is valid (not placeholder)
- **Fix**: Added default API key to `Dockerfile.container`

### CREP Tab Breaking (React Error #130)
- **Issue**: `Cannot read properties of undefined (reading 'icon')`
- **Fix**: Normalized API response casing (lowercase → uppercase)
- **Fix**: Added fallback for undefined report types
- **Fix**: Expanded event type mappings

### Timestamp Errors (React Error #31)
- **Issue**: `e.getTime is not a function`
- **Fix**: Updated all timestamp handlers to accept `Date | string`
- **Fix**: Convert ISO strings to Date objects before formatting

### Location Object Rendering
- **Issue**: Location objects being rendered directly causing errors
- **Fix**: Transform location objects to strings for display

---

## Phase 2 Roadmap (Upcoming)

### Multi-Kingdom Life Dashboard
Expand dashboard to include all major life kingdoms:

1. **Fungi** (current - full size)
2. **Plants** (50% scale - Plantae kingdom)
3. **Birds** (50% scale - Aves class)
4. **Insects** (50% scale - Insecta class)
5. **Animals** (50% scale - Animalia kingdom)
6. **Maritime** (50% scale - Marine life)
7. **Mammals** (50% scale - Mammalia class)

### Layout Plan
```
┌─────────────────┬─────────────────┬─────────────────┬───────────────┐
│ Fungal Species  │ Fungal Obs      │ Fungal Images   │ Live Devices  │
│ (full size)     │ (full size)     │ (full size)     │               │
├─────────────────┼─────────────────┼─────────────────┤ ┌───────────┐ │
│ Plant Species   │ Plant Obs       │ Plant Images    │ │ All Life  │ │
│ (50%)           │ (50%)           │ (50%)           │ │ Summary   │ │
├─────────────────┼─────────────────┼─────────────────┤ │ Widget    │ │
│ Bird Species    │ Bird Obs        │ Bird Images     │ │           │ │
│ (50%)           │ (50%)           │ (50%)           │ │ - Fungi   │ │
├─────────────────┼─────────────────┼─────────────────┤ │ - Plants  │ │
│ Insect Species  │ Insect Obs      │ Insect Images   │ │ - Birds   │ │
│ (50%)           │ (50%)           │ (50%)           │ │ - Insects │ │
├─────────────────┼─────────────────┼─────────────────┤ │ - Animals │ │
│ Animal Species  │ Animal Obs      │ Animal Images   │ │ - Marine  │ │
│ (50%)           │ (50%)           │ (50%)           │ │ - Mammals │ │
└─────────────────┴─────────────────┴─────────────────┴─┴───────────┴─┘
```

---

## Technical Notes

### Package Dependencies
```json
{
  "@fecapark/number-rolling": "^1.0.0"
}
```

### Environment Variables
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-api-key>
NEXT_PUBLIC_MINDEX_API_BASE_URL=/api/mindex
NEXT_PUBLIC_NATUREOS_API_BASE_URL=/api/natureos
```

### Docker Build
```bash
docker compose -f docker-compose.always-on.yml build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key> \
  mycosoft-website

docker compose -f docker-compose.always-on.yml up -d mycosoft-website
```

---

## Contributors
- Mycosoft Development Team
- AI Assistant (Claude)

## License
Proprietary - Mycosoft Inc.
