/**
 * Desktop coordination mesh agents for topology + AI Studio Mesh tab.
 * Date: May 19, 2026
 */

import type { NodeStatus, TopologyNode } from "@/components/mas/topology/types"

export const DESKTOP_MESH_AGENT_IDS = [
  "cursor",
  "claude-desktop",
  "codex",
  "myca",
  "human-morgan",
  "chatgpt",
  "perplexity-computer",
] as const

export type DesktopMeshAgentId = (typeof DESKTOP_MESH_AGENT_IDS)[number]

const DISPLAY_NAMES: Record<DesktopMeshAgentId, string> = {
  cursor: "Cursor",
  "claude-desktop": "Claude Desktop",
  codex: "Codex",
  myca: "MYCA (Desktop)",
  "human-morgan": "Morgan (Human)",
  chatgpt: "ChatGPT",
  "perplexity-computer": "Perplexity Computer",
}

export function mapCoordinationStateToNodeStatus(state: string | undefined): NodeStatus {
  switch ((state || "").toLowerCase()) {
    case "working":
      return "busy"
    case "idle":
      return "idle"
    case "blocked":
      return "error"
    case "waiting":
      return "idle"
    case "done":
      return "offline"
    case "error":
      return "error"
    default:
      return "offline"
  }
}

function meshPosition(index: number, total: number): [number, number, number] {
  const radius = 22
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  return [Math.cos(angle) * radius, 22, Math.sin(angle) * radius - 8]
}

export function buildDesktopMeshTopologyNodes(
  latestByAgent: Record<string, Record<string, unknown>> = {}
): TopologyNode[] {
  const now = new Date().toISOString()
  return DESKTOP_MESH_AGENT_IDS.map((id, index) => {
    const record = latestByAgent[id] || latestByAgent[id.replace(/-/g, "_")]
    const state = typeof record?.state === "string" ? record.state : undefined
    const summary =
      typeof record?.summary === "string"
        ? record.summary
        : typeof record?.message === "string"
          ? record.message
          : ""
    const status = mapCoordinationStateToNodeStatus(state)
    const isLive = status === "busy" || status === "idle"

    return {
      id,
      name: DISPLAY_NAMES[id],
      shortName: DISPLAY_NAMES[id].split(" ")[0],
      type: "agent",
      category: "integration",
      status,
      description: summary || `Desktop mesh peer: ${DISPLAY_NAMES[id]}`,
      position: meshPosition(index, DESKTOP_MESH_AGENT_IDS.length),
      metrics: {
        cpuPercent: 0,
        memoryMb: 0,
        tasksCompleted: 0,
        tasksQueued: 0,
        messagesPerSecond: isLive ? 1 : 0,
        errorRate: status === "error" ? 1 : 0,
        uptime: 0,
        lastActive: typeof record?.updated_at === "string" ? record.updated_at : now,
      },
      connections: ["myca-orchestrator"],
      size: 1.3,
      priority: 9,
      canStart: false,
      canStop: false,
      canRestart: false,
      canConfigure: false,
    }
  })
}

export function getMeshCoordinationSummary(
  agentId: string,
  latestByAgent: Record<string, Record<string, unknown>>
): { state: string; summary: string; updatedAt: string } | null {
  const record = latestByAgent[agentId]
  if (!record) return null
  const state = typeof record.state === "string" ? record.state : "unknown"
  const summary =
    typeof record.summary === "string"
      ? record.summary
      : typeof record.message === "string"
        ? record.message
        : ""
  const updatedAt =
    typeof record.updated_at === "string"
      ? record.updated_at
      : typeof record.timestamp === "string"
        ? record.timestamp
        : ""
  return { state, summary, updatedAt }
}

export function isDesktopMeshAgentId(id: string): id is DesktopMeshAgentId {
  return (DESKTOP_MESH_AGENT_IDS as readonly string[]).includes(id)
}
