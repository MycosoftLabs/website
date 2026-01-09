# Earth Simulator - Architecture Documentation

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Earth Simulator Frontend                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Cesium Globe │  │ Side Panel   │  │ Layer Controls│    │
│  │  (3D Render) │  │  (Data UI)   │  │  (Toggles)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server-Side)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Land Tiles   │  │ GEE Proxy    │  │ Device Data  │     │
│  │   API        │  │   API        │  │   API        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │              │                    │
         ▼              ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Grid System │  │ Google Earth │  │ MycoBrain    │
│  Library    │  │    Engine    │  │   Service    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Component Architecture

### 1. Earth Simulator Container
**File**: `components/earth-simulator/earth-simulator-container.tsx`

**Responsibilities**:
- Main orchestrator component
- Manages global state (viewport, selected tiles, layers)
- Coordinates between globe and side panels
- Handles user interactions

**State Management**:
```typescript
- selectedCell: { cellId, lat, lon }
- selectedTile: GridTile
- viewport: { north, south, east, west }
- showLandGrid: boolean
- gridTileSize: number
- layers: { mycelium, heat, organisms, weather }
```

### 2. Cesium Globe Component
**File**: `components/earth-simulator/cesium-globe.tsx`

**Responsibilities**:
- 3D globe rendering using CesiumJS
- Viewport-based tile loading
- Camera controls and interactions
- Layer management

**Key Features**:
- Lazy loading of grid tiles (max 2000 per viewport)
- Debounced viewport updates (500ms)
- Click handlers for tile selection
- Memory-efficient entity management

**Performance Optimizations**:
- Viewport-based loading prevents memory exhaustion
- Automatic cleanup of off-screen tiles
- Efficient Cesium entity management
- WebGL hardware acceleration

### 3. Grid System Library
**File**: `lib/earth-grid-system.ts`

**Responsibilities**:
- Generate unique tile IDs for land areas
- Calculate tile bounds and regions
- Filter ocean areas
- Provide tile lookup functions

**Core Functions**:
```typescript
generateLandTiles(bounds?, tileSize): GridTile[]
getTilesInViewport(north, south, east, west, tileSize, maxTiles): GridTile[]
generateTileId(lat, lon, tileSize): string
parseTileId(id, tileSize): { lat, lon } | null
tilesToGeoJSON(tiles): GeoJSON.FeatureCollection
getGridStats(tileSize): GridStats
```

**Tile ID Format**:
- Pattern: `T{lat}_{lon}`
- Example: `T261_211` (New York City area)
- Lat/Lon encoded as integer offsets from -90°/-180°

### 4. Land Tiles API
**File**: `app/api/earth-simulator/land-tiles/route.ts`

**Endpoints**:
- `GET ?action=stats` - Grid statistics
- `GET ?action=viewport&north=X&south=X&east=X&west=X` - Tiles in viewport
- `GET ?action=geojson&...` - GeoJSON format
- `GET ?action=lookup&lat=X&lon=X` - Find tile for coordinates
- `GET ?action=regions` - Tiles by region
- `GET ?action=tile&id=XXX` - Single tile details

**Performance**:
- Server-side filtering reduces data transfer
- Max tiles limit (2000) prevents overload
- Efficient region-based queries

### 5. Google Earth Engine Integration
**File**: `lib/google-earth-engine.ts`

**Responsibilities**:
- Authenticate with GEE service account
- Provide tile URL generation
- Dataset management
- Fallback to ESRI imagery

**Authentication Flow**:
1. Load service account credentials from env vars
2. Initialize JWT client
3. Authorize with GEE API
4. Provide authenticated tile URLs

**Fallback Strategy**:
1. Try Google Earth Engine tiles
2. Fallback to ESRI World Imagery
3. Ultimate fallback to Natural Earth II

## Data Flow

### Grid Tile Loading Flow

```
User Interaction (Pan/Zoom)
    │
    ▼
Cesium Camera Move Event
    │
    ▼
Debounce (500ms)
    │
    ▼
Calculate Viewport Bounds
    │
    ▼
API Request: /land-tiles?action=viewport&...
    │
    ▼
Grid System Library Filters Land Tiles
    │
    ▼
Return Max 2000 Tiles
    │
    ▼
Create Cesium Entities
    │
    ▼
Render on Globe
    │
    ▼
Cleanup Off-Screen Tiles
```

### Tile Click Flow

```
User Clicks Globe
    │
    ▼
Cesium Pick Event
    │
    ▼
Check if Grid Entity
    │
    ▼
Extract Tile ID
    │
    ▼
Find Tile in Cache
    │
    ▼
Call onTileClick(tile)
    │
    ▼
Update Side Panel with Tile Info
```

## Memory Management

### Viewport-Based Loading Strategy

**Problem**: Loading all 75,168 tiles = ~150MB memory

**Solution**: Viewport-based loading
- Only load tiles visible in current camera view
- Maximum 2000 tiles per viewport
- Automatic cleanup when viewport changes
- Debounced updates prevent excessive API calls

**Memory Usage**:
- Full globe: ~150MB (all tiles)
- Viewport: ~4MB (2000 tiles)
- **98% reduction**

### Entity Management

```typescript
// Store entities in ref for cleanup
gridEntitiesRef.current: Cesium.Entity[]

// Clear before loading new tiles
gridEntitiesRef.current.forEach(entity => {
  viewer.entities.remove(entity);
});

// Add new entities
gridEntitiesRef.current.push(entity);
```

## Performance Optimizations

### 1. Debouncing
- Viewport changes debounced to 500ms
- Prevents excessive API calls during camera movement
- Reduces server load and network traffic

### 2. Tile Limits
- Hard limit of 2000 tiles per viewport
- Prevents memory exhaustion
- Calculated based on viewport size and tile resolution

### 3. Lazy Loading
- Tiles loaded only when grid is enabled
- Tiles removed when grid is disabled
- Viewport-based loading prevents full globe load

### 4. Efficient Rendering
- WebGL hardware acceleration
- Cesium entity batching
- Request render mode for better performance

## Scalability Considerations

### Current Limitations
- 2000 tile limit per viewport
- Single-threaded JavaScript execution
- Browser memory constraints

### Future Improvements
- Web Workers for tile processing
- Level-of-detail (LOD) system
- Tile caching and preloading
- Server-side rendering for initial load

## Security

### API Security
- Rate limiting on API endpoints
- Input validation for coordinates
- Sanitized tile IDs
- CORS configuration

### Google Earth Engine
- Service account authentication
- Private key stored in environment variables
- Secure credential management
- Token refresh handling

## Error Handling

### Graceful Degradation
- Fallback imagery if GEE fails
- Empty state if no tiles found
- Error messages in UI
- Console logging for debugging

### Retry Logic
- Automatic retry for failed API calls
- Exponential backoff
- User notification on persistent failures

## Testing Strategy

### Unit Tests
- Grid system calculations
- Tile ID generation/parsing
- Coordinate transformations

### Integration Tests
- API endpoint functionality
- Viewport-based loading
- Tile click interactions

### Performance Tests
- Memory usage monitoring
- Load time measurements
- Frame rate analysis

## Deployment Considerations

### Environment Variables
```env
GEE_PROJECT_ID=required-for-gee
GEE_SERVICE_ACCOUNT_EMAIL=required-for-gee
GEE_PRIVATE_KEY=required-for-gee
GEE_CLIENT_ID=required-for-gee
```

### Build Optimization
- Code splitting for CesiumJS
- Lazy loading of components
- Image optimization
- CDN for static assets

### Monitoring
- API response times
- Memory usage
- Error rates
- User interactions

---

**Last Updated**: January 2026  
**Version**: 1.0.0
