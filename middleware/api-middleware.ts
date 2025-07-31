import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth/api-keys"
import { trackApiUsage } from "@/lib/monitoring/telemetry"

/**
 * Middleware for API routes to handle authentication, rate limiting, and logging
 * @param request The incoming request
 * @returns The response or passes to the next middleware
 */
export async function apiMiddleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Skip authentication for public endpoints
  if (request.nextUrl.pathname === "/api/docs") {
    return NextResponse.next()
  }

  // Check for API key
  const apiKey = request.headers.get("x-api-key")

  // Skip API key check for internal routes when in development
  const isInternalRoute = request.nextUrl.pathname.startsWith("/api/internal")
  if (process.env.NODE_ENV === "development" && isInternalRoute) {
    return NextResponse.next()
  }

  // Verify API key for protected routes
  if (request.nextUrl.pathname.startsWith("/api/gateway")) {
    const isValid = await verifyApiKey(apiKey)

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid or missing API key",
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
        { status: 401 },
      )
    }

    // Track API usage
    const agentId = request.headers.get("x-agent-id") || "unknown"
    const endpoint = request.nextUrl.searchParams.get("endpoint") || request.nextUrl.pathname

    await trackApiUsage(endpoint, agentId, {
      method: request.method,
      path: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams),
    })
  }

  // Add CORS headers for API routes
  const response = NextResponse.next()

  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-agent-id")

  return response
}
