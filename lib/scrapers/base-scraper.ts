/**
 * Base Scraper Class
 * 
 * Abstract base class for all Mycosoft scrapers.
 * Provides common functionality for scraping, parsing, caching, and error handling.
 */

import type { ScraperConfig, ScrapedData, ScraperResult, ScraperMetadata } from "./types"
import { getScraperCache } from "./cache"

export abstract class BaseScraper<T = unknown> {
  protected config: ScraperConfig
  protected cache = getScraperCache()

  constructor(config: ScraperConfig) {
    this.config = config
  }

  /**
   * Abstract method - implement actual scraping logic
   */
  protected abstract scrape(): Promise<T>

  /**
   * Abstract method - validate scraped data
   */
  protected abstract validate(data: T): boolean

  /**
   * Get scraper ID
   */
  get id(): string {
    return this.config.id
  }

  /**
   * Get scraper category
   */
  get category() {
    return this.config.category
  }

  /**
   * Execute the scraper with caching and error handling
   */
  async execute(): Promise<ScraperResult<T>> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: "Scraper is disabled",
      }
    }

    // Check cache first
    const cached = this.cache.getLatest<T>(this.config.id)
    if (cached) {
      console.log(`[Scraper:${this.config.id}] Using cached data`)
      return {
        success: true,
        data: cached,
      }
    }

    const startTime = Date.now()
    let lastError: string | undefined

    // Retry loop
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`[Scraper:${this.config.id}] Attempt ${attempt}/${this.config.retryAttempts}`)
        
        const rawData = await this.scrapeWithTimeout()
        
        if (!this.validate(rawData)) {
          throw new Error("Data validation failed")
        }

        const scrapedData = this.wrapData(rawData, Date.now() - startTime)
        
        // Store in cache
        const cacheKey = `${this.config.id}_${Date.now()}`
        this.cache.set(cacheKey, scrapedData, this.config.category)

        console.log(`[Scraper:${this.config.id}] Success - ${scrapedData.metadata.itemCount} items`)
        
        return {
          success: true,
          data: scrapedData,
          nextScrapeAt: new Date(Date.now() + this.config.intervalMs).toISOString(),
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.error(`[Scraper:${this.config.id}] Attempt ${attempt} failed: ${lastError}`)
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempt)
        }
      }
    }

    return {
      success: false,
      error: lastError || "Unknown error",
    }
  }

  /**
   * Wrap raw data with metadata
   */
  protected wrapData(data: T, durationMs: number): ScrapedData<T> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.intervalMs)

    const metadata: ScraperMetadata = {
      scrapeDurationMs: durationMs,
      parseStatus: "success",
      itemCount: this.countItems(data),
      version: "1.0.0",
    }

    return {
      id: `${this.config.id}_${now.getTime()}`,
      scraperId: this.config.id,
      sourceUrl: this.config.sourceUrl,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      data,
      metadata,
    }
  }

  /**
   * Count items in data (override for custom counting)
   */
  protected countItems(data: T): number {
    if (Array.isArray(data)) {
      return data.length
    }
    if (typeof data === "object" && data !== null) {
      return Object.keys(data).length
    }
    return 1
  }

  /**
   * Scrape with timeout
   */
  private async scrapeWithTimeout(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Scrape timeout after ${this.config.timeout}ms`))
      }, this.config.timeout)

      this.scrape()
        .then((result) => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Fetch with standard headers
   */
  protected async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.text()
  }

  /**
   * Parse HTML and extract text content
   */
  protected extractText(html: string, startMarker: string, endMarker: string): string | null {
    const startIdx = html.indexOf(startMarker)
    if (startIdx === -1) return null
    
    const contentStart = startIdx + startMarker.length
    const endIdx = html.indexOf(endMarker, contentStart)
    if (endIdx === -1) return null
    
    return html.substring(contentStart, endIdx).trim()
  }

  /**
   * Extract all matches for a pattern
   */
  protected extractMatches(html: string, pattern: RegExp): string[] {
    const matches: string[] = []
    let match
    while ((match = pattern.exec(html)) !== null) {
      matches.push(match[1] || match[0])
    }
    return matches
  }
}
