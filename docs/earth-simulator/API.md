# Earth Simulator - API Reference

## Base URL
```
/api/earth-simulator
```

## Land Tiles API

### Get Grid Statistics
**Endpoint**: `GET /land-tiles?action=stats&tileSize={size}`

**Parameters**:
- `tileSize` (optional): Grid cell size in degrees (default: 0.5)

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalTiles": 259200,
    "landTiles": 75168,
    "oceanTiles": 184032,
    "tileSizeDegrees": 0.5,
    "approximateTileSizeKm": 55.5
  },
  "description": "24x24 inch equivalent grid covering all land areas",
  "config": {
    "availableSizes": {
      "coarse": 1,
      "medium": 0.5,
      "fine": 0.1,
      "ultraFine": 0.01
    },
    "currentSize": 0.5,
    "approximateKm": 55.5
  }
}
```

### Get Tiles in Viewport
**Endpoint**: `GET /land-tiles?action=viewport&north={n}&south={s}&east={e}&west={w}&tileSize={size}&maxTiles={max}`

**Parameters**:
- `north` (required): Northern boundary in degrees
- `south` (required): Southern boundary in degrees
- `east` (required): Eastern boundary in degrees
- `west` (required): Western boundary in degrees
- `tileSize` (optional): Grid cell size (default: 0.5)
- `maxTiles` (optional): Maximum tiles to return (default: 500)

**Response**:
```json
{
  "success": true,
  "tiles": [
    {
      "id": "T261_211",
      "lat": 40.5,
      "lon": -74.5,
      "latEnd": 41.0,
      "lonEnd": -74.0,
      "centerLat": 40.75,
      "centerLon": -74.25,
      "region": "North America",
      "isLand": true,
      "areaKm2": 2341.69
    }
  ],
  "count": 150,
  "bounds": {
    "north": 41.0,
    "south": 40.0,
    "east": -74.0,
    "west": -75.0
  },
  "tileSize": 0.5
}
```

### Get GeoJSON Format
**Endpoint**: `GET /land-tiles?action=geojson&north={n}&south={s}&east={e}&west={w}&tileSize={size}&maxTiles={max}`

**Response**: Standard GeoJSON FeatureCollection

### Lookup Tile by Coordinates
**Endpoint**: `GET /land-tiles?action=lookup&lat={lat}&lon={lon}&tileSize={size}`

**Parameters**:
- `lat` (required): Latitude in degrees
- `lon` (required): Longitude in degrees
- `tileSize` (optional): Grid cell size (default: 0.5)

**Response**:
```json
{
  "success": true,
  "query": {
    "lat": 40.7128,
    "lon": -74.006
  },
  "tileId": "T261_211",
  "tile": {
    "id": "T261_211",
    "lat": 40.5,
    "lon": -74.5,
    "latEnd": 41.0,
    "lonEnd": -74.0,
    "centerLat": 40.75,
    "centerLon": -74.25,
    "region": "North America",
    "isLand": true,
    "areaKm2": 2341.69
  },
  "isLand": true
}
```

### Get Tile by ID
**Endpoint**: `GET /land-tiles?action=tile&id={tileId}&tileSize={size}`

**Parameters**:
- `id` (required): Tile ID (e.g., "T261_211")
- `tileSize` (optional): Grid cell size (default: 0.5)

**Response**:
```json
{
  "success": true,
  "tile": {
    "id": "T261_211",
    "lat": 40.5,
    "lon": -74.5,
    "latEnd": 41.0,
    "lonEnd": -74.0,
    "centerLat": 40.75,
    "centerLon": -74.25,
    "region": "North America",
    "isLand": true,
    "areaKm2": 2341.69
  }
}
```

### Get Tiles by Region
**Endpoint**: `GET /land-tiles?action=regions&tileSize={size}`

**Response**:
```json
{
  "success": true,
  "totalLandTiles": 75168,
  "regionCount": 9,
  "regions": {
    "North America": {
      "count": 12500,
      "sampleTiles": ["T261_211", "T262_212", ...]
    },
    "Europe": {
      "count": 8500,
      "sampleTiles": ["T301_101", ...]
    }
  }
}
```

## Google Earth Engine API

### Get GEE Status
**Endpoint**: `GET /gee?action=status`

**Response**:
```json
{
  "success": true,
  "configured": true,
  "initialized": true,
  "projectId": "fiery-return-438409-r5"
}
```

### Get Available Datasets
**Endpoint**: `GET /gee?action=datasets`

**Response**:
```json
{
  "success": true,
  "datasets": [
    {
      "id": "COPERNICUS/S2_SR",
      "name": "Sentinel-2 Surface Reflectance",
      "description": "High-resolution optical imagery"
    }
  ]
}
```

### Get Satellite Tile
**Endpoint**: `GET /gee/tile/satellite/{z}/{x}/{y}`

**Parameters**:
- `z`: Zoom level (0-19)
- `x`: Tile X coordinate
- `y`: Tile Y coordinate

**Response**: Image tile (PNG/JPEG)

### Get Elevation Tile
**Endpoint**: `GET /gee/tile/elevation/{z}/{x}/{y}`

### Get Landcover Tile
**Endpoint**: `GET /gee/tile/landcover/{z}/{x}/{y}`

### Get Vegetation Tile
**Endpoint**: `GET /gee/tile/vegetation/{z}/{x}/{y}`

## Grid API

### Calculate Grid Cells
**Endpoint**: `GET /grid?lat={lat}&lon={lon}&zoom={zoom}&width={w}&height={h}`

**Parameters**:
- `lat` (required): Center latitude
- `lon` (required): Center longitude
- `zoom` (required): Zoom level (0-20)
- `width` (optional): Viewport width (default: 1920)
- `height` (optional): Viewport height (default: 1080)

**Response**:
```json
{
  "success": true,
  "viewport": {
    "north": 41.0,
    "south": 40.0,
    "east": -74.0,
    "west": -75.0
  },
  "zoomLevel": 10,
  "gridCells": [
    {
      "id": "cell-123",
      "centerLat": 40.5,
      "centerLon": -74.5,
      "bounds": {
        "north": 41.0,
        "south": 40.0,
        "east": -74.0,
        "west": -75.0
      },
      "zoomLevel": 10,
      "sizeMeters": 50000
    }
  ],
  "count": 100
}
```

## iNaturalist API

### Get Observations
**Endpoint**: `GET /inaturalist?lat={lat}&lon={lon}&radius={radius}`

**Parameters**:
- `lat` (required): Center latitude
- `lon` (required): Center longitude
- `radius` (optional): Search radius in km (default: 10)

**Response**:
```json
{
  "success": true,
  "observations": [
    {
      "id": "12345",
      "species": "Amanita muscaria",
      "lat": 40.7128,
      "lon": -74.006,
      "observedAt": "2026-01-15T10:00:00Z",
      "observer": "user123"
    }
  ],
  "count": 50
}
```

## Device API

### Get MycoBrain Devices
**Endpoint**: `GET /devices`

**Response**:
```json
{
  "success": true,
  "devices": [
    {
      "id": "COM7",
      "port": "COM7",
      "location": {
        "lat": 40.7128,
        "lon": -74.006
      },
      "telemetry": {
        "temperature": 22.5,
        "humidity": 65.0,
        "pressure": 1013.25
      },
      "connected": true
    }
  ],
  "count": 1
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error

## Rate Limiting

- Default: 100 requests per minute per IP
- Viewport requests: 10 per minute per IP
- Tile requests: 1000 per minute per IP

## CORS

CORS is enabled for:
- `localhost:3002`
- `mycosoft.com`
- `*.mycosoft.com`

## Authentication

Most endpoints are public. Future authentication will use:
- JWT tokens for user-specific data
- API keys for third-party integrations
- OAuth for Google Earth Engine

---

**Last Updated**: January 2026  
**Version**: 1.0.0
