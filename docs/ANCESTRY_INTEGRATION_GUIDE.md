# Mycosoft Website - Ancestry Integration Guide

**Last Updated:** January 12, 2026  
**Status:** ✅ Fully Integrated with MINDEX

## Overview

The Ancestry section of the Mycosoft website provides a comprehensive interface for browsing and searching fungal species data. It connects to the MINDEX API to fetch taxonomic information, images, and metadata.

## Current Statistics

| Metric | Count |
|--------|-------|
| **Total Species Available** | 15,859 |
| **Species with Images** | 8,663 |
| **Data Sources** | iNaturalist, GBIF, FungiDB, Mushroom.World |

## Pages

### 1. Species Explorer (`/ancestry/explorer`)

The main discovery interface for browsing fungal species.

**Features:**
- Featured species carousel with high-quality images
- Dataset selector (Popular, All Species, All Taxa)
- Source filter (iNaturalist, GBIF, MycoBank, All)
- Category filters (Edible, Medicinal, Poisonous, Psychoactive, Gourmet)
- Grid/List view toggle
- Search by name, family, habitat, or characteristics
- "Load More" pagination

**Default View:**
- Shows **500 species** per page
- Sorted by observation count (most popular first)
- Filtered to iNaturalist species (highest image quality)

### 2. Species Database (`/ancestry/database`)

Alphabetical browsing interface for scientific research.

**Features:**
- A-Z letter navigation
- Shows all species for selected letter
- Table view with Scientific Name, Common Name, Family, Characteristics
- Click-through to species detail pages

### 3. Species Detail Page (`/ancestry/species/[uuid]`)

Detailed view for individual species.

**Features:**
- High-quality species image
- Scientific name, common name, family, genus
- Characteristics tags
- Habitat and edibility information
- Wikipedia link (when available)
- Related species suggestions

## API Routes

### `/api/ancestry` (GET)

Main endpoint for fetching species list.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Results per page (max 10,000) |
| `page` | number | 1 | Page number |
| `sort` | string | alphabetical | Sort mode: `popular` or `alphabetical` |
| `prefix` | string | - | Filter by name prefix (A-Z) |
| `rank` | string | species | Filter by rank: `species` or `all` |
| `source` | string | - | Filter by source: `inat`, `gbif`, `mycobank`, `all` |
| `query` | string | - | Search query |
| `filter` | string | - | Category filter |
| `category` | string | - | Edible/Medicinal/Poisonous filter |

**Response:**
```json
{
  "species": [
    {
      "id": 12345,
      "uuid": "870ac0b1-4dff-4471-a87a-28a5c6b197a6",
      "scientific_name": "Amanita muscaria",
      "common_name": "Fly Agaric",
      "family": "Amanitaceae",
      "description": "...",
      "image_url": "https://...",
      "characteristics": ["species", "Very Common", "Source: inat"],
      "habitat": "Forest",
      "edibility": "poisonous",
      "observations_count": 50000,
      "wikipedia_url": "https://en.wikipedia.org/wiki/Amanita_muscaria",
      "rank": "species",
      "source": "inat"
    }
  ],
  "total": 15859,
  "page": 1,
  "pages": 159,
  "source": "mindex"
}
```

### `/api/ancestry/[id]` (GET)

Fetch single species by UUID or numeric ID.

**Priority Order:**
1. MINDEX API (by UUID)
2. Local Neon database (by numeric ID)
3. Static fallback data
4. iNaturalist API (for external IDs)

## MINDEX Service (`lib/services/mindex-service.ts`)

TypeScript service for interacting with MINDEX API.

### Functions

```typescript
// Check MINDEX health
getHealthStatus(): Promise<HealthStatus>

// Fetch all species
getAllSpecies(options?: GetSpeciesOptions): Promise<Species[]>

// Get species by UUID
getSpeciesByUUID(uuid: string): Promise<Species | null>

// Get species by iNaturalist ID
getSpeciesByInatId(inatId: number): Promise<Species | null>

// Search species by name
searchSpecies(query: string, limit?: number): Promise<Species[]>
```

### Image Extraction

The service correctly extracts images from MINDEX metadata:

```typescript
function extractImageUrl(metadata?: MINDEXTaxon["metadata"]): string | null {
  if (!metadata) return null

  // Priority 1: medium_url from default_photo
  if (metadata.default_photo?.medium_url) {
    return metadata.default_photo.medium_url
  }
  
  // Priority 2: url from default_photo (convert square to medium)
  if (metadata.default_photo?.url) {
    return metadata.default_photo.url.replace("square", "medium")
  }
  
  // Priority 3: First photo from photos array
  if (metadata.photos && metadata.photos.length > 0) {
    return metadata.photos[0].medium_url || metadata.photos[0].url
  }
  
  return null
}
```

## Routing

Species detail pages use **stable UUIDs** from MINDEX:

```typescript
// Explorer page links
<Link href={`/ancestry/species/${species.uuid}`}>

// Database page links  
<Link href={`/ancestry/species/${species.uuid}`}>
```

This ensures clicking a species card always opens the correct species, regardless of list sorting or pagination.

## Environment Variables

```env
# MINDEX API connection
MINDEX_API_URL=http://localhost:8000
MINDEX_API_BASE_URL=http://localhost:8000
MINDEX_API_KEY=local-dev-key

# Fallback database (Neon)
DATABASE_URL=postgresql://...
```

## Caching

The API route uses Next.js caching:

```typescript
fetch(url, {
  headers: { "X-API-Key": MINDEX_API_KEY },
  next: { revalidate: 60 }, // Cache for 60 seconds
})
```

To force refresh, restart the website container or wait for cache expiration.

## Homepage Search Integration

The homepage search (`/search`) queries:
1. Local species database
2. Compounds database
3. iNaturalist API (for fallback)

Search results show:
- Species with images and descriptions
- Compounds with formulas and sources
- Source attribution (Mycosoft, iNaturalist, ChemSpider)

## Troubleshooting

### Species count is lower than expected

1. Check the source filter (default is `inat` for popular view)
2. Switch to "All Sources" in the dataset selector
3. Clear browser cache or restart website container

### Images not showing on species detail page

1. Verify MINDEX has the image in metadata
2. Check browser console for CORS errors
3. Ensure `extractImageUrl()` is correctly parsing metadata

### Species detail shows wrong species

1. Ensure links use `uuid` not `id`
2. Check that MINDEX API returns correct taxon for UUID
3. Verify no caching issues

## Recent Changes (January 2026)

### Routing Fixes
- Changed species links from numeric `id` to stable `uuid`
- Updated Explorer and Database pages to use UUIDs
- Fixed API route to prioritize UUID lookups

### Image Display Fixes
- Fixed `MINDEXTaxon` interface to include `default_photo` structure
- Created `extractImageUrl()` helper function
- Added `extractCharacteristics()` for consistent tagging

### API Improvements
- Added `rank` and `source` query parameters
- Implemented proper pagination with `limit` and `offset`
- Added fallback to iNaturalist/GBIF when MINDEX unavailable

## Component Structure

```
app/
├── ancestry/
│   ├── explorer/
│   │   └── page.tsx          # Species Explorer
│   ├── database/
│   │   └── page.tsx          # Alphabetical Database
│   └── species/
│       └── [id]/
│           └── page.tsx      # Species Detail
├── api/
│   └── ancestry/
│       ├── route.ts          # List/search species
│       └── [id]/
│           └── route.ts      # Single species
└── search/
    └── page.tsx              # Homepage search results

lib/
└── services/
    └── mindex-service.ts     # MINDEX API client
```

## Contributing

1. Test changes locally with MINDEX running
2. Verify species links use UUIDs
3. Ensure images display correctly
4. Submit pull request with screenshots

## License

Proprietary - Mycosoft Inc.
