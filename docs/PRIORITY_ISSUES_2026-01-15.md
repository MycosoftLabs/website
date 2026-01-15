# Priority Issues - January 15, 2026

**Status**: Pending Fixes  
**Reference Session**: SESSION_SUMMARY_2026-01-15_AGENT2.md

---

## 🔴 CRITICAL - Fix Immediately

### 1. Google Maps API Key Breaking

**Symptom**: Map disappears on NatureOS Overview after viewing CREP dashboard

**Locations to Check**:
```
WEBSITE/website/
├── Dockerfile.container (line ~145: hardcoded API key)
├── .env.local (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
├── components/maps/mycelium-map.tsx
├── components/maps/google-maps-provider.tsx
└── app/natureos/page.tsx
```

**Possible Causes**:
1. CREP uses MapLibre (Stadia Maps), which may conflict with Google Maps loader
2. Multiple Google Maps instances conflicting
3. API key quota exceeded
4. Race condition in map loading

**Fix Strategy**:
1. Check if Google Maps script is being loaded multiple times
2. Ensure single instance of GoogleMapsProvider
3. Verify API key restrictions in Google Cloud Console

---

### 2. Google OAuth Not Working

**Symptom**: Sign-in button does nothing

**Locations to Check**:
```
WEBSITE/website/
├── .env.local (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
├── lib/auth/auth-config.ts
├── app/api/auth/[...nextauth]/route.ts
└── components/auth/sign-in-button.tsx
```

**Possible Causes**:
1. Missing or invalid GOOGLE_CLIENT_ID
2. Missing or invalid GOOGLE_CLIENT_SECRET
3. OAuth consent screen not configured
4. Authorized redirect URIs not set (http://localhost:3000/api/auth/callback/google)

**Fix Strategy**:
1. Verify .env.local has valid Google OAuth credentials
2. Check Google Cloud Console → APIs & Services → Credentials
3. Verify redirect URI is whitelisted
4. Check browser console for OAuth errors

---

## 🟠 HIGH - MycoBrain Device Manager

### 3. Sensor Data Not Reading

**Symptom**: Discovered peripherals shows nothing, sensors tab empty

**File**: `app/api/mycobrain/[port]/sensors/route.ts`

**Current Code Calls**:
```typescript
fetch(`${MYCOBRAIN_SERVICE_URL}/devices/${deviceId}/command`, {
  body: JSON.stringify({ command: { cmd: "get-sensors" } })
})
```

**Fix Strategy**:
1. Check if `get-sensors` is mapped correctly in Python service
2. Verify device responds to `sensors` or `status` command
3. Parse BME688 response correctly (two sensors: 0x76, 0x77)

---

### 4. Telemetry Charts Empty

**Symptom**: Charts show nothing, only "All Sensors" tab

**Files**:
```
WEBSITE/website/
├── components/mycobrain/telemetry-charts.tsx
├── app/api/mycobrain/[port]/telemetry/route.ts
└── components/mycobrain/mycobrain-device-manager.tsx
```

**Possible Causes**:
1. Telemetry polling not implemented
2. Data format mismatch
3. WebSocket not connected
4. Chart library not receiving data updates

---

### 5. Sensor History Empty ("Collecting Data")

**Symptom**: Shows loading state indefinitely

**Fix Strategy**:
1. Implement proper data collection loop
2. Store telemetry in state/database
3. Display historical values in table/chart

---

### 6. Refresh/Pause Buttons Not Working

**Symptom**: Buttons have no effect (except Download JSON)

**File**: `components/mycobrain/mycobrain-device-manager.tsx`

**Fix Strategy**:
1. Verify onClick handlers are attached
2. Check if state updates are triggering re-renders
3. Add console.log to debug button actions

---

### 7. Register Button (MINDEX Integration)

**Symptom**: Does nothing when clicked

**File**: `components/mycobrain/mycobrain-device-manager.tsx`

**Fix Strategy**:
1. Find Register button in component
2. Implement registration API call
3. Create `/api/mycobrain/register` endpoint if missing

---

## 🟡 MEDIUM - UX Improvements

### 8. Port Display (Linux vs Windows)

**Symptom**: Shows `/dev/ttyACM0` instead of `COM7`

**Root Cause**: MycoBrain service runs in Docker via usbipd, which uses Linux paths

**Fix Strategy**:
1. Display both: "COM7 (/dev/ttyACM0 in Docker)"
2. Or detect host OS and show appropriate format
3. Add tooltip explaining the difference

---

### 9. Smell Detection System

**Symptom**: Shows "update, upgrade firmware for smell detection"

**Fix Strategy**:
1. Check if smell detection is implemented in firmware
2. If not, show "Coming Soon" or hide section
3. If yes, implement proper data parsing

---

### 10. Air Quality Comparison Not Working

**Symptom**: UI shows but no data

**Fix Strategy**:
1. Requires multiple BME688 readings
2. Compare AMB (0x77) vs ENV (0x76) sensor readings
3. Calculate delta for temperature, humidity, IAQ

---

## 🟢 LOW - Backend Integrations (CREP)

### 11. CREP Real Data Sources

**Current**: Mock data with realistic values

**To Implement**:
| Source | API | Purpose |
|--------|-----|---------|
| OpenSky Network | opensky-network.org | Aircraft positions |
| AISstream | aisstream.io | Ship positions |
| Global Fishing Watch | globalfishingwatch.org | Fishing vessels |
| USGS Earthquakes | Already integrated | Seismic events |
| NASA EONET | Already integrated | Natural events |

---

## Quick Reference - Service Ports

| Service | Port | Status |
|---------|------|--------|
| Website (Next.js) | 3000 | ✅ Running |
| MycoBrain Service | 8003 | ✅ Healthy |
| MINDEX API | 8002 | ✅ Healthy |
| MAS API | 8001 | ⚠️ Check |
| n8n | 5678 | ⚠️ Check |
| PostgreSQL | 5432 | ⚠️ Check |

---

## Quick Reference - Key Files

### MycoBrain Device Manager
```
components/mycobrain/mycobrain-device-manager.tsx  # Main UI
app/api/mycobrain/[port]/control/route.ts          # LED, buzzer, etc.
app/api/mycobrain/[port]/sensors/route.ts          # Sensor data
app/api/mycobrain/[port]/telemetry/route.ts        # Telemetry
app/api/mycobrain/[port]/machine-mode/route.ts     # Machine mode
```

### NatureOS Dashboard
```
components/dashboard/natureos-dashboard.tsx        # Main dashboard
components/maps/mycelium-map.tsx                   # Global network map
components/dashboard/event-feed.tsx                # Situational awareness
```

### CREP Dashboard
```
app/dashboard/crep/page.tsx                        # CREP page
components/crep/crep-map.tsx                       # MapCN-based map
```

---

*Created: 2026-01-15*
