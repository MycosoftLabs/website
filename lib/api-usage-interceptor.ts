/**
 * API usage interceptor
 *
 * Intercepts fetch calls to log API usage for MYCA data intake visibility.
 * Batches and sends logs every 10 seconds.
 */

const BATCH_INTERVAL_MS = 10_000
const SKIP_PATTERNS = ["/api/presence/", "/api/usage/", "_next"]

interface ApiUsageEvent {
  endpoint: string
  method: string
  status_code: number | null
  response_time_ms: number
  request_size_bytes: number | null
  response_size_bytes: number | null
}

const buffer: ApiUsageEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function shouldLog(url: string): boolean {
  try {
    const path = new URL(url, "http://localhost").pathname
    return !SKIP_PATTERNS.some((p) => path.includes(p))
  } catch {
    return false
  }
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, BATCH_INTERVAL_MS)
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return

  const batch = buffer.splice(0, 100)

  try {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
    await fetch(`${baseUrl}/api/presence/api-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      credentials: "include",
    })
  } catch {
    buffer.unshift(...batch)
  }
}

function getRequestSize(request: Request): number | null {
  try {
    const len = request.headers.get("Content-Length")
    if (len) return parseInt(len, 10)
    return null
  } catch {
    return null
  }
}

export function initApiUsageInterceptor(): void {
  if (typeof window === "undefined") return

  const originalFetch = window.fetch
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const request = typeof input === "string" ? new Request(input, init) : input instanceof Request ? input : new Request(input.toString(), init)
    const url = request.url

    if (!shouldLog(url)) {
      return originalFetch.call(this, input, init)
    }

    const start = performance.now()
    const requestSize = request.body ? getRequestSize(request) : 0

    try {
      const response = await originalFetch.call(this, input, init)

      const elapsed = Math.round(performance.now() - start)
      let responseSize: number | null = null
      try {
        const cloned = response.clone()
        const blob = await cloned.blob()
        responseSize = blob.size
      } catch {
        // Ignore
      }

      buffer.push({
        endpoint: new URL(url).pathname,
        method: request.method,
        status_code: response.status,
        response_time_ms: elapsed,
        request_size_bytes: requestSize,
        response_size_bytes: responseSize,
      })
      scheduleFlush()

      return response
    } catch (err) {
      const elapsed = Math.round(performance.now() - start)
      buffer.push({
        endpoint: new URL(url).pathname,
        method: request.method,
        status_code: null,
        response_time_ms: elapsed,
        request_size_bytes: request.body ? getRequestSize(request) : null,
        response_size_bytes: null,
      })
      scheduleFlush()
      throw err
    }
  }
}
