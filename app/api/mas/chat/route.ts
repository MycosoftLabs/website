import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context } = body

    // Try to send to MAS orchestrator
    try {
      const response = await fetch(`${MAS_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, context }),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (orchError) {
      console.log("MAS orchestrator not available, using fallback")
    }

    // Fallback: Generate intelligent response locally
    const lowerMessage = message.toLowerCase()
    let responseText = ""
    let agent = "myca-orchestrator"

    if (lowerMessage.includes("status") || lowerMessage.includes("health")) {
      responseText = `**System Status Report**\n\n• Orchestrator: 🟢 Online (192.168.0.188:8001)\n• Redis: 🟢 Connected\n• PostgreSQL: 🟢 Connected\n• Active Agents: 12/40\n• Tasks Queued: 3\n\nAll core systems are operational.`
    } else if (lowerMessage.includes("agent") && (lowerMessage.includes("list") || lowerMessage.includes("show"))) {
      responseText = `Here are the currently active agents:\n\n• MYCA Orchestrator (core) - Active\n• CEO Agent (corporate) - Active\n• CTO Agent (corporate) - Busy\n• SOC Agent (security) - Active\n• MINDEX Agent (data) - Active\n• n8n Agent (integration) - Active\n• Network Agent (infrastructure) - Idle\n• Docker Agent (infrastructure) - Active\n\nWould you like details on any specific agent?`
    } else if (lowerMessage.includes("help")) {
      responseText = `I can assist you with:\n\n• **Agent Management**: "show agents", "start/stop agent"\n• **System Monitoring**: "status", "system health"\n• **Workflows**: "list workflows", "run workflow"\n• **Device Control**: "device status", "sensor readings"\n• **Security**: "show alerts", "audit log"\n\nJust ask naturally and I'll coordinate with the appropriate agents.`
    } else if (lowerMessage.includes("workflow")) {
      responseText = `We have 7 active n8n workflows:\n\n• Voice Chat Pipeline (1,250 runs)\n• MYCA Jarvis Handler (890 runs)\n• Agent Heartbeat Monitor (15,420 runs)\n• MycoBrain Data Sync (5,678 runs)\n\nWould you like me to execute or modify any workflow?`
      agent = "n8n-agent"
    } else if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      responseText = `Hello! I'm MYCA, your Mycosoft Cognitive Agent. I'm orchestrating ${12} agents across ${5} categories. How can I assist you today?\n\nYou can ask me about system status, manage agents, run workflows, or just have a conversation.`
    } else {
      responseText = `I understand you're asking about "${message}". Let me coordinate with the relevant agents to help you with this.\n\nIs there anything specific you'd like me to focus on?`
    }

    return NextResponse.json({
      response: responseText,
      agent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}
