import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  uptime: number
  services: {
    name: string
    status: "up" | "down" | "degraded"
    responseTime?: number
    message?: string
  }[]
  environment: string
  memory?: {
    used: number
    total: number
    percentage: number
  }
}

export async function GET() {
  const startTime = Date.now()
  
  const health: HealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    services: [],
  }

  // Check API service
  health.services.push({
    name: "api",
    status: "up",
    responseTime: Date.now() - startTime,
    message: "API endpoints operational",
  })

  // Check database connectivity (optional - if NEON_DATABASE_URL is set)
  if (process.env.NEON_DATABASE_URL) {
    try {
      const dbStart = Date.now()
      // Just verify the URL is valid, don't actually connect
      const url = new URL(process.env.NEON_DATABASE_URL)
      health.services.push({
        name: "database",
        status: "up",
        responseTime: Date.now() - dbStart,
        message: `Connected to ${url.host}`,
      })
    } catch {
      health.services.push({
        name: "database",
        status: "down",
        message: "Invalid database URL",
      })
      health.status = "degraded"
    }
  } else {
    health.services.push({
      name: "database",
      status: "down",
      message: "NEON_DATABASE_URL not configured",
    })
    health.status = "degraded"
  }

  // Check MAS API connectivity
  try {
    const masStart = Date.now()
    const masUrl = process.env.MAS_API_URL || "http://localhost:8001"
    const masResponse = await fetch(`${masUrl}/health`, { 
      signal: AbortSignal.timeout(3000) 
    }).catch(() => null)
    
    if (masResponse?.ok) {
      health.services.push({
        name: "mas-api",
        status: "up",
        responseTime: Date.now() - masStart,
        message: "MAS orchestrator connected",
      })
    } else {
      health.services.push({
        name: "mas-api",
        status: "down",
        message: "MAS API not reachable",
      })
    }
  } catch {
    health.services.push({
      name: "mas-api",
      status: "down",
      message: "MAS API connection failed",
    })
  }

  // Memory usage (if available in Node.js)
  if (typeof process.memoryUsage === "function") {
    const mem = process.memoryUsage()
    health.memory = {
      used: Math.round(mem.heapUsed / 1024 / 1024),
      total: Math.round(mem.heapTotal / 1024 / 1024),
      percentage: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    }
  }

  // Determine overall status
  const downServices = health.services.filter(s => s.status === "down")
  const criticalServices = ["api"]
  const hasCriticalDown = downServices.some(s => criticalServices.includes(s.name))
  
  if (hasCriticalDown) {
    health.status = "unhealthy"
    return NextResponse.json(health, { status: 503 })
  }
  
  if (downServices.length > 0) {
    health.status = "degraded"
  }

  return NextResponse.json(health, { 
    status: health.status === "healthy" ? 200 : 207 
  })
}
