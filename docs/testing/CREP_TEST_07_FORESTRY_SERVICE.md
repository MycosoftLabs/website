# CREP User Persona Test: U.S. Forest Service Agent

## Persona Profile

**Role:** U.S. Forest Service Fire Management / Conservation Officer  
**Clearance:** UNCLASSIFIED / FOR OFFICIAL USE ONLY  
**Primary Mission:** Wildfire management, forest health monitoring, ecosystem conservation  
**Key Requirements:** Wildfire tracking, fungal disease monitoring, fire weather conditions, resource allocation

---

## Use Cases & Requirements

### Primary Use Cases
1. **Wildfire Monitoring** - Track active wildfires and containment progress
2. **Forest Health Assessment** - Monitor fungal diseases affecting forests
3. **Fire Weather Monitoring** - Track weather conditions affecting fire behavior
4. **Sensor Network Management** - Deploy and monitor environmental sensors
5. **Resource Allocation** - Prioritize firefighting resources based on data

---

## Test Scenarios

### TEST 7.1: Active Wildfire Dashboard
**Objective:** View all active wildfires with detailed information
**Steps:**
1. Navigate to CREP dashboard
2. Filter events by WILDFIRE
3. View all active wildfire markers
4. Check total wildfire count
5. Verify NASA FIRMS data source

**Expected Result:** Comprehensive wildfire monitoring view

---

### TEST 7.2: Wildfire Detail Analysis
**Objective:** Get detailed information on specific wildfire
**Steps:**
1. Click on wildfire event in Intel Feed
2. View area affected (acres)
3. Check containment percentage
4. View coordinates and location
5. Access source data (FIRMS link)

**Expected Result:** Complete wildfire intelligence

---

### TEST 7.3: Fire Severity Prioritization
**Objective:** Prioritize wildfires by severity for resource allocation
**Steps:**
1. View wildfire events in Intel Feed
2. Identify HIGH severity fires
3. Compare area and containment levels
4. Assess proximity to communities
5. Prioritize response resources

**Expected Result:** Clear severity-based prioritization

---

### TEST 7.4: Forest Fungal Disease Monitoring
**Objective:** Monitor fungal activity that could indicate forest disease
**Steps:**
1. Switch to FUNGAL DATA tab
2. View fungal observations in forest areas
3. Identify species that cause tree disease
4. Check observation dates for recent activity
5. Assess disease spread patterns

**Expected Result:** Fungal monitoring for forest health

---

### TEST 7.5: Sensor Network for Fire Detection
**Objective:** Monitor MycoBrain sensors for early fire detection
**Steps:**
1. View device markers in forest areas
2. Check sensor environmental readings
3. Monitor for air quality anomalies (smoke)
4. Verify sensor coverage in fire-prone areas

**Expected Result:** Sensor-based early warning capability

---

### TEST 7.6: Weather Impact on Fire Behavior
**Objective:** Monitor weather conditions affecting fire spread
**Steps:**
1. Filter events by STORM
2. Assess wind conditions from weather data
3. Check humidity/temperature if available
4. Correlate weather with fire activity

**Expected Result:** Fire weather awareness (LIMITED)

---

### TEST 7.7: Geographic Navigation to Fire Sites
**Objective:** Navigate to specific fire locations for field operations
**Steps:**
1. Click on wildfire event
2. Use FLY TO to navigate to fire
3. View terrain around fire
4. Assess access routes
5. Check nearby sensor coverage

**Expected Result:** Precise navigation to fire locations

---

### TEST 7.8: MINDEX Fungal Database Access
**Objective:** Access fungal species database for identification
**Steps:**
1. Click on fungal marker
2. View species identification
3. Check scientific name
4. Verify iNaturalist source
5. Access external database link

**Expected Result:** Species identification and database access

---

### TEST 7.9: Real-Time Fire Updates
**Objective:** Verify continuous wildfire data updates
**Steps:**
1. Check LIVE indicator
2. Monitor wildfire event timestamps
3. Verify containment percentage changes
4. Check for new fire detections

**Expected Result:** Real-time fire data updates

---

### TEST 7.10: Multi-Hazard Assessment
**Objective:** View multiple hazards affecting forest lands
**Steps:**
1. Enable all event layers
2. View wildfires, earthquakes, storms together
3. Assess compound hazard scenarios
4. Check biological threats alongside fire data

**Expected Result:** Multi-hazard awareness view

---

## Test Execution Log

**Test Date:** January 16, 2026 | **Time:** 10:40 AM PST

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 7.1 | Wildfire Dashboard | ✅ PASSED | Multiple wildfires visible, NASA FIRMS source |
| 7.2 | Wildfire Details | ✅ PASSED | 15,234 acres, 35% containment, coordinates |
| 7.3 | Severity Priority | ✅ PASSED | HIGH/MED severity badges, prioritization clear |
| 7.4 | Fungal Disease | ✅ PASSED | 21,757 observations for forest health monitoring |
| 7.5 | Sensor Network | ✅ PASSED | MycoBrain devices for early detection |
| 7.6 | Weather Impact | ⚠️ PARTIAL | Storm layer available, fire weather limited |
| 7.7 | Geographic Navigation | ✅ PASSED | FLY TO navigates to fire sites |
| 7.8 | MINDEX Database | ✅ PASSED | 1.247M fungi in database with links |
| 7.9 | Real-Time Updates | ✅ PASSED | LIVE indicator, timestamp updates |
| 7.10 | Multi-Hazard | ✅ PASSED | All layers combinable for compound assessment |

---

## Identified Gaps & Improvements Needed

| Gap ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| GAP-004 | Fire weather detail (wind, humidity, temp) limited | MEDIUM | OPEN |

---

## Notes

**Test Execution Notes:**
- Wildfire monitoring is comprehensive with NASA FIRMS integration
- Fungal disease monitoring through species tracking provides unique value
- MycoBrain sensors can provide early smoke detection capability
- Real-time updates ensure current operational awareness
- Recommend enhancing fire weather data integration
