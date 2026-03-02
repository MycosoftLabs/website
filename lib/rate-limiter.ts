/**
 * In-memory rate limiter for LLM API routes.
 *
 * Protects all AI provider calls from accidental credit burn.
 * Uses a sliding-window token-bucket approach per IP address.
 *
 * Defaults (can be overridden per route):
 *  - 10 requests per minute per IP
 *  - 100 requests per hour per IP
 *  - Global cap: 500 requests per hour across ALL IPs
 */

interface RateLimitEntry {
  /** Timestamps (ms) of recent requests */
  timestamps: number[]
}

interface RateLimiterOptions {
  /** Max requests per window per IP */
  maxPerWindow?: number
  /** Window size in milliseconds */
  windowMs?: number
  /** Global max requests per hour (across all IPs) */
  globalMaxPerHour?: number
}

const DEFAULT_OPTIONS: Required<RateLimiterOptions> = {
  maxPerWindow: 10,
  windowMs: 60_000, // 1 minute
  globalMaxPerHour: 500,
}

class RateLimiter {
  private buckets = new Map<string, RateLimitEntry>()
  private globalTimestamps: number[] = []
  private opts: Required<RateLimiterOptions>
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(options?: RateLimiterOptions) {
    this.opts = { ...DEFAULT_OPTIONS, ...options }

    // Clean up stale entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300_000)
    // Don't prevent Node from exiting
    if (this.cleanupInterval?.unref) this.cleanupInterval.unref()
  }

  /**
   * Check if a request is allowed. Returns { allowed, retryAfterMs }.
   */
  check(ip: string): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now()

    // --- Per-IP rate limit ---
    let entry = this.buckets.get(ip)
    if (!entry) {
      entry = { timestamps: [] }
      this.buckets.set(ip, entry)
    }

    // Remove timestamps outside the window
    const windowStart = now - this.opts.windowMs
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

    if (entry.timestamps.length >= this.opts.maxPerWindow) {
      const oldestInWindow = entry.timestamps[0]
      const retryAfterMs = oldestInWindow + this.opts.windowMs - now
      return {
        allowed: false,
        retryAfterMs: Math.max(retryAfterMs, 1000),
        reason: `Rate limit: max ${this.opts.maxPerWindow} requests per ${this.opts.windowMs / 1000}s`,
      }
    }

    // --- Global hourly rate limit ---
    const hourAgo = now - 3_600_000
    this.globalTimestamps = this.globalTimestamps.filter((t) => t > hourAgo)

    if (this.globalTimestamps.length >= this.opts.globalMaxPerHour) {
      const oldestGlobal = this.globalTimestamps[0]
      const retryAfterMs = oldestGlobal + 3_600_000 - now
      return {
        allowed: false,
        retryAfterMs: Math.max(retryAfterMs, 1000),
        reason: `Global rate limit: max ${this.opts.globalMaxPerHour} requests per hour`,
      }
    }

    // Allow the request
    entry.timestamps.push(now)
    this.globalTimestamps.push(now)
    return { allowed: true }
  }

  /** Remove entries older than 2x the window to prevent memory leak */
  private cleanup() {
    const cutoff = Date.now() - this.opts.windowMs * 2
    for (const [ip, entry] of this.buckets.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
      if (entry.timestamps.length === 0) {
        this.buckets.delete(ip)
      }
    }
  }
}

// ─── Shared limiters for different route categories ───

/** MYCA Chat: 10 requests/minute, 100/hour global */
export const chatLimiter = new RateLimiter({
  maxPerWindow: 10,
  windowMs: 60_000,
  globalMaxPerHour: 100,
})

/** AI Search: 15 requests/minute, 200/hour global */
export const searchLimiter = new RateLimiter({
  maxPerWindow: 15,
  windowMs: 60_000,
  globalMaxPerHour: 200,
})

/** Voice Orchestrator: 5 requests/minute (voice is expensive), 50/hour global */
export const voiceLimiter = new RateLimiter({
  maxPerWindow: 5,
  windowMs: 60_000,
  globalMaxPerHour: 50,
})

/** Health Check: 3 requests/minute (each call hits ALL providers), 30/hour global */
export const healthCheckLimiter = new RateLimiter({
  maxPerWindow: 3,
  windowMs: 60_000,
  globalMaxPerHour: 30,
})

/**
 * Helper: Extract client IP from Next.js request.
 * Returns "unknown" as fallback (still rate-limited under that bucket).
 */
export function getClientIP(request: Request): string {
  // Next.js / Vercel / Cloudflare headers
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp

  return "unknown"
}

/**
 * Helper: Create a 429 Too Many Requests response.
 */
export function rateLimitResponse(retryAfterMs: number, reason?: string) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000)
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: reason || "Rate limit exceeded. Please try again later.",
      retryAfter: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  )
}
