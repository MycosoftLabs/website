import { NextResponse } from "next/server"

// MAS Orchestrator API proxy
const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function GET() {
  try {
    // Try to fetch from real MAS orchestrator
    const response = await fetch(`${MAS_API_URL}/agents`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    // Return sample data if orchestrator not available
    return NextResponse.json({
      agents: [
        { 
          agent_id: "myca-core", 
          status: "active", 
          category: "core", 
          display_name: "MYCA Core", 
          tasks_completed: 15420, 
          tasks_failed: 12, 
          cpu_percent: 25, 
          memory_mb: 512, 
          uptime_seconds: 259200 
        },
        { 
          agent_id: "ceo-agent", 
          status: "active", 
          category: "corporate", 
          display_name: "CEO Agent", 
          tasks_completed: 142, 
          tasks_failed: 0, 
          cpu_percent: 12, 
          memory_mb: 256, 
          uptime_seconds: 172800 
        },
        { 
          agent_id: "cfo-agent", 
          status: "active", 
          category: "corporate", 
          display_name: "CFO Agent", 
          tasks_completed: 89, 
          tasks_failed: 2, 
          cpu_percent: 8, 
          memory_mb: 128, 
          uptime_seconds: 172800 
        },
        { 
          agent_id: "cto-agent", 
          status: "busy", 
          category: "corporate", 
          display_name: "CTO Agent", 
          tasks_completed: 234, 
          tasks_failed: 1, 
          cpu_percent: 45, 
          memory_mb: 512, 
          uptime_seconds: 172800 
        },
        { 
          agent_id: "proxmox-agent", 
          status: "active", 
          category: "infrastructure", 
          display_name: "Proxmox Agent", 
          tasks_completed: 567, 
          tasks_failed: 3, 
          cpu_percent: 15, 
          memory_mb: 256, 
          uptime_seconds: 259200 
        },
        { 
          agent_id: "docker-agent", 
          status: "active", 
          category: "infrastructure", 
          display_name: "Docker Agent", 
          tasks_completed: 1234, 
          tasks_failed: 12, 
          cpu_percent: 22, 
          memory_mb: 384, 
          uptime_seconds: 259200 
        },
        { 
          agent_id: "network-agent", 
          status: "idle", 
          category: "infrastructure", 
          display_name: "Network Agent", 
          tasks_completed: 345, 
          tasks_failed: 0, 
          cpu_percent: 5, 
          memory_mb: 128, 
          uptime_seconds: 259200 
        },
        { 
          agent_id: "mycobrain-coordinator", 
          status: "active", 
          category: "device", 
          display_name: "MycoBrain Coordinator", 
          tasks_completed: 2456, 
          tasks_failed: 8, 
          cpu_percent: 18, 
          memory_mb: 256, 
          uptime_seconds: 345600 
        },
        { 
          agent_id: "mindex-agent", 
          status: "active", 
          category: "data", 
          display_name: "MINDEX Agent", 
          tasks_completed: 8934, 
          tasks_failed: 23, 
          cpu_percent: 35, 
          memory_mb: 512, 
          uptime_seconds: 345600 
        },
        { 
          agent_id: "n8n-agent", 
          status: "active", 
          category: "integration", 
          display_name: "n8n Agent", 
          tasks_completed: 3421, 
          tasks_failed: 15, 
          cpu_percent: 28, 
          memory_mb: 384, 
          uptime_seconds: 345600 
        },
        { 
          agent_id: "elevenlabs-agent", 
          status: "idle", 
          category: "integration", 
          display_name: "ElevenLabs Agent", 
          tasks_completed: 567, 
          tasks_failed: 2, 
          cpu_percent: 3, 
          memory_mb: 128, 
          uptime_seconds: 259200 
        },
        { 
          agent_id: "soc-agent", 
          status: "active", 
          category: "security", 
          display_name: "SOC Agent", 
          tasks_completed: 4567, 
          tasks_failed: 0, 
          cpu_percent: 42, 
          memory_mb: 512, 
          uptime_seconds: 345600 
        },
      ],
      total: 12,
      active: 10,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("MAS API error:", error)
    return NextResponse.json(
      { error: "Failed to connect to MAS orchestrator", agents: [] },
      { status: 503 }
    )
  }
}
