/**
 * Resolve redirect origin for auth routes (login, callback, etc.).
 * In local dev, never redirect to production NEXT_PUBLIC_SITE_URL.
 */

function parseHostname(hostHeader: string): string {
  const trimmed = hostHeader.split(',')[0]?.trim() ?? ''
  if (!trimmed) return ''
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']')
    return end >= 0 ? trimmed.slice(1, end) : trimmed
  }
  const colon = trimmed.lastIndexOf(':')
  if (colon > 0 && trimmed.indexOf(':') === colon) {
    return trimmed.slice(0, colon)
  }
  return trimmed
}

function isPrivateLanHost(hostname: string): boolean {
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (hostname.startsWith('192.168.')) return true
  if (hostname.startsWith('10.')) return true
  const match = /^172\.(\d+)\./.exec(hostname)
  if (match) {
    const second = Number.parseInt(match[1], 10)
    return second >= 16 && second <= 31
  }
  return false
}

function hostnamesCompatible(baseHostname: string, requestHostname: string): boolean {
  if (baseHostname === requestHostname) return true
  const baseIsLoopback = baseHostname === 'localhost' || baseHostname === '127.0.0.1'
  const requestIsDev =
    requestHostname === 'localhost' ||
    requestHostname === '127.0.0.1' ||
    isPrivateLanHost(requestHostname)
  return baseIsLoopback && requestIsDev
}

function isLocalDevRequest(requestHostname: string, requestHost: string): boolean {
  if (
    requestHostname === 'localhost' ||
    requestHostname === '127.0.0.1' ||
    requestHost.includes('localhost') ||
    requestHost.startsWith('127.0.0.1')
  ) {
    return true
  }

  if (process.env.NODE_ENV === 'development' && isPrivateLanHost(requestHostname)) {
    return true
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl && process.env.NODE_ENV === 'development') {
    try {
      const baseHostname = new URL(baseUrl).hostname
      if (hostnamesCompatible(baseHostname, requestHostname)) return true
    } catch {
      // Ignore malformed BASE_URL
    }
  }

  return false
}

function productionOrigin(request: Request, requestUrl: URL, requestHost: string): string {
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin
    } catch {
      // Fall back to forwarded headers below if the env var is malformed.
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  const host = forwardedHost || requestHost || requestUrl.host
  return `${forwardedProto}://${host}`
}

export function getAuthOrigin(request: Request): string {
  const requestUrl = new URL(request.url)
  const requestHost = request.headers.get('host') || requestUrl.host
  const requestHostname = requestUrl.hostname || parseHostname(requestHost)

  if (!isLocalDevRequest(requestHostname, requestHost)) {
    return productionOrigin(request, requestUrl, requestHost)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) {
    try {
      const base = new URL(baseUrl)
      if (hostnamesCompatible(base.hostname, requestHostname)) {
        return base.origin
      }
    } catch {
      // Ignore malformed BASE_URL; use request origin below.
    }
  }

  return requestUrl.origin
}
