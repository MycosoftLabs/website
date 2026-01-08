import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

/**
 * POST /api/mycobrain/{port}/machine-mode
 * Initialize machine mode on the board
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    // Send bootstrap commands
    const commands = [
      "mode machine",
      "dbg off",
      "fmt json",
    ]
    
    for (const cmd of commands) {
      await fetch(
        `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(port)}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: { cmd } }),
          signal: AbortSignal.timeout(5000),
        }
      )
      // Small delay between commands
      await new Promise(r => setTimeout(r, 200))
    }
    
    return NextResponse.json({
      success: true,
      port,
      machine_mode: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize machine mode",
        details: String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mycobrain/{port}/machine-mode
 * Get machine mode status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const response = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(port)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd: "status" } }),
        signal: AbortSignal.timeout(5000),
      }
    )
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      port,
      status: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        port,
        error: "Failed to get status",
        details: String(error),
      },
      { status: 503 }
    )
  }
}

























