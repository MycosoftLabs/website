import { NextRequest, NextResponse } from "next/server"

const DOCKER_API_URL = process.env.DOCKER_API_URL || "http://host.docker.internal:2375"

export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get("id")
  const tail = request.nextUrl.searchParams.get("tail") || "100"
  const timestamps = request.nextUrl.searchParams.get("timestamps") === "true"

  if (!containerId) {
    return NextResponse.json({ error: "Container ID required" }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({
      stdout: "true",
      stderr: "true",
      tail,
      timestamps: timestamps.toString(),
    })

    const res = await fetch(
      `${DOCKER_API_URL}/containers/${containerId}/logs?${params}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      throw new Error(`Docker API error: ${res.status}`)
    }

    // Docker logs come with a special header format
    // We need to strip the 8-byte header from each line
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder().decode(buffer)
    
    // Clean up Docker log format (remove binary headers)
    const cleanLogs = text
      .split("\n")
      .map(line => {
        // Remove Docker stream header if present
        if (line.length > 8) {
          return line.slice(8)
        }
        return line
      })
      .filter(line => line.trim())
      .join("\n")

    return NextResponse.json({
      logs: cleanLogs || "No logs available",
      containerId,
      tail: parseInt(tail),
    })
  } catch (error) {
    console.error("Failed to fetch logs:", error)
    
    // Return mock logs for demo
    const now = new Date()
    const mockLogs = [
      `[${new Date(now.getTime() - 3600000).toISOString()}] INFO  Container started`,
      `[${new Date(now.getTime() - 3500000).toISOString()}] INFO  Initializing services...`,
      `[${new Date(now.getTime() - 3400000).toISOString()}] DEBUG Environment loaded`,
      `[${new Date(now.getTime() - 3300000).toISOString()}] INFO  Connected to database`,
      `[${new Date(now.getTime() - 3200000).toISOString()}] INFO  Connected to Redis`,
      `[${new Date(now.getTime() - 3100000).toISOString()}] INFO  API server starting...`,
      `[${new Date(now.getTime() - 3000000).toISOString()}] INFO  Server listening on port 8000`,
      `[${new Date(now.getTime() - 2000000).toISOString()}] DEBUG Processing incoming request`,
      `[${new Date(now.getTime() - 1000000).toISOString()}] INFO  Request completed: 200 OK (45ms)`,
      `[${new Date(now.getTime() - 500000).toISOString()}] DEBUG Health check passed`,
      `[${new Date(now.getTime() - 100000).toISOString()}] INFO  Metrics collected`,
      `[${now.toISOString()}] DEBUG Waiting for requests...`,
    ].join("\n")

    return NextResponse.json({
      logs: mockLogs,
      containerId,
      tail: parseInt(tail),
      source: "mock",
    })
  }
}

// Stream logs (for real-time)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { containerId, follow } = body

  if (!containerId) {
    return NextResponse.json({ error: "Container ID required" }, { status: 400 })
  }

  try {
    if (follow) {
      // Return SSE endpoint info for streaming
      return NextResponse.json({
        streamUrl: `/api/docker/containers/logs/stream?id=${containerId}`,
        message: "Use SSE to connect to stream URL",
      })
    }

    // Just fetch latest logs
    const params = new URLSearchParams({
      stdout: "true",
      stderr: "true",
      tail: "50",
    })

    const res = await fetch(
      `${DOCKER_API_URL}/containers/${containerId}/logs?${params}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      throw new Error(`Docker API error: ${res.status}`)
    }

    const text = await res.text()
    return NextResponse.json({ logs: text })
  } catch (error) {
    return NextResponse.json({
      logs: "Log streaming not available - Docker API connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
