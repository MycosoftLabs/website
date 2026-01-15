# CREP Dashboard User Guide

> **Last Updated**: 2026-01-15T14:30:00Z  
> **Version**: 2.0.0

## Overview

The **CREP (Common Relevant Environmental Picture)** dashboard provides real-time situational awareness by aggregating data from multiple sources:

- **Aircraft Tracking** - 1500+ aircraft positions via OpenSky Network
- **Maritime Tracking** - 100+ vessels via AIS data
- **Satellite Tracking** - Active satellites from CelesTrak
- **Space Weather** - Solar activity from NOAA SWPC
- **Natural Events** - Earthquakes, wildfires, storms, lightning
- **Fungal Observations** - MINDEX and iNaturalist data
- **MycoBrain Devices** - Environmental sensors

---

## Accessing the Dashboard

**URL**: `https://mycosoft.com/dashboard/crep`

The dashboard requires authentication. Login with your Mycosoft account.

---

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CREP Dashboard                                           [User] [Settings] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────┐ ┌─────────┐ │
│ │             │ │                                             │ │  LYRS   │ │
│ │  Intel      │ │                                             │ │ ─────── │ │
│ │  Feed       │ │              MapLibre GL Map                │ │ □ Planes│ │
│ │             │ │                                             │ │ □ Ships │ │
│ │  83 Events  │ │         (Aircraft, Vessels, Events)         │ │ □ Sats  │ │
│ │             │ │                                             │ │ □ Events│ │
│ │  Lightning  │ │                                             │ │ □ Fungi │ │
│ │  Earthquakes│ │                                             │ │ □ Devices│ │
│ │  Storms     │ │                                             │ │         │ │
│ │             │ │                                             │ │         │ │
│ └─────────────┘ └─────────────────────────────────────────────┘ └─────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  Status: 1499 Aircraft | 43 Ships | 82 Events | 1 MycoBrain Connected  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Controls

Toggle layers using the **LYRS** panel on the right:

| Layer | Description | Data Source |
|-------|-------------|-------------|
| ✈️ Aircraft | Active flights | OpenSky Network |
| 🚢 Ships | Maritime vessels | AISstream |
| 🛰️ Satellites | Orbital objects | CelesTrak |
| 🌩️ Events | Natural events | USGS, NASA EONET |
| 🍄 Fungi | Observations | MINDEX, iNaturalist |
| 📡 Devices | MycoBrain sensors | Local network |

### Zoom-Based Filtering

Aircraft markers automatically reduce at lower zoom levels to prevent overwhelming the map:
- Zoom < 3: Max 200 aircraft
- Zoom 3-5: Max 500 aircraft
- Zoom 5-7: Max 1000 aircraft
- Zoom > 7: All aircraft

---

## Marker Interactions

### Aircraft Marker
Click on an aircraft (pink dot) to see:
- Callsign & ICAO24
- Altitude & Speed
- Origin → Destination
- Aircraft type
- Trajectory line (if enabled)

### Vessel Marker
Click on a ship (yellow icon) to see:
- Vessel name & MMSI
- Type (cargo, tanker, passenger)
- Speed & Heading
- Destination port
- Route line

### Event Marker
Click on an event (varies by type) to see:
- Event type & severity
- Location
- Timestamp
- Source details

---

## Intel Feed

The left panel shows a real-time feed of:
- Recent earthquakes (magnitude, location)
- Active wildfires
- Severe weather alerts
- Lightning strikes (count per region)
- Animal migrations
- Fungal blooms

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Refresh all data |
| `L` | Toggle layer panel |
| `F` | Toggle fullscreen |
| `+/-` | Zoom in/out |
| `Esc` | Close popups |

---

## Data Update Intervals

| Data Type | Interval | Source |
|-----------|----------|--------|
| Aircraft | 30 sec | OpenSky |
| Vessels | 60 sec | AISstream |
| Satellites | 5 min | CelesTrak |
| Space Weather | 5 min | NOAA SWPC |
| Events | 60 sec | Multiple |
| Devices | Real-time | WebSocket |

---

## Troubleshooting

### No Data Showing
1. Check internet connection
2. Verify layer is enabled
3. Check browser console for errors
4. Try refreshing the page

### Slow Performance
1. Disable unused layers
2. Zoom in to reduce marker count
3. Clear browser cache
4. Use Chrome or Firefox (latest)

### Map Not Loading
1. Check if MapLibre GL is supported
2. Verify WebGL is enabled
3. Try a different browser

---

## API Endpoints

For programmatic access:

| Endpoint | Description |
|----------|-------------|
| `GET /api/oei/flightradar24` | Aircraft positions |
| `GET /api/oei/aisstream` | Vessel positions |
| `GET /api/natureos/global-events` | Natural events |
| `GET /api/earth-simulator/inaturalist` | Fungal observations |
| `WS /api/mycobrain/ws` | Device real-time data |

---

## Related Documentation

- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [MycoBrain Integration](./MYCOBRAIN_INTEGRATION_COMPLETE.md)
- [OEI Integration](./OEI_INTEGRATION_TEST_RESULTS_2026-01-15.md)
