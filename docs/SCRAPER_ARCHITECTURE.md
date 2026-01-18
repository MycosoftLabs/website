# Mycosoft Scraper Microservice Architecture

**Created:** January 15, 2026  
**Author:** AI Assistant (Claude)  
**Status:** Production Ready

---

## Overview

The Mycosoft Scraper Microservice is a modular, extensible system for ingesting data from web sources that don't provide direct APIs. It enables 24/7/365 data collection for CREP, NatureOS, Earth Simulator, and MINDEX.

### Key Features

- **Scheduled Scraping**: Configurable intervals per scraper
- **In-Memory Caching**: Fast access with automatic expiration
- **Error Recovery**: Exponential backoff on failures
- **Concurrency Control**: Rate limiting to avoid IP blocks
- **Category Organization**: Group scrapers by data type
- **API Integration**: RESTful endpoints for management

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MYCOSOFT SCRAPERS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │ SpaceWeather│    │  Fungi      │    │  Earth      │            │
│  │ Scraper     │    │  Scraper    │    │  Imagery    │   ...more  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│         │                  │                  │                    │
│         └──────────────────┼──────────────────┘                    │
│                            │                                        │
│                    ┌───────▼───────┐                               │
│                    │   Scheduler   │  (manages intervals,          │
│                    │               │   retries, concurrency)       │
│                    └───────┬───────┘                               │
│                            │                                        │
│                    ┌───────▼───────┐                               │
│                    │    Cache      │  (in-memory with TTL,         │
│                    │               │   category indexing)          │
│                    └───────┬───────┘                               │
│                            │                                        │
├────────────────────────────┼────────────────────────────────────────┤
│                            │                                        │
│                    ┌───────▼───────┐                               │
│                    │  API Routes   │  GET /api/scrapers            │
│                    │               │  GET /api/scrapers/space-weather│
│                    └───────┬───────┘                               │
│                            │                                        │
├────────────────────────────┼────────────────────────────────────────┤
│                            │                                        │
│  ┌─────────────┐   ┌──────▼──────┐   ┌─────────────┐              │
│  │    CREP     │◄──┤  Dashboard  │──►│  NatureOS   │              │
│  │  Dashboard  │   │   Data      │   │   System    │              │
│  └─────────────┘   └──────┬──────┘   └─────────────┘              │
│                           │                                         │
│                    ┌──────▼──────┐                                 │
│                    │   MINDEX    │  (knowledge base ingestion)     │
│                    │   Ingest    │                                 │
│                    └─────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
website/lib/scrapers/
├── index.ts              # Module exports
├── types.ts              # TypeScript interfaces
├── base-scraper.ts       # Abstract base class
├── cache.ts              # In-memory cache layer
├── scheduler.ts          # Periodic execution manager
└── spaceweather-scraper.ts # First implementation

website/app/api/scrapers/
├── route.ts              # Main scraper management API
└── space-weather/
    └── route.ts          # Space weather specific endpoint
```

---

## Creating a New Scraper

### Step 1: Define Types (if needed)

Add your data types to `lib/scrapers/types.ts`:

```typescript
export interface MyNewScrapedData {
  field1: string
  field2: number
  items: Array<{
    id: string
    name: string
  }>
}
```

### Step 2: Create Scraper Class

Create a new file `lib/scrapers/my-new-scraper.ts`:

```typescript
import { BaseScraper } from "./base-scraper"
import type { ScraperConfig, MyNewScrapedData } from "./types"

const DEFAULT_CONFIG: ScraperConfig = {
  id: "my-new-scraper",
  name: "My New Scraper",
  description: "Scrapes data from example.com",
  sourceUrl: "https://example.com/data",
  enabled: true,
  intervalMs: 300000,      // 5 minutes
  retryAttempts: 3,
  retryDelayMs: 5000,
  timeout: 30000,
  category: "events",      // or appropriate category
}

export class MyNewScraper extends BaseScraper<MyNewScrapedData> {
  constructor(config?: Partial<ScraperConfig>) {
    super({ ...DEFAULT_CONFIG, ...config })
  }

  protected async scrape(): Promise<MyNewScrapedData> {
    const html = await this.fetchPage(this.config.sourceUrl)
    
    // Parse HTML and extract data
    return {
      field1: this.extractText(html, '<div class="field1">', '</div>') || "",
      field2: parseInt(this.extractText(html, '<span id="count">', '</span>') || "0"),
      items: this.parseItems(html),
    }
  }

  protected validate(data: MyNewScrapedData): boolean {
    return data.field1 !== "" || data.items.length > 0
  }

  private parseItems(html: string): MyNewScrapedData["items"] {
    const matches = this.extractMatches(html, /<item id="([^"]+)">([^<]+)<\/item>/g)
    return matches.map((m, i) => ({
      id: `item-${i}`,
      name: m,
    }))
  }
}

export function createMyNewScraper(config?: Partial<ScraperConfig>): MyNewScraper {
  return new MyNewScraper(config)
}
```

### Step 3: Register in Scheduler

Add to `lib/scrapers/scheduler.ts`:

```typescript
import { createMyNewScraper } from "./my-new-scraper"

private registerDefaults(): void {
  this.register(createSpaceWeatherScraper())
  this.register(createMyNewScraper())  // Add this line
}
```

### Step 4: Export from Index

Add to `lib/scrapers/index.ts`:

```typescript
export { MyNewScraper, createMyNewScraper } from "./my-new-scraper"
```

### Step 5: Create API Route (optional)

Create `app/api/scrapers/my-new/route.ts` for dedicated endpoint access.

---

## API Reference

### GET /api/scrapers

List all registered scrapers and their statuses.

**Query Parameters:**
- `category` (optional): Filter by scraper category

**Response:**
```json
{
  "timestamp": "2026-01-15T16:00:00.000Z",
  "count": 1,
  "scrapers": [
    {
      "id": "spaceweather-com",
      "config": { ... },
      "status": "idle",
      "lastRun": "2026-01-15T15:55:00.000Z",
      "lastSuccess": "2026-01-15T15:55:00.000Z",
      "consecutiveFailures": 0,
      "hasCachedData": true,
      "cachedAt": "2026-01-15T15:55:00.000Z",
      "expiresAt": "2026-01-15T16:00:00.000Z"
    }
  ],
  "cacheStats": {
    "totalEntries": 1,
    "byCategory": { "space_weather": 1 }
  }
}
```

### POST /api/scrapers

Control scrapers and scheduler.

**Actions:**
- `run`: Execute a specific scraper immediately
- `start`: Start the scheduler
- `stop`: Stop the scheduler
- `enable`: Enable a scraper
- `disable`: Disable a scraper

**Request Body:**
```json
{
  "action": "run",
  "scraperId": "spaceweather-com"
}
```

### GET /api/scrapers/space-weather

Get scraped space weather data.

**Response:**
```json
{
  "source": "spaceweather.com",
  "status": "live",
  "timestamp": "2026-01-15T15:55:00.000Z",
  "data": {
    "solarActivity": { ... },
    "solarWind": { ... },
    "geomagneticActivity": { ... },
    "coronalHoles": { ... },
    "cme": { ... },
    "auroraForecast": { ... },
    "sunImages": { ... }
  }
}
```

---

## Configuration

### Scraper Config Options

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Human-readable name |
| `description` | string | What this scraper does |
| `sourceUrl` | string | URL to scrape |
| `enabled` | boolean | Whether scraper is active |
| `intervalMs` | number | Scrape interval in milliseconds |
| `retryAttempts` | number | Max retry attempts on failure |
| `retryDelayMs` | number | Base delay between retries |
| `timeout` | number | Request timeout in milliseconds |
| `category` | ScraperCategory | Data category for organization |

### Categories

- `space_weather` - Solar/geomagnetic data
- `fungi` - Fungal observations
- `flora` - Plant observations
- `fauna` - Animal observations
- `weather` - Weather data
- `vessels` - Ship/boat tracking
- `aircraft` - Flight tracking
- `satellites` - Satellite positions
- `earth_imagery` - Satellite imagery
- `events` - Global events
- `pollution` - Air/water quality

---

## Planned Scrapers

| Scraper | Source | Category | Status |
|---------|--------|----------|--------|
| SpaceWeather.com | spaceweather.com | space_weather | ✅ Complete |
| CelesTrak TLE | celestrak.org | satellites | 🔲 Planned |
| Marine Traffic | marinetraffic.com | vessels | 🔲 Planned |
| FlightAware | flightaware.com | aircraft | 🔲 Planned |
| GOES Imagery | goes.noaa.gov | earth_imagery | 🔲 Planned |
| iNaturalist Fungi | inaturalist.org | fungi | 🔲 Planned |
| USGS Earthquakes | earthquake.usgs.gov | events | 🔲 Planned |
| Volcano Discovery | volcanodiscovery.com | events | 🔲 Planned |
| Carbon Mapper | carbonmapper.org | pollution | 🔲 Planned |

---

## Best Practices

1. **Respect Rate Limits**: Set appropriate intervals (5+ minutes)
2. **Handle Failures Gracefully**: Always return fallback data
3. **Validate Data**: Check for empty/malformed responses
4. **Cache Aggressively**: Reduce load on source servers
5. **Log Everything**: Track scraper health and issues
6. **Use Fallbacks**: Never let dashboards go dark

---

## Integration with MINDEX

Scraped data can be ingested into MINDEX for persistent storage:

```typescript
import { getScraperCache } from "@/lib/scrapers"
import { ingestToMindex } from "@/lib/mindex"

async function syncScraperToMindex() {
  const cache = getScraperCache()
  const data = cache.getByCategory("fungi")
  
  for (const scraped of data) {
    await ingestToMindex({
      source: scraped.scraperId,
      data: scraped.data,
      timestamp: scraped.timestamp,
    })
  }
}
```

---

## Troubleshooting

### Scraper Returns Empty Data
- Check source URL accessibility
- Verify parsing selectors match current page structure
- Increase timeout if page is slow

### High Failure Rate
- Reduce scrape frequency
- Check for IP blocks (use proxy if needed)
- Verify source site is online

### Cache Not Working
- Check cache TTL settings
- Verify cache key uniqueness
- Monitor memory usage

---

## Conclusion

The scraper microservice provides a robust foundation for ingesting data from any web source. By following this guide, you can quickly add new scrapers to feed CREP, NatureOS, Earth Simulator, and MINDEX with live data from around the world.
