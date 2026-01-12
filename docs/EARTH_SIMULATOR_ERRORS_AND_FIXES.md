# Earth Simulator - Errors and Fixes

**Date**: January 9, 2026  
**Status**: ⚠️ Multiple console errors identified | ✅ Core fixes applied

## Overview

This document catalogs all errors encountered during the Earth Simulator implementation, their root causes, fixes applied, and remaining issues. The console was reporting 113-114 errors when Cesium globe was first integrated.

## Error Categories

### 1. Cesium CDN Loading Errors

#### Error Messages
```
Failed to load resource: the server responded with a status of 404 (Not Found)
https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Workers/createTaskProcessorWorker.js

Failed to load resource: net::ERR_NAME_NOT_RESOLVED
https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Assets/Textures/...
```

#### Root Cause
- Cesium attempts to load worker scripts and assets from CDN
- Worker paths are relative to `CESIUM_BASE_URL`
- Some assets may not be accessible from CDN without proper configuration
- Browser security policies may block worker scripts

#### Fix Applied
```typescript
// Set Cesium base URL before initialization
(window as any).CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/";

// Disable default Cesium Ion token requirement
Cesium.Ion.defaultAccessToken = undefined;
```

#### Status
- ✅ **Fixed**: Base URL configuration added
- ⚠️ **Remaining**: Worker scripts may still fail if CDN is blocked
- **Next Step**: Consider installing Cesium locally or using alternative CDN

#### Recommended Solution
1. **Option A**: Install Cesium locally
   ```bash
   npm install cesium
   ```
   Then update `next.config.js` to copy assets:
   ```javascript
   const CopyWebpackPlugin = require('copy-webpack-plugin');
   
   webpack: (config, { isServer }) => {
     if (!isServer) {
       config.plugins.push(
         new CopyWebpackPlugin({
           patterns: [
             { from: 'node_modules/cesium/Build/Cesium/Workers', to: 'cesium/Workers' },
             { from: 'node_modules/cesium/Build/Cesium/ThirdParty', to: 'cesium/ThirdParty' },
             { from: 'node_modules/cesium/Build/Cesium/Assets', to: 'cesium/Assets' },
             { from: 'node_modules/cesium/Build/Cesium/Widgets', to: 'cesium/Widgets' },
           ],
         })
       );
     }
     return config;
   }
   ```

2. **Option B**: Use alternative CDN (unpkg)
   ```typescript
   script.src = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Cesium.js";
   (window as any).CESIUM_BASE_URL = "https://unpkg.com/cesium@1.115.0/Build/Cesium/";
   ```

---

### 2. Tile Server 404 Errors

#### Error Messages
```
GET http://localhost:3002/api/earth-simulator/mycelium-tiles/10/512/256 404 (Not Found)
GET http://localhost:3002/api/earth-simulator/heat-tiles/10/512/256 404 (Not Found)
GET http://localhost:3002/api/earth-simulator/weather-tiles/10/512/256 404 (Not Found)
```

#### Root Cause
- Cesium attempts to load custom layer tiles when layers are enabled
- Tile server endpoints don't exist yet
- Layers are disabled by default, but may be enabled via UI

#### Fix Applied
```typescript
// Disable layers that don't have tile servers yet
const [layers, setLayers] = useState({
  mycelium: false, // Disabled until tile server is available
  heat: false,
  organisms: true, // Uses entity markers, not tiles
  weather: false,
});

// Add error handling in layer loading
if (layers?.mycelium) {
  try {
    const myceliumLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: "/api/earth-simulator/mycelium-tiles/{z}/{x}/{y}",
        credit: "Mycelium Probability",
      })
    );
    myceliumLayer.alpha = 0.5;
  } catch (err) {
    console.warn("Could not add mycelium layer:", err);
  }
}
```

#### Status
- ✅ **Fixed**: Layers disabled by default
- ⚠️ **Remaining**: Tile servers need to be implemented
- **Next Step**: Implement tile generation endpoints

#### Recommended Solution
Create tile server endpoints:

```typescript
// app/api/earth-simulator/mycelium-tiles/[z]/[x]/[y]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { z: string; x: string; y: string } }
) {
  const { z, x, y } = params;
  const zoom = parseInt(z);
  const tileX = parseInt(x);
  const tileY = parseInt(y);

  try {
    // Convert tile coordinates to lat/lon bounds
    const n = Math.pow(2, zoom);
    const lonMin = (tileX / n) * 360 - 180;
    const lonMax = ((tileX + 1) / n) * 360 - 180;
    const latMin = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tileY + 1) / n))) * 180 / Math.PI;
    const latMax = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / n))) * 180 / Math.PI;

    // Calculate mycelium probability for this tile
    // (This would call your database or ML model)
    const probability = await calculateMyceliumProbability(latMin, latMax, lonMin, lonMax);

    // Generate tile image (PNG with heat map)
    const tileImage = await generateProbabilityTile(probability, latMin, latMax, lonMin, lonMax);

    return new NextResponse(tileImage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating mycelium tile:", error);
    // Return transparent tile on error
    return new NextResponse(new Uint8Array(0), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  }
}
```

---

### 3. Grid Tile API 404 Errors

#### Error Messages
```
GET http://localhost:3002/api/earth-simulator/land-tiles?action=viewport&... 404 (Not Found)
GET http://localhost:3002/api/earth-simulator/land-tiles?action=stats&... 404 (Not Found)
```

#### Root Cause
- `CesiumGlobe` component attempts to load grid tiles when `showLandGrid` is enabled
- Grid tile API endpoint doesn't exist yet
- Grid is optional feature, should fail gracefully

#### Fix Applied
```typescript
// Add error handling in grid loading
const loadStats = async () => {
  try {
    const statsRes = await fetch(`/api/earth-simulator/land-tiles?action=stats&tileSize=${gridTileSize}`);
    if (!statsRes.ok) {
      console.warn("Grid stats API not available");
      return;
    }
    const statsData = await statsRes.json();
    if (statsData.success) {
      setGridStats({ 
        totalTiles: statsData.stats.totalTiles, 
        landTiles: statsData.stats.landTiles 
      });
    }
  } catch (err) {
    console.error("Error loading grid stats:", err);
    // Fail silently - grid is optional
  }
};
```

#### Status
- ✅ **Fixed**: Error handling added
- ⚠️ **Remaining**: Grid tile API needs implementation
- **Next Step**: Implement grid tile generation endpoint

#### Recommended Solution
Create grid tile API:

```typescript
// app/api/earth-simulator/land-tiles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLandTilesForViewport, getGridStats } from "@/lib/earth-simulator/grid-calculator";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "stats") {
      const tileSize = parseFloat(searchParams.get("tileSize") || "0.5");
      const stats = await getGridStats(tileSize);
      return NextResponse.json({ success: true, stats });
    }

    if (action === "viewport") {
      const north = parseFloat(searchParams.get("north") || "90");
      const south = parseFloat(searchParams.get("south") || "-90");
      const east = parseFloat(searchParams.get("east") || "180");
      const west = parseFloat(searchParams.get("west") || "-180");
      const tileSize = parseFloat(searchParams.get("tileSize") || "0.5");
      const maxTiles = parseInt(searchParams.get("maxTiles") || "2000");

      const tiles = await getLandTilesForViewport(
        { north, south, east, west },
        tileSize,
        maxTiles
      );

      return NextResponse.json({ success: true, tiles });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in land-tiles API:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

---

### 4. WebGL Context Errors (Legacy Components)

#### Error Messages
```
WebGL: INVALID_OPERATION: useProgram: program not valid
WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost
THREE.WebGLRenderer: Context Lost.
```

#### Root Cause
- Legacy `webgl-globe.tsx` and `grid-overlay.tsx` components still exist
- May be imported or initialized even though not rendered
- Three.js WebGL context conflicts with Cesium's WebGL context
- Multiple WebGL contexts can cause conflicts

#### Fix Applied
```typescript
// In earth-simulator-container.tsx - removed webgl-globe.tsx import
// Replaced with CesiumGlobe directly
import { CesiumGlobe } from "./cesium-globe";
// Removed: import { WebGLGlobe } from "./webgl-globe";
```

#### Status
- ✅ **Fixed**: Legacy components no longer imported
- ⚠️ **Remaining**: Legacy files still exist in codebase
- **Next Step**: Delete unused legacy files

#### Recommended Solution
Delete or archive legacy files:

```bash
# Files to delete/archive:
components/earth-simulator/webgl-globe.tsx  # Replaced by cesium-globe.tsx
components/earth-simulator/grid-overlay.tsx  # Grid handled by Cesium
lib/earth-simulator/globe-texture-compositor.ts  # Not needed with Cesium
components/earth-simulator/gee-globe.tsx  # Merged into cesium-globe.tsx
```

Or move to archive:
```bash
mkdir -p components/earth-simulator/archive
mv components/earth-simulator/webgl-globe.tsx components/earth-simulator/archive/
mv components/earth-simulator/grid-overlay.tsx components/earth-simulator/archive/
```

---

### 5. iNaturalist API Errors

#### Error Messages
```
GET http://localhost:3002/api/earth-simulator/inaturalist?action=bounds&... 404 (Not Found)
Failed to parse observations response
```

#### Root Cause
- Side panel attempts to fetch iNaturalist data
- API endpoint may not be fully implemented
- Error handling may not catch all failure cases

#### Fix Applied
```typescript
// Added error handling in comprehensive-side-panel.tsx
const [obsResponse, layersResponse] = await Promise.all([
  fetch(
    `/api/earth-simulator/inaturalist?action=bounds&nelat=${viewport.north}&nelng=${viewport.east}&swlat=${viewport.south}&swlng=${viewport.west}&per_page=200`
  ).catch(() => null), // Gracefully handle failures
  fetch(
    `/api/earth-simulator/layers?north=${viewport.north}&south=${viewport.south}&east=${viewport.east}&west=${viewport.west}&layers=mycelium,organisms,heat,weather`
  ).catch(() => null),
]);

// Safely parse JSON responses
let obsData = { observations: [] };
let layersData = null;

if (obsResponse && obsResponse.ok) {
  try {
    obsData = await obsResponse.json();
  } catch (e) {
    console.warn("Failed to parse observations response");
  }
}
```

#### Status
- ✅ **Fixed**: Error handling added
- ⚠️ **Remaining**: Verify iNaturalist API endpoint exists
- **Next Step**: Check if API route exists and is working

#### Recommended Solution
Verify API route exists:

```bash
# Check if file exists:
app/api/earth-simulator/inaturalist/route.ts
```

If missing, create it:

```typescript
// app/api/earth-simulator/inaturalist/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "bounds") {
      // Fetch from iNaturalist API
      const nelat = searchParams.get("nelat");
      const nelng = searchParams.get("nelng");
      const swlat = searchParams.get("swlat");
      const swlng = searchParams.get("swlng");
      const per_page = searchParams.get("per_page") || "200";

      const url = `https://api.inaturalist.org/v1/observations?nelat=${nelat}&nelng=${nelng}&swlat=${swlat}&swlng=${swlng}&per_page=${per_page}&taxon_id=47170`; // Fungi taxon ID

      const response = await fetch(url);
      const data = await response.json();

      return NextResponse.json({
        observations: data.results?.map((obs: any) => ({
          id: obs.id,
          species: obs.taxon?.name,
          lat: obs.location?.split(",")[0],
          lon: obs.location?.split(",")[1],
          observed_on: obs.observed_on,
        })) || [],
      });
    }

    // Other actions...
    return NextResponse.json({ observations: [] });
  } catch (error) {
    console.error("iNaturalist API error:", error);
    return NextResponse.json({ observations: [] });
  }
}
```

---

### 6. Hydration Mismatch Errors

#### Error Messages
```
Error: Hydration failed because the server rendered HTML didn't match the client.
Warning: Text content did not match. Server: "--:--:--" Client: "12:34:56"
```

#### Root Cause
- Server-side rendering (SSR) tries to render current time
- Server time differs from client time
- `toLocaleTimeString()` produces different output on server vs client

#### Fix Applied
```typescript
// In natureos-dashboard.tsx
const [currentTime, setCurrentTime] = useState<Date | null>(null); // Initialize as null
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true); // Mark as mounted on client
  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(timer);
}, []);

// In render:
<Badge variant="outline" className="font-mono">
  {mounted && currentTime ? currentTime.toLocaleTimeString() : "--:--:--"}
</Badge>
```

#### Status
- ✅ **Fixed**: Client-only rendering for time display

---

### 7. Cesium Ion Token Warnings

#### Error Messages
```
Cesium Ion token is required for some features. Get a free token at https://cesium.com/ion/
```

#### Root Cause
- Cesium tries to load default imagery from Cesium Ion
- Requires authentication token for some features
- Not required for custom imagery providers

#### Fix Applied
```typescript
// Disable default imagery and Ion features
const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
  baseLayerPicker: false, // Disable to avoid Ion token errors
  imageryProvider: false, // No default imagery - we'll add our own
  geocoder: false, // Disable geocoder (requires Ion token)
  // ... other options
});

// Disable Ion token requirement
Cesium.Ion.defaultAccessToken = undefined;
```

#### Status
- ✅ **Fixed**: Ion token warnings suppressed
- **Note**: Some Cesium features (3D terrain, 3D buildings) require Ion token

---

### 8. Memory/Performance Warnings

#### Error Messages
```
Too many tiles loaded: 2500 tiles exceed limit of 2000
WebGL: too many vertex attributes
```

#### Root Cause
- Grid system attempts to load too many tiles at once
- Cesium has limits on WebGL resources
- Viewport calculation may include too many tiles

#### Fix Applied
```typescript
// Limit tiles per viewport
const maxTiles = Math.min(
  Math.ceil((latRange * lonRange) / (gridTileSize * gridTileSize)) * 2,
  2000 // Hard limit to prevent memory issues
);

// Debounce viewport updates
const handleViewportChange = () => {
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
  loadTimeout = setTimeout(() => {
    // Load tiles...
  }, 500); // 500ms debounce
};
```

#### Status
- ✅ **Fixed**: Tile limits and debouncing added
- ⚠️ **Remaining**: May need further optimization for very large viewports

---

## Summary of Fixes Applied

### ✅ Completed Fixes

1. **Cesium Base URL Configuration**: Added proper CESIUM_BASE_URL setting
2. **Ion Token Warnings**: Disabled Ion-dependent features
3. **Layer Error Handling**: Added try-catch blocks for layer loading
4. **Grid API Error Handling**: Graceful failure when API missing
5. **iNaturalist API Error Handling**: Safe JSON parsing
6. **Hydration Errors**: Client-only rendering for time-sensitive content
7. **Tile Limits**: Added maximum tile limits and debouncing
8. **Legacy Component Removal**: Removed WebGL globe imports

### ⚠️ Remaining Issues

1. **Cesium Worker Scripts**: May fail if CDN is blocked (solution: local installation)
2. **Tile Servers**: Need implementation for mycelium, heat, weather tiles
3. **Grid Tile API**: Need implementation for land grid system
4. **iNaturalist API**: Verify endpoint exists and is fully functional
5. **Legacy Files**: Should be deleted/archived to prevent confusion

## Error Count Reduction

- **Initial**: 113-114 errors
- **After Fixes**: Estimated 20-30 errors (mainly missing APIs)
- **Target**: < 10 errors (only missing optional features)

## Testing Checklist

- [ ] Console shows < 10 errors (excluding missing optional APIs)
- [ ] Globe loads and displays satellite imagery
- [ ] No WebGL context errors
- [ ] No hydration errors
- [ ] Layer toggles work without 404s
- [ ] Grid can be toggled without errors (if API implemented)
- [ ] Side panel loads without crashes
- [ ] iNaturalist data displays (if API implemented)

## Quick Fix Commands

```bash
# 1. Remove legacy files
cd components/earth-simulator
mkdir -p archive
mv webgl-globe.tsx archive/
mv grid-overlay.tsx archive/

# 2. Install Cesium locally (optional, for better asset loading)
npm install cesium

# 3. Verify API routes exist
ls -la app/api/earth-simulator/

# 4. Check for TypeScript errors
npm run build
```

## Priority Fix List

### High Priority (Fixes Critical Errors)
1. ✅ Cesium base URL configuration (DONE)
2. ✅ Ion token warnings (DONE)
3. ✅ Error handling for missing APIs (DONE)
4. ⚠️ Verify iNaturalist API route exists
5. ⚠️ Delete/archive legacy WebGL files

### Medium Priority (Improves Stability)
1. ⚠️ Install Cesium locally or use alternative CDN
2. ⚠️ Implement tile server endpoints (or disable until ready)
3. ⚠️ Add comprehensive error boundaries

### Low Priority (Enhances Features)
1. ⚠️ Implement grid tile API
2. ⚠️ Implement custom layer tile servers
3. ⚠️ Add performance monitoring

## References

- [Cesium Troubleshooting](https://cesium.com/learn/cesiumjs-learn/cesiumjs-resources/#troubleshooting)
- [Next.js Error Handling](https://nextjs.org/docs/advanced-features/error-handling)
- [WebGL Context Issues](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext)
