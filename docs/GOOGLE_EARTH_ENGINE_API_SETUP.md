# Google Earth Engine API Setup Guide

**Date**: January 9, 2026  
**Purpose**: Complete guide for setting up Google Earth Engine API integration

## Current Status

### ✅ What's Working

- **Tile Proxy System**: API routes are in place to proxy GEE requests
- **Google Maps Integration**: Currently using Google Maps Satellite tiles (same imagery as Google Earth)
- **Cesium Globe**: Professional 3D globe with all Google Earth-like capabilities

### ⚠️ What Needs Setup

- **GEE Authentication**: Server-side authentication required
- **GEE Tile Server**: Need to configure actual GEE tile endpoints
- **GEE Datasets**: Access to specific GEE datasets for analysis

## Google Earth Engine vs Google Earth

### Google Earth Engine (GEE)
- **Purpose**: Data analysis and processing platform
- **Access**: Requires sign-up and approval
- **Use Case**: Generate custom imagery, analyze satellite data, create datasets
- **API**: Python/JavaScript APIs for server-side processing

### Google Earth (Visualization)
- **Purpose**: 3D globe visualization
- **Access**: Public (via Google Maps tiles)
- **Use Case**: Display satellite imagery, navigation, exploration
- **API**: Google Maps JavaScript API (what we're currently using)

### Current Implementation

We're using **Google Maps Satellite tiles** which provide:
- ✅ Same high-quality imagery as Google Earth
- ✅ No authentication required
- ✅ Works immediately
- ✅ Free for reasonable usage

## Setting Up Google Earth Engine (Optional)

### Step 1: Get GEE Access

1. Visit: https://earthengine.google.com/
2. Click "Sign Up" or "Get Started"
3. Fill out the registration form
4. Wait for approval (typically 1-3 business days)

### Step 2: Install GEE Python API

```bash
# Install the Earth Engine Python API
pip install earthengine-api

# Authenticate (opens browser for OAuth)
earthengine authenticate

# Verify installation
python -c "import ee; ee.Initialize()"
```

### Step 3: Set Up Service Account (For Production)

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create or select a project
3. Enable Earth Engine API
4. Create a service account
5. Download credentials JSON file
6. Set environment variable:

```env
GOOGLE_EARTH_ENGINE_CREDENTIALS=/path/to/credentials.json
GOOGLE_EARTH_ENGINE_PROJECT=your-project-id
```

### Step 4: Update Tile Proxy

Modify `app/api/earth-simulator/gee/tile/[type]/[z]/[x]/[y]/route.ts`:

```typescript
import ee from '@google/earthengine';

// Initialize Earth Engine
await ee.initialize(null, null, () => {
  // Use service account credentials
  const credentials = JSON.parse(process.env.GOOGLE_EARTH_ENGINE_CREDENTIALS);
  ee.data.authenticateViaPrivateKey(credentials);
});

// Get image collection (e.g., Landsat)
const image = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
  .filterDate('2020-01-01', '2020-12-31')
  .median();

// Export as tile
const mapId = image.getMapId({
  bands: ['B4', 'B3', 'B2'], // RGB
  min: 0,
  max: 3000,
});

// Return tile URL
const tileUrl = `https://earthengine.googleapis.com/v1alpha/${mapId.mapid}/tiles/{z}/{x}/{y}`;
```

## API Endpoints Reference

### Current Endpoints

#### 1. GEE Tile Proxy
```
GET /api/earth-simulator/gee/tile/{type}/{z}/{x}/{y}
```
- **Type**: `satellite`, `terrain`, `hybrid`
- **Returns**: Image tile (PNG)
- **Current**: Proxies Google Maps tiles
- **Future**: Will proxy GEE tiles when configured

#### 2. GEE API Proxy
```
GET /api/earth-simulator/gee?action={action}&north={n}&south={s}&east={e}&west={w}&zoom={z}
```
- **Actions**: `satellite`, `elevation`, `landcover`, `vegetation`
- **Returns**: JSON with tile coordinates and URLs
- **Current**: Generates Google Maps tile URLs
- **Future**: Will call GEE API for custom datasets

### Required Endpoints (To Be Implemented)

#### 3. Mycelium Probability Tiles
```
GET /api/earth-simulator/mycelium-tiles/{z}/{x}/{y}
```
- **Purpose**: Serve mycelium probability heat map tiles
- **Status**: ⚠️ Not implemented
- **Data Source**: Calculated from iNaturalist + environmental data

#### 4. Heat Map Tiles
```
GET /api/earth-simulator/heat-tiles/{z}/{x}/{y}
```
- **Purpose**: Serve temperature/heat map tiles
- **Status**: ⚠️ Not implemented
- **Data Source**: Weather APIs, satellite thermal data

#### 5. Weather Tiles
```
GET /api/earth-simulator/weather-tiles/{z}/{x}/{y}
```
- **Purpose**: Serve weather overlay tiles
- **Status**: ⚠️ Not implemented
- **Data Source**: Weather APIs, NOAA data

## Environment Variables

Add to `.env` file:

```env
# Google Earth Engine (Optional - for advanced features)
GOOGLE_EARTH_ENGINE_PROJECT=your-project-id
GOOGLE_EARTH_ENGINE_CREDENTIALS=/path/to/credentials.json

# Cesium Ion (Optional - for 3D terrain)
NEXT_PUBLIC_CESIUM_ION_TOKEN=your-cesium-ion-token

# Google Maps API (Already configured)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## GEE Datasets of Interest

### Satellite Imagery
- **Landsat 8**: `LANDSAT/LC08/C01/T1_SR`
- **Sentinel-2**: `COPERNICUS/S2_SR`
- **MODIS**: `MODIS/006/MOD13Q1` (NDVI)

### Elevation/Terrain
- **SRTM**: `USGS/SRTMGL1_003`
- **ASTER GDEM**: `ASTER/ASTGTM2`

### Land Cover
- **MODIS Land Cover**: `MODIS/006/MCD12Q1`
- **ESA Land Cover**: `ESA/WorldCover/v100`

### Climate/Weather
- **ERA5**: `ECMWF/ERA5/DAILY`
- **PRISM**: `OREGONSTATE/PRISM/AN81d`

## Implementation Example

### Server-Side GEE Processing

```python
# services/earth_engine_processor.py
import ee
from google.oauth2 import service_account
import json

# Initialize with service account
credentials = service_account.Credentials.from_service_account_file(
    'path/to/credentials.json',
    scopes=['https://www.googleapis.com/auth/earthengine']
)
ee.Initialize(credentials)

def get_mycelium_probability_tile(z, x, y):
    """Generate mycelium probability tile from GEE data"""
    
    # Get iNaturalist observations (would need to import from your DB)
    # Combine with environmental data
    
    # Create probability map
    probability_map = ee.Image(...)  # Your GEE processing
    
    # Export as tile
    map_id = probability_map.getMapId({
      bands: ['probability'],
      min: 0,
      max: 1,
    })
    
    return f"https://earthengine.googleapis.com/v1alpha/{map_id.mapid}/tiles/{z}/{x}/{y}"
```

### Client-Side Integration

The Cesium globe automatically loads tiles from the proxy endpoints. No client-side changes needed once tile servers are implemented.

## Cost Considerations

### Google Maps Tiles (Current)
- **Free Tier**: 28,000 map loads per month
- **Paid**: $7 per 1,000 additional loads
- **Satellite Imagery**: Included

### Google Earth Engine
- **Free**: For research, education, and non-commercial use
- **Commercial**: Contact Google for pricing
- **Quota**: 10,000 requests per day (free tier)

### Cesium Ion
- **Free Tier**: 5GB storage, 100K requests/month
- **Paid**: Starts at $149/month

## Troubleshooting

### Common Issues

1. **"Cesium Ion token required"**
   - **Solution**: Set `Cesium.Ion.defaultAccessToken = undefined` (already done)
   - Or get free token from https://cesium.com/ion/

2. **"GEE authentication failed"**
   - **Solution**: Run `earthengine authenticate` again
   - Check credentials file path

3. **"Tile server 404 errors"**
   - **Solution**: Implement missing tile endpoints
   - Or disable custom layers until implemented

4. **"Cesium CDN loading errors"**
   - **Solution**: Check internet connection
   - Or install Cesium locally and configure webpack

## Next Steps for Full GEE Integration

1. ✅ **Cesium Globe**: Complete
2. ✅ **Tile Proxy Infrastructure**: Complete
3. ⚠️ **GEE Authentication**: Set up service account
4. ⚠️ **Tile Server Implementation**: Create tile generators
5. ⚠️ **Data Processing**: Implement mycelium probability calculation
6. ⚠️ **Caching**: Add Redis caching for tiles
7. ⚠️ **Performance**: Optimize tile generation

## Resources

- [GEE Documentation](https://developers.google.com/earth-engine)
- [GEE Code Editor](https://code.earthengine.google.com/)
- [GEE Python API](https://github.com/google/earthengine-api)
- [Cesium Documentation](https://cesium.com/learn/cesiumjs-learn/)
- [Google Maps Tile API](https://developers.google.com/maps/documentation/tile)
