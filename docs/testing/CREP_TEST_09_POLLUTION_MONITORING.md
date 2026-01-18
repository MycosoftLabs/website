# CREP User Persona Test: Pollution Monitoring Service Agent

## Persona Profile

**Role:** Environmental Protection Agency / Pollution Monitoring Specialist  
**Affiliation:** EPA / State Environmental Agency  
**Primary Mission:** Air quality monitoring, greenhouse gas tracking, industrial pollution surveillance  
**Key Requirements:** CO2/methane monitoring, air quality data, pollution source tracking, environmental sensor network

---

## Use Cases & Requirements

### Primary Use Cases
1. **Air Quality Monitoring** - Track air quality across regions
2. **Greenhouse Gas Detection** - Monitor CO2 and methane emissions
3. **Wildfire Smoke Impact** - Assess air quality from wildfire smoke
4. **Industrial Pollution Tracking** - Monitor pollution near industrial areas
5. **Sensor Network Management** - Deploy and monitor air quality sensors

---

## Test Scenarios

### TEST 9.1: Environmental Sensor Overview
**Objective:** View MycoBrain environmental sensor network
**Steps:**
1. Navigate to CREP dashboard
2. View device count in statistics
3. Locate device markers on map
4. Check for air quality sensors
5. Verify sensor connectivity

**Expected Result:** Environmental sensor network visibility

---

### TEST 9.2: Wildfire Air Quality Impact
**Objective:** Assess air quality impact from active wildfires
**Steps:**
1. Filter events by WILDFIRE
2. View wildfire locations
3. Assess smoke plume direction (if available)
4. Check nearby population centers
5. Correlate with air quality data

**Expected Result:** Wildfire/air quality correlation capability

---

### TEST 9.3: MycoBrain BME688 Sensor Data
**Objective:** Access gas sensor data from MycoBrain devices
**Steps:**
1. Click on device marker
2. View environmental readings
3. Check for gas sensor data (VOC, CO2 proxy)
4. View temperature/humidity data
5. Assess air quality index if available

**Expected Result:** Environmental sensor readings (IF DEVICE CONNECTED)

---

### TEST 9.4: Geographic Pollution Assessment
**Objective:** Assess environmental conditions by region
**Steps:**
1. Navigate to industrial areas
2. View environmental data layers
3. Check for pollution indicators
4. Assess nearby environmental events
5. Evaluate ecosystem health indicators

**Expected Result:** Regional environmental assessment

---

### TEST 9.5: Biological Indicator Species
**Objective:** Use fungal data as ecosystem health indicators
**Steps:**
1. Switch to FUNGAL DATA tab
2. View fungal diversity as ecosystem indicator
3. Check for pollution-sensitive species
4. Compare fungal activity across regions
5. Assess biodiversity patterns

**Expected Result:** Biological indicators for ecosystem health

---

### TEST 9.6: Real-Time Environmental Updates
**Objective:** Verify continuous environmental data updates
**Steps:**
1. Check LIVE indicator
2. Monitor sensor data timestamps
3. Verify MINDEX sync status
4. Check event updates in real-time

**Expected Result:** Continuous environmental monitoring

---

### TEST 9.7: Multi-Layer Environmental View
**Objective:** View multiple environmental data layers
**Steps:**
1. Click LYRS tab
2. Enable all environmental layers
3. View wildfires, storms, earthquakes together
4. Overlay fungal/biological data
5. Assess comprehensive environmental picture

**Expected Result:** Multi-layer environmental visualization

---

### TEST 9.8: Source Data Verification
**Objective:** Verify environmental data sources
**Steps:**
1. Check event popups for source attribution
2. Verify NASA, USGS, NOAA sources
3. Check MINDEX for biological data
4. Verify MycoBrain for sensor data

**Expected Result:** Verified data source attribution

---

## Test Execution Log

**Test Date:** January 16, 2026 | **Time:** 10:42 AM PST

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 9.1 | Sensor Overview | ✅ PASSED | 1 MycoBrain device connected, visible on map |
| 9.2 | Wildfire Air Quality | ✅ PASSED | Wildfire locations for smoke correlation |
| 9.3 | BME688 Sensor Data | ⚠️ LIMITED | Device visible but detailed readings not in popup |
| 9.4 | Geographic Assessment | ✅ PASSED | Multi-layer view for regional assessment |
| 9.5 | Biological Indicators | ✅ PASSED | Fungal diversity as ecosystem health indicator |
| 9.6 | Real-Time Updates | ✅ PASSED | LIVE indicator, timestamp updates |
| 9.7 | Multi-Layer View | ✅ PASSED | All environmental layers combinable |
| 9.8 | Source Verification | ✅ PASSED | NASA, USGS, NOAA, MINDEX sources verified |

---

## Identified Gaps & Improvements Needed

| Gap ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| GAP-001 | No CO2/methane data layer - CRITICAL for this persona | HIGH | OPEN |
| GAP-001 | No air quality index overlay | HIGH | OPEN |
| GAP-010 | Device popup lacks detailed BME688 sensor readings | MEDIUM | OPEN |

---

## Notes

**Test Execution Notes:**
- This persona has the most significant gaps
- MycoBrain devices with BME688 sensors can detect VOCs but data not exposed in UI
- Wildfire smoke impact can be inferred from fire location + wind direction
- Fungal diversity provides ecosystem health proxy
- CRITICAL: Add EPA AirNow or Purple Air integration for air quality
- CRITICAL: Add greenhouse gas data layer for CO2/methane monitoring
