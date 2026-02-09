/**
 * Pipeline → TopologyData adapter
 * Maps activity/pipeline API response to TopologyData so we reuse TopologyNode3D and TopologyConnection3D (flow, particles).
 */

import type { TopologyNode, TopologyConnection, TopologyData, NodeType, NodeCategory, ConnectionType, NodeStatus } from "./types"
import type { ActivityNode, ActivityConnection, ActivityTopologyData, ActivityNodeStatus } from "./activity-types"

function mapActivityStatusToTopology(status?: ActivityNodeStatus): NodeStatus {
  if (!status) return "active"
  switch (status) {
    case "healthy": return "active"
    case "degraded": return "busy"
    case "error": return "error"
    default: return "active"
  }
}

const DEFAULT_METRICS = {
  cpuPercent: 0,
  memoryMb: 0,
  tasksCompleted: 0,
  tasksQueued: 0,
  messagesPerSecond: 0,
  errorRate: 0,
  uptime: 0,
  lastActive: new Date().toISOString(),
}

function mapActivityNodeType(type: ActivityNode["type"]): NodeType {
  switch (type) {
    case "page":
    case "app":
      return "user"
    case "api":
      return "service"
    case "device":
      return "device"
    case "database":
      return "database"
    case "workflow":
      return "workflow"
    case "memory":
    case "system":
    default:
      return "integration"
  }
}

function mapActivityCategory(type: ActivityNode["type"]): NodeCategory {
  switch (type) {
    case "page":
    case "app":
      return "data"
    case "api":
      return "infrastructure"
    case "device":
      return "device"
    case "database":
    case "memory":
      return "data"
    case "workflow":
      return "integration"
    case "system":
    default:
      return "infrastructure"
  }
}

function mapConnectionType(type: ActivityConnection["type"]): ConnectionType {
  switch (type) {
    case "http":
      return "data"
    case "query":
      return "query"
    case "stream":
      return "stream"
    case "read":
    case "write":
    case "trigger":
    case "sitemap_link":
    default:
      return "message"
  }
}

export function pipelineToTopologyData(data: ActivityTopologyData): TopologyData {
  const { nodes: activityNodes, connections: activityConnections, lastUpdated } = data

  const nodeIds = new Set(activityNodes.map((n) => n.id))
  const connectionIdsBySource = new Map<string, string[]>()
  for (const c of activityConnections) {
    if (nodeIds.has(c.sourceId) && nodeIds.has(c.targetId)) {
      const list = connectionIdsBySource.get(c.sourceId) ?? []
      if (!list.includes(c.targetId)) list.push(c.targetId)
      connectionIdsBySource.set(c.sourceId, list)
    }
  }

  const nodes: TopologyNode[] = activityNodes.map((n) => {
    const position: [number, number, number] = n.position ?? [0, 0, 0]
    return {
      id: n.id,
      name: n.label,
      shortName: n.label.length > 20 ? n.label.slice(0, 17) + "…" : n.label,
      type: mapActivityNodeType(n.type),
      category: mapActivityCategory(n.type),
      status: mapActivityStatusToTopology(n.status),
      description: (n.metadata?.description as string) ?? n.system ?? "",
      position,
      metrics: { ...DEFAULT_METRICS },
      connections: connectionIdsBySource.get(n.id) ?? [],
      size: 1,
      priority: 1,
      canStart: false,
      canStop: false,
      canRestart: false,
      canConfigure: false,
    }
  })

  const connections: TopologyConnection[] = activityConnections
    .filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
    .map((c) => {
      const traffic = c.traffic ?? { requestRate: 2, latencyMs: 50 }
      return {
        id: c.id,
        sourceId: c.sourceId,
        targetId: c.targetId,
        type: mapConnectionType(c.type),
        traffic: {
          messagesPerSecond: traffic.requestRate,
          bytesPerSecond: traffic.bytesPerSecond ?? 0,
          latencyMs: traffic.latencyMs,
          errorRate: traffic.errorRate ?? 0,
        },
        animated: c.animated ?? true,
        active: c.active ?? true,
        intensity: c.intensity ?? 0.6,
        bidirectional: c.bidirectional ?? false,
      }
    })

  const activeConnections = connections.filter((c) => c.active)
  const totalMps = activeConnections.reduce((s, c) => s + c.traffic.messagesPerSecond, 0)
  const avgLatency =
    activeConnections.length > 0
      ? activeConnections.reduce((s, c) => s + c.traffic.latencyMs, 0) / activeConnections.length
      : 0

  return {
    nodes,
    connections,
    packets: [],
    stats: {
      totalNodes: nodes.length,
      activeNodes: nodes.length,
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      messagesPerSecond: totalMps,
      avgLatencyMs: avgLatency,
      systemLoad: 0,
      uptimeSeconds: 0,
    },
    lastUpdated: lastUpdated ?? new Date().toISOString(),
  }
}
