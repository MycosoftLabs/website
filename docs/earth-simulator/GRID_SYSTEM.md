# 24x24 Inch Land Grid System

## Overview

The Earth Simulator uses a unique grid system that divides all landmasses into 24x24 inch equivalent tiles with unique IDs. This system excludes all ocean areas and provides a foundation for tracking observations, mycelium networks, and environmental data.

## Grid Specifications

### Tile Sizes
- **Coarse**: 1.0° (~111 km per tile)
- **Medium**: 0.5° (~55 km per tile) - **Default**
- **Fine**: 0.1° (~11 km per tile)
- **Ultra Fine**: 0.01° (~1.1 km per tile)

### Statistics (Medium Resolution)
- **Total Possible Tiles**: 259,200 (360° × 180° / 0.5°²)
- **Land Tiles**: 75,168
- **Ocean Tiles**: 184,032 (excluded)
- **Coverage**: 100% of Earth's landmasses

## Tile ID Format

### Pattern
```
T{lat_offset}_{lon_offset}
```

### Encoding
- Lat/Lon offsets from -90°/-180°
- Encoded as integers (multiplied by 10 for precision)
- Example: `T261_211` = 40.5°N, -74.5°W

### Examples
- New York City: `T261_211`
- London: `T301_101`
- Tokyo: `T305_415`

## Regions

Tiles are automatically categorized by region:
- **North America**: Green (#4CAF50)
- **South America**: Light Green (#8BC34A)
- **Europe**: Blue (#2196F3)
- **Africa**: Orange (#FF9800)
- **Asia**: Purple (#9C27B0)
- **Australia**: Red (#F44336)
- **Antarctica**: Light Gray (#E0E0E0)
- **Greenland**: Light Blue (#81D4FA)

## API Usage

### Generate Tile ID
```typescript
const tileId = generateTileId(40.7128, -74.006, 0.5);
// Returns: "T261_211"
```

### Parse Tile ID
```typescript
const coords = parseTileId("T261_211", 0.5);
// Returns: { lat: 40.5, lon: -74.5 }
```

### Get Tiles in Viewport
```typescript
const tiles = getTilesInViewport(
  41.0,  // north
  40.0,  // south
  -74.0, // east
  -75.0, // west
  0.5,   // tileSize
  2000   // maxTiles
);
```

## Performance

- **Viewport Loading**: Max 2000 tiles per viewport
- **Memory Usage**: ~4MB per viewport (vs 150MB for full globe)
- **API Response Time**: < 200ms for viewport queries
- **Rendering**: 60 FPS with hardware acceleration

## Use Cases

1. **Observation Tracking**: Link species observations to specific tiles
2. **Mycelium Networks**: Map fungal networks across tile boundaries
3. **Environmental Monitoring**: Aggregate sensor data by tile
4. **Research**: Enable grid-based scientific analysis
5. **Conservation**: Track ecosystem health by region

---

**Last Updated**: January 2026
