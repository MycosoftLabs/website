# CREP User Persona Test: CIA Agent

## Persona Profile

**Role:** Central Intelligence Agency Field Operative / Intelligence Analyst  
**Clearance:** TOP SECRET / SCI  
**Primary Mission:** Global threat assessment, environmental intelligence gathering, tracking biological/chemical threats  
**Key Requirements:** Real-time situational awareness, secure data access, threat correlation, geographic pattern analysis

---

## Use Cases & Requirements

### Primary Use Cases
1. **Biological Threat Monitoring** - Track unusual fungal blooms that could indicate bioweapon deployment
2. **Environmental Anomaly Detection** - Identify seismic/volcanic activity near adversary facilities
3. **Infrastructure Vulnerability Assessment** - Monitor natural disasters affecting critical infrastructure
4. **Pattern Recognition** - Correlate environmental events with intelligence reports
5. **Geographic Intelligence** - Fly to specific coordinates for area assessment

---

## Test Scenarios

### TEST 1.1: Access Global Situational Awareness Dashboard
**Objective:** Verify CREP loads with full global view and all data layers
**Steps:**
1. Navigate to CREP dashboard
2. Verify "GLOBAL SITUATIONAL AWARENESS" header displays
3. Confirm all status indicators show operational
4. Check LIVE indicator is active

**Expected Result:** Dashboard loads with global map view, all systems operational

---

### TEST 1.2: View Active Environmental Threats
**Objective:** Quickly identify all active threats (earthquakes, volcanoes, wildfires, storms)
**Steps:**
1. Click EVENTS tab in Intel Feed
2. Verify event count displays correctly
3. Check event filters work (ALL, EARTHQUAKE, VOLCANO, WILDFIRE, STORM)
4. Verify events are sorted by severity/recency

**Expected Result:** All environmental events visible with filtering capability

---

### TEST 1.3: Investigate Specific Threat
**Objective:** Get detailed intelligence on a specific environmental event
**Steps:**
1. Click on a wildfire event in the Intel Feed
2. Verify popup shows: coordinates, area affected, containment status
3. Check source attribution (NASA FIRMS, USGS, etc.)
4. Verify "FLY TO" functionality centers map on event
5. Verify external source link works

**Expected Result:** Full threat details with source verification and geolocation

---

### TEST 1.4: Biological Anomaly Detection (Fungal Surveillance)
**Objective:** Monitor unusual fungal activity that could indicate biological threats
**Steps:**
1. Click FUNGAL DATA tab
2. View fungal observation density on map
3. Click on a fungal marker to investigate
4. Check species identification and verification status
5. Verify source (iNaturalist) for citizen science validation

**Expected Result:** Fungal observations visible with species data and source attribution

---

### TEST 1.5: Geographic Coordinate Investigation
**Objective:** Navigate to specific coordinates for area assessment
**Steps:**
1. Open event popup with coordinates
2. Click coordinates or "FLY TO" to navigate
3. Verify map centers on exact location
4. Check surrounding environmental data
5. Assess nearby devices/sensors

**Expected Result:** Precise navigation to coordinates with contextual data

---

### TEST 1.6: Device Network Status Check
**Objective:** Verify MycoBrain sensor network operational status
**Steps:**
1. Check device count in stats panel
2. Locate device markers on map (red Amanita icons)
3. Click on device for status popup
4. Verify device telemetry data available

**Expected Result:** All connected devices visible with status information

---

### TEST 1.7: Multi-Layer Intelligence Overlay
**Objective:** Enable/disable different data layers for focused analysis
**Steps:**
1. Click LYRS tab in right panel
2. Toggle environmental layers (earthquakes, volcanoes, wildfires, storms)
3. Toggle fungal data layer
4. Toggle device layer
5. Verify map updates accordingly

**Expected Result:** Layer controls functional for customized view

---

### TEST 1.8: MINDEX Kingdom Data Access
**Objective:** Access biological intelligence database statistics
**Steps:**
1. View MINDEX KINGDOMS section in right panel
2. Check counts for Fungi, Plants, Birds, Insects, Animals, Marine
3. Click on a kingdom for more details

**Expected Result:** Biological database statistics visible and interactive

---

### TEST 1.9: Real-Time Data Refresh
**Objective:** Verify data is continuously updated
**Steps:**
1. Check LAST UPDATE timestamp in Intel Feed
2. Wait 30-60 seconds
3. Verify timestamp updates
4. Confirm LIVE indicator remains active

**Expected Result:** Continuous data refresh with visible timestamps

---

### TEST 1.10: Mission Panel Review
**Objective:** Review active mission status and objectives
**Steps:**
1. Click MSSN tab in right panel
2. Review active mission details
3. Check progress percentage
4. View targets and alerts counts
5. Review live statistics

**Expected Result:** Mission status clearly displayed with actionable metrics

---

## Test Execution Log

**Test Date:** January 16, 2026 | **Time:** 10:40 AM PST

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Access Dashboard | ✅ PASSED | Header displays "GLOBAL SITUATIONAL AWARENESS", LIVE indicator active |
| 1.2 | View Threats | ✅ PASSED | 198 events, 6 critical, filters working |
| 1.3 | Investigate Threat | ✅ PASSED | Wildfire popup shows area, containment, coords, source |
| 1.4 | Biological Anomaly | ✅ PASSED | 21,757 fungal observations with species data |
| 1.5 | Coordinate Navigation | ✅ PASSED | FLY TO button centers map on coordinates |
| 1.6 | Device Status | ✅ PASSED | 1 device connected, visible on map |
| 1.7 | Layer Controls | ✅ PASSED | 7 natural event layers + 3 device layers |
| 1.8 | MINDEX Data | ✅ PASSED | 6 kingdoms with population counts |
| 1.9 | Real-Time Refresh | ✅ PASSED | LIVE indicator, timestamp updates |
| 1.10 | Mission Panel | ✅ PASSED | 67% progress, 47 targets, 3 alerts |

---

## Identified Gaps & Improvements Needed

| Gap ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| GAP-009 | No coordinate search box for direct navigation | LOW | OPEN |

---

## Notes

**Test Execution Notes:**
- All core intelligence features operational
- Event popups include source attribution (USGS, NASA FIRMS, NOAA)
- Fungal data provides biological anomaly detection capability
- Layer controls allow customized operational view
- Recommend adding coordinate search for precise navigation
