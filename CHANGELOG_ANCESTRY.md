# Ancestry Module Changelog

All notable changes to the Ancestry/Species module.

## [2.1.0] - 2026-01-12

### Added
- **MINDEX Service** (`lib/services/mindex-service.ts`)
  - TypeScript client for MINDEX API
  - Image extraction from metadata
  - Characteristics parsing
  - UUID-based species lookup
- **Dataset Selector** in Explorer
  - Popular (iNaturalist) - Default
  - All Species (All sources)
  - All Taxa (All ranks)
- **Source Filter** in Explorer
  - iNaturalist
  - GBIF
  - MycoBank
  - All Sources
- **Pagination** - "Load More" button for Explorer

### Changed
- **Species Links** - Now use stable UUIDs instead of synthetic numeric IDs
- **API Route** - Added `rank`, `source`, `prefix` parameters
- **Image Display** - Fixed extraction from MINDEX metadata structure
- **Database Page** - Shows up to 500 species per letter

### Fixed
- **Wrong Species on Click** - Fixed by using UUIDs for routing
- **Missing Images on Detail Page** - Fixed metadata parsing
- **Species Count** - Now correctly shows total from MINDEX
- **Caching Issues** - Added 60-second revalidation

### API Changes

#### `/api/ancestry` Endpoint

New parameters:
| Parameter | Description |
|-----------|-------------|
| `rank` | Filter by `species` or `all` |
| `source` | Filter by `inat`, `gbif`, `mycobank`, or `all` |
| `prefix` | Filter by name prefix (A-Z) |

Updated response:
```json
{
  "species": [...],
  "total": 15859,
  "page": 1,
  "pages": 159,
  "source": "mindex",
  "database_stats": {
    "total_taxa": 15859,
    "per_page": 100
  }
}
```

### Components Updated
- `app/ancestry/explorer/page.tsx`
- `app/ancestry/database/page.tsx`
- `app/ancestry/species/[id]/page.tsx`
- `app/api/ancestry/route.ts`
- `app/api/ancestry/[id]/route.ts`

## [2.0.0] - 2026-01-10

### Added
- NatureOS sidebar integration
- Species detail pages
- Phylogeny visualization placeholder

### Changed
- Migrated to NatureOS layout
- Updated styling for dark theme

## [1.0.0] - 2025-12-01

### Added
- Initial Ancestry module
- Species Explorer
- Basic search
- Static species data
