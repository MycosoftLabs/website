# Google Earth Engine Integration Setup

## Overview

The Earth Simulator now uses **Cesium** to display a Google Earth-like 3D globe with real satellite imagery. Cesium is loaded from CDN and uses Google Maps Satellite tiles (same imagery as Google Earth).

## Current Implementation

- **Globe Engine**: Cesium (loaded from CDN)
- **Imagery Provider**: Google Maps Satellite tiles (`https://mt1.google.com/vt/lyrs=s`)
- **Features**: Full 3D globe with rotation, zoom, pan, and all Google Earth-like capabilities

## Google Earth Engine API Setup (Optional - for Advanced Features)

If you want to use actual Google Earth Engine (GEE) for data analysis and custom imagery:

### 1. Get Google Earth Engine Access

1. Sign up at: https://earthengine.google.com/
2. Request access (may take a few days for approval)
3. Once approved, you'll have access to GEE datasets

### 2. Set Up Authentication

For server-side GEE access:

```bash
# Install Google Earth Engine Python API
pip install earthengine-api

# Authenticate
earthengine authenticate
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Google Earth Engine (optional - for advanced features)
GOOGLE_EARTH_ENGINE_PROJECT=your-project-id
GOOGLE_EARTH_ENGINE_CREDENTIALS=/path/to/credentials.json
```

### 4. Using GEE in the Application

The current implementation uses Google Maps Satellite tiles which provide the same high-quality imagery as Google Earth. For actual GEE integration:

1. **Server-side**: Use GEE Python API to process data and generate tiles
2. **Client-side**: Display tiles via Cesium (already implemented)

## Cesium Ion Token (Optional - for Premium Features)

Cesium Ion provides additional features like 3D terrain, 3D buildings, etc.

1. Sign up at: https://cesium.com/ion/
2. Get your access token
3. Add to `.env`:

```env
NEXT_PUBLIC_CESIUM_ION_TOKEN=your-cesium-ion-token
```

## Current Features

✅ Real satellite imagery (Google Maps/Google Earth)  
✅ Full 3D globe with rotation and zoom  
✅ Google Earth-like navigation  
✅ Custom layer support (mycelium, heat, weather)  
✅ Click detection for grid cells  
✅ Viewport tracking  

## Next Steps

1. **Install Cesium locally** (optional - currently using CDN):
   ```bash
   npm install cesium
   ```

2. **Add Google Earth Engine data layers** (if you have GEE access):
   - Modify `components/earth-simulator/cesium-globe.tsx`
   - Add GEE tile providers for custom datasets

3. **Add 3D terrain** (requires Cesium Ion token):
   - Replace `EllipsoidTerrainProvider` with `CesiumTerrainProvider`

## Troubleshooting

- **Cesium not loading**: Check internet connection (CDN requires internet)
- **No imagery**: Verify Google Maps tiles are accessible
- **Performance issues**: Enable `requestRenderMode` (already enabled)
