# CREP User Persona Test: Ecological Researcher / Mycologist

## Persona Profile

**Role:** Field Mycologist / Ecological Researcher  
**Affiliation:** University / Research Institution  
**Primary Mission:** Fungal species documentation, biodiversity research, citizen science validation  
**Key Requirements:** Species identification, observation data, geographic distribution, source verification, research-grade validation

---

## Use Cases & Requirements

### Primary Use Cases
1. **Species Distribution Mapping** - Map geographic distribution of fungal species
2. **Observation Verification** - Verify citizen science observations
3. **Biodiversity Assessment** - Assess fungal diversity in research areas
4. **Data Quality Control** - Distinguish research-grade vs needs-ID observations
5. **Environmental Correlation** - Correlate fungal activity with environmental events

---

## Test Scenarios

### TEST 8.1: Fungal Observation Overview
**Objective:** View comprehensive fungal observation data
**Steps:**
1. Navigate to CREP dashboard
2. Ensure FUNGAL DATA tab is active
3. View total fungal count (21,757 expected)
4. Check observation density on map
5. Verify MINDEX data integration

**Expected Result:** Complete fungal observation view with count

---

### TEST 8.2: Species-Level Data Access
**Objective:** Access detailed species information for observations
**Steps:**
1. Click on fungal marker
2. View common name and scientific name
3. Check species photo/image
4. Verify taxonomic information
5. Access iNaturalist source link

**Expected Result:** Full species identification data

---

### TEST 8.3: Research Grade vs Needs ID Filtering
**Objective:** Filter observations by verification status
**Steps:**
1. View "Fungal Observations" section
2. Check Research Grade count
3. Check Needs ID count (21,757 needs ID shown)
4. Distinguish markers by verification status
5. Filter/sort by verification level

**Expected Result:** Clear differentiation of verification status

---

### TEST 8.4: Observer Attribution
**Objective:** Verify citizen scientist attribution for observations
**Steps:**
1. Click on fungal marker
2. View "Observer" field
3. Check observation date
4. Verify location accuracy
5. Access contributor profile if available

**Expected Result:** Complete observer and date attribution

---

### TEST 8.5: Geographic Distribution Analysis
**Objective:** Analyze species geographic distribution patterns
**Steps:**
1. View fungal markers across map
2. Identify species clustering patterns
3. Zoom to specific regions
4. Compare distribution across ecosystems
5. Assess coverage gaps

**Expected Result:** Visual distribution analysis capability

---

### TEST 8.6: Species List in Intel Feed
**Objective:** Browse species list for research targets
**Steps:**
1. View FUNGAL DATA tab in Intel Feed
2. Scroll through species list
3. Click on species to locate on map
4. View species frequency/count
5. Filter by location if available

**Expected Result:** Browseable species list with navigation

---

### TEST 8.7: Environmental Correlation
**Objective:** Correlate fungal activity with environmental events
**Steps:**
1. View fungal observations in area
2. Switch to EVENTS tab
3. View environmental events in same area
4. Assess rainfall/storm patterns (if available)
5. Correlate with fungal fruiting events

**Expected Result:** Ability to view both layers for correlation

---

### TEST 8.8: MINDEX Kingdom Statistics
**Objective:** Access MINDEX biological database statistics
**Steps:**
1. View MINDEX KINGDOMS panel
2. Check Fungi count (1247K)
3. Compare with other kingdoms
4. Click on Fungi for more details
5. Verify database connectivity

**Expected Result:** Access to MINDEX biological statistics

---

### TEST 8.9: External Data Source Links
**Objective:** Access external databases for full records
**Steps:**
1. Click on fungal observation
2. Click "View on iNaturalist" button
3. Verify external link opens correctly
4. Check for additional database links
5. Verify data source consistency

**Expected Result:** Functional external database links

---

### TEST 8.10: Rare/Notable Species Identification
**Objective:** Identify rare or notable species observations
**Steps:**
1. Browse fungal species list
2. Look for notable species (Amanita, Boletus, etc.)
3. Click on species for verification status
4. Check observation location and date
5. Assess rarity indicators if available

**Expected Result:** Notable species highlighting (MAY BE LIMITED)

---

## Test Execution Log

**Test Date:** January 16, 2026 | **Time:** 10:42 AM PST

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 8.1 | Observation Overview | ✅ PASSED | 21,757 total, 129 visible (LOD system) |
| 8.2 | Species Data | ✅ PASSED | Common name, scientific name, photo, location |
| 8.3 | Research Grade Filter | ⚠️ PARTIAL | 0 Research Grade / 21,757 Needs ID visible, no filter |
| 8.4 | Observer Attribution | ✅ PASSED | Observer name, observation date displayed |
| 8.5 | Geographic Distribution | ✅ PASSED | Amber markers show distribution patterns |
| 8.6 | Species List | ✅ PASSED | Intel Feed shows scrollable species list |
| 8.7 | Environmental Correlation | ✅ PASSED | EVENTS tab allows correlation with env data |
| 8.8 | MINDEX Statistics | ✅ PASSED | 1.247M Fungi in MINDEX database |
| 8.9 | External Links | ✅ PASSED | "View on iNaturalist" button works |
| 8.10 | Rare Species | ✅ PASSED | Notable species (Amanita, Chanterelle) visible |

---

## Identified Gaps & Improvements Needed

| Gap ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| GAP-005 | No filter to show only research-grade observations | MEDIUM | OPEN |

---

## Notes

**Test Execution Notes:**
- Fungal popup shows: Image, Source (iNaturalist), Coordinates, Observer, Location
- External iNaturalist links verified working
- Species geographic distribution visible with amber markers
- LOD system shows 129 visible of 21,757 total (zoom for more)
- Recommend adding research-grade filter for quality data access
