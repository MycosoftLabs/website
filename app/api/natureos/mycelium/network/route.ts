import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Fetch real network data from MAS and topology
async function fetchRealNetworkData() {
  const masUrl = process.env.MAS_API_URL || "http://localhost:8001"
  
  try {
    // Fetch topology and agent registry from MAS
    const [topologyRes, agentsRes, networkRes] = await Promise.allSettled([
      fetch(`${masUrl}/api/mas/topology`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${masUrl}/agents/registry/`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${process.env.UNIFI_DASHBOARD_API_URL || "http://localhost:3100"}/api/network`, {
        signal: AbortSignal.timeout(3000),
      }),
    ])

    const topologyData = topologyRes.status === "fulfilled" && topologyRes.value.ok
      ? await topologyRes.value.json()
      : null
    const agentsData = agentsRes.status === "fulfilled" && agentsRes.value.ok
      ? await agentsRes.value.json()
      : null
    const networkData = networkRes.status === "fulfilled" && networkRes.value.ok
      ? await networkRes.value.json()
      : null

    // Calculate real network metrics
    const nodes = topologyData?.nodes || []
    const connections = topologyData?.connections || []
    const activeAgents = agentsData?.active_agents || 0
    const totalAgents = agentsData?.total_agents || 0
    const clients = networkData?.clients || []
    const devices = networkData?.devices || []

    const totalNodes = nodes.length + clients.length + devices.length
    const activeNodes = nodes.filter((n: any) => n.status === "online").length + 
                       clients.filter((c: any) => c.status === "online").length +
                       devices.filter((d: any) => d.status === "online").length

    // Calculate network health based on real data
    const onlineRatio = totalNodes > 0 ? activeNodes / totalNodes : 0
    const networkHealth = Math.round(onlineRatio * 100)
    const signalStrength = networkData?.signalStrength || Math.round(onlineRatio * 100)

    // Get MycoBrain devices for bioelectric activity
    let mycoBrainDevices = 0
    try {
      const mycoRes = await fetch(`${process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"}/devices`, {
        signal: AbortSignal.timeout(2000),
      })
      if (mycoRes.ok) {
        const mycoData = await mycoRes.json()
        mycoBrainDevices = (mycoData.devices || []).filter((d: any) => d.connected).length
      }
    } catch {
      // MycoBrain service not available
    }

    return {
      totalNodes: Math.max(totalNodes, activeAgents),
      activeNodes: Math.max(activeNodes, activeAgents),
      networkHealth,
      signalStrength,
      growthRate: Math.round(onlineRatio * 100),
      nutrientFlow: networkHealth,
      connections: connections.length,
      density: totalNodes > 0 ? (connections.length / totalNodes).toFixed(2) : 0,
      propagationSpeed: activeAgents > 0 ? 3.5 : 0,
      bioelectricActivity: mycoBrainDevices > 0 ? 75 : 0,
      regions: nodes.slice(0, 5).map((node: any, i: number) => ({
        id: node.id || `region-${i + 1}`,
        location: node.location || [-122.4194 + i * 0.1, 37.7749 + i * 0.1],
        density: node.density || 0.8,
        health: node.status === "online" ? 95 : 70,
      })),
    }
  } catch (error) {
    console.error("Failed to fetch real network data:", error)
    // Return minimal real data - no mock fallback
    return {
      totalNodes: 0,
      activeNodes: 0,
      networkHealth: 0,
      signalStrength: 0,
      growthRate: 0,
      nutrientFlow: 0,
      connections: 0,
      density: 0,
      propagationSpeed: 0,
      bioelectricActivity: 0,
      regions: [],
    }
  }
}

export async function GET() {
  const network = await fetchRealNetworkData()
  return NextResponse.json(network)
}
