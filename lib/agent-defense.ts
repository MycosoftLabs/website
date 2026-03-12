/**
 * Agent Defense System - March 2026
 *
 * Protects against mass automated agent traffic (AI agents, bots, scrapers)
 * hitting API routes, MCP endpoints, and SSE streams.
 *
 * Three layers:
 *  1. Agent Detection  — classify requests as browser / known-agent / unknown-bot
 *  2. Tiered Rate Limits — agents get much stricter per-IP and global limits
 *  3. Circuit Breaker   — auto-reject when global request rate exceeds safe threshold
 */

// ─── Agent Classification ──────────────────────────────────────────────────────

export type ClientTier = "browser" | "authenticated" | "known-agent" | "unknown-bot"

/** User-Agent substrings that identify known AI agent / CLI frameworks */
const KNOWN_AGENT_PATTERNS = [
  // AI assistants and SDKs
  "claude-code",
  "anthropic",
  "openai",
  "gpt",
  "langchain",
  "autogpt",
  "auto-gpt",
  "babyagi",
  "crewai",
  "crew-ai",
  "agent-sdk",
  // MCP clients
  "mcp-client",
  "model-context-protocol",
  "modelcontextprotocol",
  // Generic bot / automation patterns
  "python-requests",
  "python-httpx",
  "aiohttp",
  "axios/",
  "node-fetch",
  "undici",
  "got/",
  "httpie",
  "curl/",
  "wget/",
  "scrapy",
  "puppeteer",
  "playwright",
  "selenium",
  "headless",
  "phantomjs",
  // Common bot identifiers
  "bot",
  "crawler",
  "spider",
  "scraper",
]

/** Paths that are especially expensive or sensitive — get the strictest limits */
const HIGH_COST_PATH_PREFIXES = [
  "/api/chat",
  "/api/ai",
  "/api/voice",
  "/api/stream",
  "/api/research",
  "/api/search",
  "/api/docker",
  "/api/admin",
  "/api/security",
  "/api/pentest",
  "/api/autonomous",
  "/api/firmware",
  "/api/services",
]

/** Paths that should remain open (health checks, public data) */
const EXEMPT_PATH_PREFIXES = [
  "/api/health",
  "/_next/",
  "/favicon.ico",
]

/**
 * Classify a request into a client tier based on headers and behavior.
 */
export function classifyClient(
  userAgent: string | null,
  hasSessionCookie: boolean,
  hasAuthHeader: boolean
): ClientTier {
  if (hasSessionCookie && hasAuthHeader) return "authenticated"
  if (hasSessionCookie) return "browser"

  const ua = (userAgent || "").toLowerCase()

  // No User-Agent at all — almost certainly automated
  if (!ua) return "unknown-bot"

  // Check for known agent patterns
  for (const pattern of KNOWN_AGENT_PATTERNS) {
    if (ua.includes(pattern)) return "known-agent"
  }

  // Heuristic: real browsers always include "mozilla" in UA
  if (!ua.includes("mozilla/")) return "unknown-bot"

  return "browser"
}

/**
 * Check if a path is exempt from agent defense (health checks, static assets).
 */
export function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

/**
 * Check if a path is high-cost (AI, streaming, admin).
 */
export function isHighCostPath(pathname: string): boolean {
  return HIGH_COST_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

// ─── Tiered Rate Limiter ────────────────────────────────────────────────────────

interface TierLimits {
  /** Max requests per minute per IP */
  perMinutePerIP: number
  /** Max requests per hour per IP */
  perHourPerIP: number
  /** Max concurrent SSE/stream connections per IP */
  maxConcurrentStreams: number
}

/** Rate limits by client tier — agents are heavily restricted */
const TIER_LIMITS: Record<ClientTier, TierLimits> = {
  authenticated: {
    perMinutePerIP: 120,
    perHourPerIP: 3000,
    maxConcurrentStreams: 10,
  },
  browser: {
    perMinutePerIP: 60,
    perHourPerIP: 1500,
    maxConcurrentStreams: 5,
  },
  "known-agent": {
    perMinutePerIP: 10,
    perHourPerIP: 100,
    maxConcurrentStreams: 2,
  },
  "unknown-bot": {
    perMinutePerIP: 5,
    perHourPerIP: 30,
    maxConcurrentStreams: 1,
  },
}

/** High-cost path multiplier — divide normal limits by this */
const HIGH_COST_DIVISOR = 3

interface IPBucket {
  minuteTimestamps: number[]
  hourTimestamps: number[]
  activeStreams: number
}

class TieredRateLimiter {
  private buckets = new Map<string, IPBucket>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 120_000)
    if (this.cleanupTimer?.unref) this.cleanupTimer.unref()
  }

  check(
    ip: string,
    tier: ClientTier,
    isHighCost: boolean,
    isStream: boolean
  ): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now()
    let bucket = this.buckets.get(ip)
    if (!bucket) {
      bucket = { minuteTimestamps: [], hourTimestamps: [], activeStreams: 0 }
      this.buckets.set(ip, bucket)
    }

    // Clean old timestamps
    const oneMinuteAgo = now - 60_000
    const oneHourAgo = now - 3_600_000
    bucket.minuteTimestamps = bucket.minuteTimestamps.filter((t) => t > oneMinuteAgo)
    bucket.hourTimestamps = bucket.hourTimestamps.filter((t) => t > oneHourAgo)

    const limits = TIER_LIMITS[tier]
    const divisor = isHighCost ? HIGH_COST_DIVISOR : 1
    const maxPerMinute = Math.max(1, Math.floor(limits.perMinutePerIP / divisor))
    const maxPerHour = Math.max(1, Math.floor(limits.perHourPerIP / divisor))

    // Check per-minute limit
    if (bucket.minuteTimestamps.length >= maxPerMinute) {
      const oldest = bucket.minuteTimestamps[0]
      const retryAfterMs = oldest + 60_000 - now
      return {
        allowed: false,
        retryAfterMs: Math.max(retryAfterMs, 1000),
        reason: `Rate limit: ${maxPerMinute} req/min for ${tier} clients`,
      }
    }

    // Check per-hour limit
    if (bucket.hourTimestamps.length >= maxPerHour) {
      const oldest = bucket.hourTimestamps[0]
      const retryAfterMs = oldest + 3_600_000 - now
      return {
        allowed: false,
        retryAfterMs: Math.max(retryAfterMs, 1000),
        reason: `Rate limit: ${maxPerHour} req/hour for ${tier} clients`,
      }
    }

    // Check stream concurrency
    if (isStream && bucket.activeStreams >= limits.maxConcurrentStreams) {
      return {
        allowed: false,
        retryAfterMs: 5000,
        reason: `Max ${limits.maxConcurrentStreams} concurrent streams for ${tier} clients`,
      }
    }

    // Allow
    bucket.minuteTimestamps.push(now)
    bucket.hourTimestamps.push(now)
    if (isStream) bucket.activeStreams++
    return { allowed: true }
  }

  /** Call when an SSE/stream connection closes */
  releaseStream(ip: string) {
    const bucket = this.buckets.get(ip)
    if (bucket && bucket.activeStreams > 0) {
      bucket.activeStreams--
    }
  }

  private cleanup() {
    const cutoff = Date.now() - 7_200_000 // 2 hours
    for (const [ip, bucket] of this.buckets.entries()) {
      bucket.minuteTimestamps = bucket.minuteTimestamps.filter((t) => t > cutoff)
      bucket.hourTimestamps = bucket.hourTimestamps.filter((t) => t > cutoff)
      if (
        bucket.minuteTimestamps.length === 0 &&
        bucket.hourTimestamps.length === 0 &&
        bucket.activeStreams === 0
      ) {
        this.buckets.delete(ip)
      }
    }
  }
}

// ─── Circuit Breaker ────────────────────────────────────────────────────────────

/**
 * Global circuit breaker that trips when request volume exceeds safe thresholds.
 * When tripped, ALL non-authenticated requests are rejected with 503.
 */
class CircuitBreaker {
  /** Sliding window of global request timestamps */
  private globalTimestamps: number[] = []
  /** When the breaker tripped (0 = not tripped) */
  private trippedAt = 0
  /** How long to stay tripped before allowing requests again */
  private readonly cooldownMs = 30_000 // 30 seconds
  /** Max global requests per minute before tripping */
  private readonly maxGlobalPerMinute: number
  /** Max unique IPs per minute before tripping (agent swarm indicator) */
  private uniqueIPs = new Map<string, number>()
  private readonly maxUniqueIPsPerMinute: number

  constructor(maxGlobalPerMinute = 2000, maxUniqueIPsPerMinute = 500) {
    this.maxGlobalPerMinute = maxGlobalPerMinute
    this.maxUniqueIPsPerMinute = maxUniqueIPsPerMinute

    // Clean up every 30 seconds
    const timer = setInterval(() => this.cleanup(), 30_000)
    if (timer?.unref) timer.unref()
  }

  /**
   * Record a request and check if the breaker is tripped.
   * Returns true if request should be rejected.
   */
  shouldReject(ip: string, tier: ClientTier): boolean {
    const now = Date.now()

    // If tripped, check cooldown
    if (this.trippedAt > 0) {
      if (now - this.trippedAt < this.cooldownMs) {
        // Still in cooldown — only allow authenticated users
        return tier !== "authenticated"
      }
      // Cooldown expired — reset
      this.trippedAt = 0
    }

    // Record request
    this.globalTimestamps.push(now)
    this.uniqueIPs.set(ip, (this.uniqueIPs.get(ip) || 0) + 1)

    // Clean old entries
    const oneMinuteAgo = now - 60_000
    this.globalTimestamps = this.globalTimestamps.filter((t) => t > oneMinuteAgo)

    // Check global request volume
    if (this.globalTimestamps.length > this.maxGlobalPerMinute) {
      this.trippedAt = now
      return tier !== "authenticated"
    }

    // Check unique IP count (swarm detection)
    let uniqueCount = 0
    for (const [, count] of this.uniqueIPs) {
      if (count > 0) uniqueCount++
    }
    if (uniqueCount > this.maxUniqueIPsPerMinute) {
      this.trippedAt = now
      return tier !== "authenticated"
    }

    return false
  }

  isTripped(): boolean {
    if (this.trippedAt === 0) return false
    return Date.now() - this.trippedAt < this.cooldownMs
  }

  private cleanup() {
    const oneMinuteAgo = Date.now() - 60_000
    this.globalTimestamps = this.globalTimestamps.filter((t) => t > oneMinuteAgo)
    // Reset unique IP tracking every minute
    this.uniqueIPs.clear()
  }
}

// ─── Singleton Instances ────────────────────────────────────────────────────────

export const tieredLimiter = new TieredRateLimiter()
export const circuitBreaker = new CircuitBreaker(
  // Configurable via env vars with safe defaults
  parseInt(process.env.AGENT_DEFENSE_MAX_RPM || "2000", 10),
  parseInt(process.env.AGENT_DEFENSE_MAX_UNIQUE_IPS || "500", 10)
)

// ─── Response Helpers ───────────────────────────────────────────────────────────

export function rateLimited429(retryAfterMs: number, reason: string) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000)
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: reason,
      retryAfter: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Reset": String(retryAfterSec),
      },
    }
  )
}

export function serviceUnavailable503() {
  return new Response(
    JSON.stringify({
      error: "Service Unavailable",
      message:
        "Traffic volume exceeds safe thresholds. Authenticated users may continue. Please try again shortly.",
      retryAfter: 30,
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "30",
      },
    }
  )
}
