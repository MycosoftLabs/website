# CREP User Persona Test: U.S. Army Commander

## Persona Profile

**Role:** U.S. Army Battalion/Brigade Commander  
**Clearance:** SECRET / TOP SECRET  
**Primary Mission:** Ground operations planning, terrain assessment, environmental hazard avoidance  
**Key Requirements:** Terrain analysis, route planning, weather/seismic awareness, biological threat assessment

---

## Use Cases & Requirements

### Primary Use Cases
1. **Terrain Assessment** - Evaluate environmental conditions for ground operations
2. **Route Planning** - Identify environmental hazards affecting movement corridors
3. **Seismic Activity Monitoring** - Track earthquakes that could affect operations
4. **Biological Hazard Assessment** - Monitor fungal/biological threats in operational areas
5. **Weather Impact Analysis** - Assess storm activity affecting operations

---

## Test Scenarios

### TEST 3.1: Operational Area Overview
**Objective:** Get comprehensive view of environmental conditions in operational area
**Steps:**
1. Navigate to CREP dashboard
2. Use map controls to navigate to area of interest
3. View all environmental layers
4. Assess threat density in region

**Expected Result:** Complete environmental picture for operational planning

---

### TEST 3.2: Earthquake Threat Assessment
**Objective:** Identify seismic activity that could affect ground operations
**Steps:**
1. Click EVENTS tab
2. Filter by EARTHQUAKE
3. View earthquake markers on map
4. Click on earthquake for magnitude, depth, location
5. Verify USGS source attribution

**Expected Result:** Seismic data with magnitude and precise location

---

### TEST 3.3: Wildfire Impact Assessment
**Objective:** Assess wildfire threats to movement corridors
**Steps:**
1. Filter events by WILDFIRE
2. View wildfire locations and affected areas
3. Check containment percentages
4. Assess area in acres
5. Identify potential route impacts

**Expected Result:** Wildfire data with area/containment for route planning

---

### TEST 3.4: Storm Tracking
**Objective:** Monitor severe weather affecting operations
**Steps:**
1. Filter events by STORM
2. View storm locations and severity
3. Check storm movement patterns
4. Assess impact on operational timeline

**Expected Result:** Storm data for weather-based planning (MAY BE LIMITED)

---

### TEST 3.5: Biological Threat Zone Assessment
**Objective:** Identify areas with unusual biological activity
**Steps:**
1. Switch to FUNGAL DATA tab
2. View fungal observation density
3. Identify research-grade vs needs-ID observations
4. Click on fungal markers for species info
5. Assess potential biological hazards

**Expected Result:** Biological activity map for hazard assessment

---

### TEST 3.6: Device Sensor Network for Situational Awareness
**Objective:** Leverage MycoBrain sensors for real-time ground data
**Steps:**
1. Locate device markers on map
2. View device telemetry (if available)
3. Check environmental readings from sensors
4. Verify device connectivity

**Expected Result:** Ground-level sensor data from MycoBrain devices

---

### TEST 3.7: Map Navigation and Zoom
**Objective:** Navigate map for detailed area assessment
**Steps:**
1. Use zoom controls (+/-)
2. Pan map to different regions
3. Use "Find my location" feature
4. Reset bearing to north

**Expected Result:** Full map navigation functionality

---

### TEST 3.8: Coordinate-Based Navigation
**Objective:** Navigate to specific grid coordinates
**Steps:**
1. Click on event popup with coordinates
2. Use FLY TO function
3. Verify map centers on coordinates
4. Check surrounding terrain/threats

**Expected Result:** Precise coordinate-based navigation

---

## Test Execution Log

**Test Date:** January 16, 2026 | **Time:** 10:40 AM PST

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 3.1 | Operational Overview | ✅ PASSED | Full environmental picture with layer controls |
| 3.2 | Earthquake Assessment | ✅ PASSED | Earthquake filter works, USGS source verified |
| 3.3 | Wildfire Impact | ✅ PASSED | Area (15,234 acres), containment (35%) displayed |
| 3.4 | Storm Tracking | ⚠️ PARTIAL | Storm layer exists but limited trajectory data |
| 3.5 | Biological Threats | ✅ PASSED | 21,757 fungal observations with species ID |
| 3.6 | Device Sensors | ✅ PASSED | MycoBrain devices visible on map |
| 3.7 | Map Navigation | ✅ PASSED | Zoom, pan, reset bearing all functional |
| 3.8 | Coordinate Navigation | ✅ PASSED | FLY TO navigates to event coordinates |

---

## Identified Gaps & Improvements Needed

| Gap ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| GAP-004 | Storm trajectory/prediction data limited | MEDIUM | OPEN |

---

## Notes

**Test Execution Notes:**
- Seismic and wildfire data excellent for ground operations planning
- Biological threat detection via fungal monitoring operational
- Storm layer toggle works but trajectory predictions would enhance planning
- Map controls suitable for tactical navigation
