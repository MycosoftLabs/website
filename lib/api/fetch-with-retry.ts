/**
 * Fetch with Retry Utility
 * 
 * Provides automatic retry logic for external API calls with:
 * - Configurable retry count and delay
 * - Exponential backoff option
 * - Timeout handling
 * - Error classification
 */

export interface FetchWithRetryOptions extends RequestInit {
  /** Number of retry attempts (default: 3) */
  retries?: number
  /** Initial delay between retries in ms (default: 500) */
  retryDelay?: number
  /** Use exponential backoff for retries (default: true) */
  exponentialBackoff?: boolean
  /** Request timeout in ms (default: 10000) */
  timeout?: number
  /** Only retry on these status codes (default: [408, 429, 500, 502, 503, 504]) */
  retryOnStatus?: number[]
}

export interface FetchResult<T> {
  data: T | null
  error: string | null
  status: number
  retries: number
  duration: number
}

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * Fetch with automatic retry on failure
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<FetchResult<T>> {
  const {
    retries = 3,
    retryDelay = 500,
    exponentialBackoff = true,
    timeout = 10000,
    retryOnStatus = DEFAULT_RETRY_STATUS_CODES,
    ...fetchOptions
  } = options

  const startTime = Date.now()
  let lastError: string | null = null
  let lastStatus = 0
  let attemptCount = 0

  for (let attempt = 0; attempt <= retries; attempt++) {
    attemptCount = attempt
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      lastStatus = response.status

      // Success
      if (response.ok) {
        const data = await response.json()
        return {
          data,
          error: null,
          status: response.status,
          retries: attempt,
          duration: Date.now() - startTime,
        }
      }

      // Non-retryable error
      if (!retryOnStatus.includes(response.status)) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorBody = await response.json()
          errorMessage = errorBody.error || errorBody.message || errorMessage
        } catch {
          // Ignore parse errors
        }
        return {
          data: null,
          error: errorMessage,
          status: response.status,
          retries: attempt,
          duration: Date.now() - startTime,
        }
      }

      // Retryable error - continue loop
      lastError = `HTTP ${response.status}`
    } catch (err) {
      clearTimeout(timeoutId)
      
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          lastError = `Request timeout after ${timeout}ms`
          lastStatus = 408
        } else {
          lastError = err.message
          lastStatus = 0
        }
      } else {
        lastError = "Unknown error"
        lastStatus = 0
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < retries) {
      const delay = exponentialBackoff
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay
      await sleep(delay)
    }
  }

  return {
    data: null,
    error: lastError || "Request failed after retries",
    status: lastStatus,
    retries: attemptCount,
    duration: Date.now() - startTime,
  }
}

/**
 * Helper to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a fetch wrapper with preconfigured retry options
 */
export function createRetryFetcher(defaultOptions: FetchWithRetryOptions) {
  return function <T = unknown>(url: string, options?: FetchWithRetryOptions) {
    return fetchWithRetry<T>(url, { ...defaultOptions, ...options })
  }
}

/**
 * Standard fetchers for different use cases
 */
export const externalApiFetcher = createRetryFetcher({
  retries: 3,
  retryDelay: 500,
  timeout: 10000,
})

export const internalApiFetcher = createRetryFetcher({
  retries: 2,
  retryDelay: 200,
  timeout: 5000,
})

export const mindexApiFetcher = createRetryFetcher({
  retries: 3,
  retryDelay: 300,
  timeout: 8000,
})

export const masApiFetcher = createRetryFetcher({
  retries: 2,
  retryDelay: 250,
  timeout: 6000,
})
