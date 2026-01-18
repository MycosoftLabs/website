/**
 * Scraper Scheduler
 * 
 * Manages periodic execution of scrapers and maintains the scraper registry.
 * Handles rate limiting, priority queuing, and failure recovery.
 */

import type { ScraperConfig, ScraperResult, ScraperRegistryEntry, ScraperCategory } from "./types"
import { BaseScraper } from "./base-scraper"
import { createSpaceWeatherScraper } from "./spaceweather-scraper"

interface ScheduledScraper {
  scraper: BaseScraper<unknown>
  entry: ScraperRegistryEntry
  timerId?: ReturnType<typeof setTimeout>
}

class ScraperScheduler {
  private scrapers: Map<string, ScheduledScraper> = new Map()
  private isRunning: boolean = false
  private maxConcurrent: number = 3
  private runningCount: number = 0
  private queue: string[] = []

  constructor() {
    // Register default scrapers
    this.registerDefaults()
  }

  /**
   * Register default scrapers
   */
  private registerDefaults(): void {
    // Space Weather scraper
    this.register(createSpaceWeatherScraper())
  }

  /**
   * Register a scraper
   */
  register<T>(scraper: BaseScraper<T>): void {
    const config = (scraper as unknown as { config: ScraperConfig }).config
    
    this.scrapers.set(scraper.id, {
      scraper: scraper as BaseScraper<unknown>,
      entry: {
        config,
        consecutiveFailures: 0,
        status: "idle",
      },
    })

    console.log(`[Scheduler] Registered scraper: ${scraper.id}`)
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log("[Scheduler] Starting scraper scheduler...")

    // Schedule all enabled scrapers
    for (const [id, scheduled] of this.scrapers.entries()) {
      if (scheduled.entry.config.enabled) {
        this.scheduleScraper(id)
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false
    
    // Clear all timers
    for (const scheduled of this.scrapers.values()) {
      if (scheduled.timerId) {
        clearTimeout(scheduled.timerId)
        scheduled.timerId = undefined
      }
    }

    console.log("[Scheduler] Scheduler stopped")
  }

  /**
   * Schedule a scraper for execution
   */
  private scheduleScraper(id: string): void {
    const scheduled = this.scrapers.get(id)
    if (!scheduled || !this.isRunning) return

    // Clear existing timer
    if (scheduled.timerId) {
      clearTimeout(scheduled.timerId)
    }

    // Calculate delay (with backoff for failures)
    let delay = scheduled.entry.config.intervalMs
    if (scheduled.entry.consecutiveFailures > 0) {
      delay = Math.min(
        delay * Math.pow(2, scheduled.entry.consecutiveFailures),
        3600000 // Max 1 hour
      )
    }

    scheduled.timerId = setTimeout(() => {
      this.executeScraper(id)
    }, delay)
  }

  /**
   * Execute a scraper
   */
  private async executeScraper(id: string): Promise<void> {
    const scheduled = this.scrapers.get(id)
    if (!scheduled) return

    // Check concurrency
    if (this.runningCount >= this.maxConcurrent) {
      this.queue.push(id)
      return
    }

    this.runningCount++
    scheduled.entry.status = "running"
    scheduled.entry.lastRun = new Date().toISOString()

    try {
      const result = await scheduled.scraper.execute()
      
      if (result.success) {
        scheduled.entry.lastSuccess = new Date().toISOString()
        scheduled.entry.consecutiveFailures = 0
        scheduled.entry.status = "idle"
      } else {
        scheduled.entry.consecutiveFailures++
        scheduled.entry.status = "error"
        console.error(`[Scheduler] Scraper ${id} failed: ${result.error}`)
      }
    } catch (error) {
      scheduled.entry.consecutiveFailures++
      scheduled.entry.status = "error"
      console.error(`[Scheduler] Scraper ${id} threw error:`, error)
    }

    this.runningCount--

    // Schedule next run
    this.scheduleScraper(id)

    // Process queue
    if (this.queue.length > 0) {
      const nextId = this.queue.shift()!
      this.executeScraper(nextId)
    }
  }

  /**
   * Run a scraper immediately
   */
  async runNow(id: string): Promise<ScraperResult<unknown>> {
    const scheduled = this.scrapers.get(id)
    if (!scheduled) {
      return { success: false, error: `Scraper ${id} not found` }
    }

    return scheduled.scraper.execute()
  }

  /**
   * Get scraper status
   */
  getStatus(id: string): ScraperRegistryEntry | null {
    return this.scrapers.get(id)?.entry ?? null
  }

  /**
   * Get all scraper statuses
   */
  getAllStatuses(): Record<string, ScraperRegistryEntry> {
    const statuses: Record<string, ScraperRegistryEntry> = {}
    for (const [id, scheduled] of this.scrapers.entries()) {
      statuses[id] = scheduled.entry
    }
    return statuses
  }

  /**
   * Get scrapers by category
   */
  getByCategory(category: ScraperCategory): string[] {
    const ids: string[] = []
    for (const [id, scheduled] of this.scrapers.entries()) {
      if (scheduled.entry.config.category === category) {
        ids.push(id)
      }
    }
    return ids
  }

  /**
   * Enable/disable a scraper
   */
  setEnabled(id: string, enabled: boolean): void {
    const scheduled = this.scrapers.get(id)
    if (!scheduled) return

    scheduled.entry.config.enabled = enabled
    scheduled.entry.status = enabled ? "idle" : "disabled"

    if (enabled && this.isRunning) {
      this.scheduleScraper(id)
    } else if (!enabled && scheduled.timerId) {
      clearTimeout(scheduled.timerId)
      scheduled.timerId = undefined
    }
  }

  /**
   * Update scraper interval
   */
  setInterval(id: string, intervalMs: number): void {
    const scheduled = this.scrapers.get(id)
    if (!scheduled) return

    scheduled.entry.config.intervalMs = intervalMs
    
    if (this.isRunning && scheduled.entry.config.enabled) {
      this.scheduleScraper(id)
    }
  }
}

// Singleton instance
let schedulerInstance: ScraperScheduler | null = null

export function getScraperScheduler(): ScraperScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new ScraperScheduler()
  }
  return schedulerInstance
}

export { ScraperScheduler }
