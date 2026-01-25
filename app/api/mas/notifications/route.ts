import { NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error" | "alert"
  title: string
  message: string
  source: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

export async function GET() {
  try {
    // Try to get notifications from MAS
    try {
      const response = await fetch(`${MAS_API_URL}/notifications`, {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch {
      // Fall through to sample data
    }

    // Return sample notifications when MAS is not available
    const now = new Date()
    const notifications: Notification[] = [
      {
        id: "1",
        type: "success",
        title: "MAS v2 Deployed",
        message: "MYCA Orchestrator is running on 192.168.0.188:8001",
        source: "System",
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        read: false,
      },
      {
        id: "2",
        type: "info",
        title: "Agent Pool Updated",
        message: "12 agents are now active and processing tasks",
        source: "MYCA Orchestrator",
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        read: false,
      },
      {
        id: "3",
        type: "success",
        title: "Workflow Completed",
        message: "MycoBrain Data Sync workflow completed successfully",
        source: "n8n Agent",
        timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
        read: true,
      },
      {
        id: "4",
        type: "alert",
        title: "Security Scan Complete",
        message: "Weekly security audit completed. No vulnerabilities found.",
        source: "SOC Agent",
        timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        read: true,
      },
    ]

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ notifications: [] })
  }
}
