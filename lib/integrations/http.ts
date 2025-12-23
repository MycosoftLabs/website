/**
 * HTTP Client for Backend Integrations
 *
 * Shared server-side fetch wrapper with:
 * - Timeouts
 * - Retry logic (small, safe)
 * - Structured error objects
 * - Request ID correlation header support
 */

import { v4 as uuidv4 } from "uuid"

export interface HttpClientOptions {
  baseUrl: string
  apiKey?: string
  timeout?: number
  retries?: number
  headers?: Record<string, string>
}

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  timeout?: number
  skipRetry?: boolean
}

export interface HttpError extends Error {
  status?: number
  code: string
  requestId?: string
  details?: Record<string, unknown>
}

const DEFAULT_TIMEOUT = 10000
const DEFAULT_RETRIES = 2
const RETRY_DELAY = 500

export function createHttpClient(options: HttpClientOptions) {
  const { baseUrl, apiKey, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, headers: defaultHeaders = {} } = options

  async function request<T>(endpoint: string, requestOptions: HttpRequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, timeout: reqTimeout = timeout, skipRetry = false } = requestOptions

    const requestId = uuidv4()
    const url = `${baseUrl}${endpoint}`

    const combinedHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      ...defaultHeaders,
      ...headers,
    }

    if (apiKey) {
      combinedHeaders["Authorization"] = `Bearer ${apiKey}`
    }

    const fetchOptions: RequestInit = {
      method,
      headers: combinedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    }

    let lastError: HttpError | null = null
    const maxAttempts = skipRetry ? 1 : retries + 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), reqTimeout)

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorBody = await response.text().catch(() => null)
          let errorData: Record<string, unknown> = {}
          try {
            errorData = errorBody ? JSON.parse(errorBody) : {}
          } catch {
            // Not JSON
          }

          const error: HttpError = new Error(errorData.message as string || `HTTP ${response.status}: ${response.statusText}`) as HttpError
          error.status = response.status
          error.code = `HTTP_${response.status}`
          error.requestId = requestId
          error.details = errorData

          // Don't retry client errors (4xx) except 429
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error
          }

          lastError = error
        } else {
          const data = await response.json()
          return data as T
        }
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            const timeoutError: HttpError = new Error(`Request timeout after ${reqTimeout}ms`) as HttpError
            timeoutError.code = "TIMEOUT"
            timeoutError.requestId = requestId
            lastError = timeoutError
          } else if ((error as HttpError).code) {
            lastError = error as HttpError
            // Don't retry if it's a client error we already processed
            if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
              throw lastError
            }
          } else {
            const networkError: HttpError = new Error(error.message) as HttpError
            networkError.code = "NETWORK_ERROR"
            networkError.requestId = requestId
            lastError = networkError
          }
        }
      }

      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt))
      }
    }

    throw lastError || new Error("Unknown error occurred")
  }

  return {\
    get: <T>(endpoint: string, options?: Omit<HttpRequestOptions, "method" | "body">) =>\
      request<T>(endpoint, { ...options, method: "GET" }),
\
    post: <T>(endpoint: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">) =>\
      request<T>(endpoint, { ...options, method: "POST", body }),
\
    put: <T>(endpoint: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">) =>\
      request<T>(endpoint, { ...options, method: "PUT", body }),
\
    patch: <T>(endpoint: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">) =>\
      request<T>(endpoint, { ...options, method: "PATCH", body }),
\
    delete: <T>(endpoint: string, options?: Omit<HttpRequestOptions, "method" | "body">) =>\
      request<T>(endpoint, { ...options, method: "DELETE" }),
  }\
}
