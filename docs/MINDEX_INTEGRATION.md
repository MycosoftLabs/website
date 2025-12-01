# MINDEX Integration Guide

## Overview

MINDEX is Mycosoft's internal multi-model database hosted on Azure Cosmos DB. It serves as the central data repository for all fungal species information, research papers, images, and observations. MINDEX feeds data to NatureOS and is orchestrated by the MYCA Multi-Agent System.

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Mycosoft Website                      │
│                   (Next.js Frontend)                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  MINDEX Client Layer                     │
│              (lib/services/mindex-client.ts)             │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  MINDEX  │   │   MYCA   │   │ NatureOS │
│ (Cosmos) │◄──│   MAS    │◄──│  System  │
└──────────┘   └──────────┘   └──────────┘
     Azure      Orchestrator    Bio OS
\`\`\`

## Collections

### 1. Species Collection
Stores comprehensive fungal species information:
- Scientific name, common names
- Taxonomy and classification
- Physical descriptions
- Habitat and distribution
- Conservation status
- Images and media
- External IDs (iNaturalist, FungiDB, MycoBank)

### 2. Papers Collection
Research papers and scientific articles:
- Title, abstract, authors
- Publication year and journal
- DOI and external links
- Related species references
- Full text (where available)

### 3. Images Collection
High-quality fungal images:
- Species ID reference
- Image URL (stored in Azure Blob)
- Attribution and licensing
- Metadata (location, date, photographer)

### 4. Observations Collection
Field observations from iNaturalist and other sources:
- Species ID reference
- Location (lat/long)
- Date and time
- Observer information
- Quality grade

## MYCA Integration

MYCA (Mycosoft Multi-Agent System) orchestrates data collection and synchronization:

1. **Scraping Agents**: Fetch data from external sources
   - iNaturalist API
   - Wikipedia API
   - FungiDB
   - MycoBank
   - mushroom.world

2. **Validation Agents**: Verify and clean data
   - Taxonomy validation
   - Data deduplication
   - Image quality checks

3. **Aggregation Agents**: Merge data from multiple sources
   - Intelligent conflict resolution
   - Priority-based merging
   - Relationship mapping

## Usage

### Connecting to MINDEX

\`\`\`typescript
import { mindexClient } from '@/lib/services/mindex-client'

// Connect
await mindexClient.connect()

// Check connection
if (mindexClient.isConnected()) {
  // Perform operations
}

// Disconnect when done
await mindexClient.disconnect()
\`\`\`

### Querying Species

\`\`\`typescript
// Get species by ID
const species = await mindexClient.getSpecies('121657')

// Search species
const results = await mindexClient.searchSpecies('lion', 10)

// Upsert species
await mindexClient.upsertSpecies({
  id: '121657',
  scientificName: 'Hericium erinaceus',
  commonNames: ["Lion's Mane"],
  // ... other fields
})
\`\`\`

### MYCA Orchestration

\`\`\`typescript
import { mycaOrchestrator } from '@/lib/services/myca-orchestrator'

// Submit scraping task
const taskId = await mycaOrchestrator.scrapeSpecies(
  'Hericium erinaceus',
  ['inaturalist', 'wikipedia']
)

// Check task status
const status = await mycaOrchestrator.getTaskStatus(taskId)
\`\`\`

## Data Population

Run the population script to seed MINDEX:

\`\`\`bash
npm run populate-mindex
# or
node scripts/populate-mindex.ts
\`\`\`

This will:
1. Submit scraping tasks to MYCA for top fungal species
2. MYCA agents fetch data from all sources
3. Data is validated and merged
4. Clean data is stored in MINDEX
5. Images are uploaded to Azure Blob Storage

## Environment Variables

Required variables:

\`\`\`env
# MINDEX (Azure Cosmos DB)
MONGODB_ENDPOINT_URL=your_cosmos_endpoint
MONGODB_API_KEY=your_cosmos_key

# MYCA Orchestrator
MYCA_API_URL=http://localhost:8001
MYCA_API_KEY=your_myca_api_key

# Azure Blob Storage (for images)
BLOB_READ_WRITE_TOKEN=your_blob_token
\`\`\`

## Benefits

1. **Fast Performance**: All data cached locally in Azure
2. **Offline Capable**: No dependency on external APIs
3. **Consistent Data**: Single source of truth
4. **Real-time Updates**: MYCA continuously syncs new data
5. **Intelligent Aggregation**: Best data from multiple sources
6. **Scalable**: Azure Cosmos DB handles global distribution

## Fallback Strategy

The system includes graceful fallbacks:

1. **Primary**: Query MINDEX
2. **Secondary**: If not found, query external APIs
3. **Cache**: Store external data in MINDEX for future use
4. **Background Sync**: MYCA populates missing data asynchronously

This ensures the website always works, even if MINDEX is temporarily unavailable.
