# CREP, NatureOS & Earth Simulator - Comprehensive Test Plan

**Document Version:** 1.0  
**Test Date:** January 15, 2026  
**Tester:** AI Assistant  
**System:** Mycosoft MAS - CREP Dashboard  

---

## 1. TEST SCOPE & OBJECTIVES

### 1.1 Primary Objectives
- Verify all UI/UX components function as intended
- Validate all data layers display accurate, real-time information
- Confirm all animations, trajectories, and movements work smoothly
- Test all buttons, toggles, and interactive controls
- Verify backend API integration and data flow
- Check memory usage and performance under load
- Validate logging and MINDEX integration
- Test cross-service communication within Mycosoft ecosystem

### 1.2 Priority Order
1. **CREP Dashboard** (Primary) - Common Relevant Environmental Picture
2. **NatureOS Overview** - Earth systems monitoring
3. **Earth Simulator** - 3D globe visualization

---

## 2. CREP DASHBOARD TEST CASES

### 2.1 LAYER CONTROLS - DATA TAB

#### TC-CREP-001: Fungal Observations Layer (AUTO-ENABLED)
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Layer enabled on page load | ✅ Enabled by default | [ ] | Critical - Phase 1 |
| Fungal markers visible on map | Green markers with mushroom icons | [ ] | |
| Marker click shows popup | Species, photo, iNaturalist link | [ ] | |
| Data count in status bar | Shows number of observations | [ ] | |
| Console logs show data loading | "[CREP] Loaded X fungal observations" | [ ] | |

#### TC-CREP-002: Aircraft/Aviation Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Aviation toggle ON | Aircraft markers visible | [ ] | |
| Aviation toggle OFF | Aircraft markers hidden | [ ] | |
| Aircraft marker click | Shows flight details popup | [ ] | |
| Aircraft movement animation | Smooth interpolation based on velocity | [ ] | |
| Aircraft count in status bar | Shows filtered/total count | [ ] | |

#### TC-CREP-003: Flight Trajectories Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Trajectory toggle ON | Lines between airports visible | [ ] | |
| Trajectory toggle OFF | Lines hidden | [ ] | |
| Trajectory line style | Dashed/dotted lines with arrows | [ ] | |
| Color coding | Matches aircraft marker color | [ ] | |

#### TC-CREP-004: Ships/Vessels Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Ships toggle ON | Vessel markers visible | [ ] | |
| Ships toggle OFF | Vessel markers hidden | [ ] | |
| Vessel marker click | Shows ship details popup | [ ] | |
| Vessel movement animation | Smooth interpolation based on SOG | [ ] | |
| Vessel count in status bar | Shows filtered/total count | [ ] | |

#### TC-CREP-005: Ship Trajectories Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Ship routes toggle ON | Lines between ports visible | [ ] | |
| Ship routes toggle OFF | Lines hidden | [ ] | |
| Port markers visible | Origin/destination ports shown | [ ] | |

#### TC-CREP-006: Satellite Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Satellites toggle ON | Satellite markers visible | [ ] | |
| Satellites toggle OFF | Satellite markers hidden | [ ] | |
| Satellite marker click | Shows orbital details popup | [ ] | |
| Satellite orbit lines | Ground track visualization | [ ] | |
| Satellite count in status bar | Shows filtered/total count | [ ] | |

#### TC-CREP-007: MycoBrain Devices Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Devices toggle ON | Device markers visible | [ ] | |
| Device location accuracy | San Diego 91910 (32.6189, -117.0769) | [ ] | |
| Device marker click | Shows telemetry details | [ ] | |
| Device status indicators | Online/offline status shown | [ ] | |

#### TC-CREP-008: Environmental Events Layer
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Earthquakes visible | Seismic markers on map | [ ] | |
| Wildfires visible | Fire markers on map | [ ] | |
| Storms visible | Storm markers on map | [ ] | |
| Volcanoes visible | Volcanic markers on map | [ ] | |
| Lightning visible | Lightning strike markers | [ ] | |
| Event click shows details | Magnitude, location, time | [ ] | |

### 2.2 DATA TAB FILTERS

#### TC-CREP-010: AIR Filter Section
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Airborne filter | Shows only in-flight aircraft | [ ] | |
| Ground filter | Shows only grounded aircraft | [ ] | |
| Commercial filter | Shows commercial flights | [ ] | |
| Military filter | Shows military aircraft | [ ] | |
| Cargo filter | Shows cargo aircraft | [ ] | |
| Private filter | Shows private/GA aircraft | [ ] | |
| Altitude range slider | Filters by altitude | [ ] | |

#### TC-CREP-011: SEA Filter Section
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Cargo filter | Shows cargo vessels | [ ] | |
| Passenger filter | Shows passenger vessels | [ ] | |
| Tanker filter | Shows tankers | [ ] | |
| Tug filter | Shows tugboats | [ ] | |
| Fishing filter | Shows fishing vessels | [ ] | |
| Military filter | Shows military vessels | [ ] | |
| Speed filter | Filters by vessel speed | [ ] | |

#### TC-CREP-012: SAT Filter Section
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Stations filter | Shows space stations | [ ] | |
| Starlink filter | Shows Starlink satellites | [ ] | |
| Weather filter | Shows weather satellites | [ ] | |
| GNSS filter | Shows GPS/GNSS satellites | [ ] | |
| Debris filter | Shows space debris | [ ] | |
| Communications filter | Shows comms satellites | [ ] | |

#### TC-CREP-013: SWX (Space Weather) Section
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| NOAA R-Scale display | Radio blackout scale (R0-R5) | [ ] | |
| NOAA S-Scale display | Solar radiation scale (S0-S5) | [ ] | |
| NOAA G-Scale display | Geomagnetic storm scale (G0-G5) | [ ] | |
| Solar wind speed | km/s display | [ ] | |
| Solar wind density | particles/cm³ display | [ ] | |
| Magnetic field (Bz) | nT display | [ ] | |

### 2.3 UI COMPONENTS

#### TC-CREP-020: Left Panel (Intel Feed)
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Panel toggle button | Slides in/out smoothly | [ ] | |
| Event list scrollable | All events accessible | [ ] | |
| Event click selects | Highlights on map, shows details | [ ] | |
| Event icons correct | Earthquake=pulse, Fire=flame, etc. | [ ] | |
| Event timestamps | Relative time (5 min ago, etc.) | [ ] | |

#### TC-CREP-021: Right Panel (Data Layers)
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Panel toggle button | Slides in/out smoothly | [ ] | |
| LAYERS tab accessible | Layer toggles visible | [ ] | |
| DATA tab accessible | Filter controls visible | [ ] | |
| Panel overlays map | Does not resize map | [ ] | |

#### TC-CREP-022: Status Bar (Top Center)
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Events count | Accurate total | [ ] | |
| Devices count | Accurate total | [ ] | |
| Aircraft count | Shows filtered/total | [ ] | |
| Vessels count | Shows filtered/total | [ ] | |
| Satellites count | Shows filtered/total | [ ] | |
| Fungal count | Shows observation count | [ ] | |
| Active alerts count | Shows urgent items | [ ] | |

#### TC-CREP-023: Map Controls
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Zoom in button | Map zooms in | [ ] | |
| Zoom out button | Map zooms out | [ ] | |
| Reset view button | Returns to default view | [ ] | |
| Theme toggle | Light/dark theme switch | [ ] | |
| Fullscreen toggle | Enters/exits fullscreen | [ ] | |

### 2.4 ANIMATIONS & MOVEMENT

#### TC-CREP-030: Aircraft Movement
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Smooth position interpolation | No jerky movements | [ ] | |
| Heading-based rotation | Aircraft points in travel direction | [ ] | |
| Speed-based movement | Faster planes move more | [ ] | |

#### TC-CREP-031: Vessel Movement
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Smooth position interpolation | No jerky movements | [ ] | |
| Heading-based rotation | Ship points in travel direction | [ ] | |
| Speed-based movement | Faster ships move more | [ ] | |

#### TC-CREP-032: Satellite Movement
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Smooth orbital path | Follows ground track | [ ] | |
| Orbit line visualization | Shows past/future path | [ ] | |
| Position updates | Regular interval updates | [ ] | |

### 2.5 BACKEND & API TESTS

#### TC-CREP-040: API Endpoints
| Endpoint | Expected Response | Status | Notes |
|----------|-------------------|--------|-------|
| /api/oei/eonet | Environmental events JSON | [ ] | |
| /api/oei/flightradar24 | Aircraft data JSON | [ ] | |
| /api/oei/aisstream | Vessel data JSON | [ ] | |
| /api/oei/satellites | Satellite data JSON | [ ] | |
| /api/oei/space-weather | NOAA scales JSON | [ ] | |
| /api/mycobrain/devices | Device list JSON | [ ] | |
| /api/earth-simulator/inaturalist | Fungal observations JSON | [ ] | |

#### TC-CREP-041: Console Logging
| Log Type | Expected Content | Status | Notes |
|----------|------------------|--------|-------|
| Data loading logs | Shows count of loaded items | [ ] | |
| Error handling | Graceful fallback on API failure | [ ] | |
| Performance metrics | Load times logged | [ ] | |

#### TC-CREP-042: Memory & Performance
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Initial page load time | < 3 seconds | [ ] | |
| Memory usage stable | No memory leaks over time | [ ] | |
| Animation frame rate | Smooth 60fps | [ ] | |
| Large dataset handling | 1500+ aircraft without lag | [ ] | |

---

## 3. NATUREOS OVERVIEW TEST CASES

### 3.1 Navigation & Layout
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Page loads correctly | NatureOS overview visible | [ ] | |
| Navigation elements | All links functional | [ ] | |
| Responsive layout | Works on all screen sizes | [ ] | |

### 3.2 Data Displays
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Earth systems data | Weather, geological, biological | [ ] | |
| Real-time updates | Data refreshes periodically | [ ] | |
| Widget interactions | Click/hover behaviors work | [ ] | |

---

## 4. EARTH SIMULATOR TEST CASES

### 4.1 3D Globe Visualization
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Globe renders correctly | 3D Earth visible | [ ] | |
| Rotation controls | Drag to rotate | [ ] | |
| Zoom controls | Scroll to zoom | [ ] | |
| Layer overlays | Data visible on globe | [ ] | |

### 4.2 Data Layers
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Organism layer | Fungal observations on globe | [ ] | |
| Weather layer | Weather data overlay | [ ] | |
| Geospatial layer | Geographic features | [ ] | |

---

## 5. INTEGRATION TESTS

### 5.1 Cross-Service Communication
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| MINDEX logging | All events logged to MINDEX | [ ] | |
| MycoBrain integration | Device data flows correctly | [ ] | |
| iNaturalist integration | Fungal data loads | [ ] | |
| NOAA integration | Space weather data loads | [ ] | |

### 5.2 Data Consistency
| Test Item | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Counts match API responses | UI counts = API data | [ ] | |
| No duplicate entries | Unique IDs only | [ ] | |
| Timestamp accuracy | Times are correct | [ ] | |

---

## 6. TEST EXECUTION LOG

### Session Start: [TIMESTAMP]

| Time | Test ID | Action | Result | Notes |
|------|---------|--------|--------|-------|
| | | | | |

---

## 7. ISSUES FOUND

| Issue ID | Severity | Description | Component | Status |
|----------|----------|-------------|-----------|--------|
| | | | | |

---

## 8. RECOMMENDATIONS

[To be filled after testing]

---

**Document End**
