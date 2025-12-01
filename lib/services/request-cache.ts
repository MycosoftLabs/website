export const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const requestQueue = new Map<string, Promise<any>>()

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  // Check cache first
  const cached = requestCache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log(`[v0] Cache hit for: ${key}`)
    return cached.data as T
  }

  // Check if already fetching
  const inProgress = requestQueue.get(key)
  if (inProgress) {
    console.log(`[v0] Request already in progress for: ${key}`)
    return inProgress as Promise<T>
  }

  // Create new request
  const promise = fetcher()
    .then((data) => {
      requestCache.set(key, { data, timestamp: Date.now() })
      requestQueue.delete(key)
      return data
    })
    .catch((error) => {
      requestQueue.delete(key)
      throw error
    })

  requestQueue.set(key, promise)
  return promise
}

// Rate limiter
const rateLimits = new Map<string, number[]>()

export function checkRateLimit(key: string, maxRequests = 3, windowMs = 60000): boolean {
  const now = Date.now()
  const requests = rateLimits.get(key) || []

  // Remove old requests outside the window
  const recentRequests = requests.filter((time) => now - time < windowMs)

  if (recentRequests.length >= maxRequests) {
    console.log(`[v0] Rate limit exceeded for: ${key}`)
    return false
  }

  recentRequests.push(now)
  rateLimits.set(key, recentRequests)
  return true
}
