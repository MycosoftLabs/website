/**
 * Auto-Connector Service Tests
 * Tests for automatic connection creation when agents spawn or gaps are detected
 * 
 * Created: Jan 26, 2026
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  determineRequiredConnections,
  autoConnectAgent,
  validateAndFixConnections,
  fillGap,
  getConnectionHealth,
  createAutoConnectorHandlers,
} from "../../../lib/services/auto-connector"
import type { TopologyNode, TopologyConnection, NodeCategory, DetectedGap } from "../../../components/mas/topology/types"

// Helper to create test nodes
function createNode(
  id: string,
  type: TopologyNode["type"] = "agent",
  category: NodeCategory = "core"
): TopologyNode {
  return {
    id,
    name: id,
    shortName: id.slice(0, 8),
    type,
    category,
    status: "active",
    description: `Test node ${id}`,
    position: [0, 0, 0],
    metrics: {
      cpuPercent: 50,
      memoryMb: 256,
      tasksCompleted: 10,
      tasksQueued: 2,
      messagesPerSecond: 5,
      errorRate: 0,
      uptime: 3600,
      lastActive: new Date().toISOString(),
    },
    connections: [],
    size: 1,
    priority: 1,
    canStart: true,
    canStop: true,
    canRestart: true,
    canConfigure: true,
  }
}

function createConnection(
  sourceId: string,
  targetId: string
): TopologyConnection {
  return {
    id: `${sourceId}-${targetId}`,
    sourceId,
    targetId,
    type: "message",
    traffic: {
      messagesPerSecond: 10,
      bytesPerSecond: 1000,
      latencyMs: 50,
      errorRate: 0,
    },
    animated: true,
    active: true,
    intensity: 0.5,
    bidirectional: true,
  }
}

describe("Auto-Connector Service", () => {
  let nodes: TopologyNode[]
  let connections: TopologyConnection[]
  let mockCreateConnection: ReturnType<typeof vi.fn>

  beforeEach(() => {
    nodes = [
      createNode("myca-orchestrator", "orchestrator", "core"),
      createNode("memory-manager", "service", "core"),
      createNode("redis", "database", "data"),
      createNode("health-monitor", "service", "infrastructure"),
      createNode("logger", "service", "infrastructure"),
    ]
    
    connections = [
      createConnection("myca-orchestrator", "memory-manager"),
      createConnection("memory-manager", "redis"),
    ]
    
    mockCreateConnection = vi.fn().mockResolvedValue(undefined)
  })

  describe("determineRequiredConnections", () => {
    it("should always include orchestrator connection", () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      const required = determineRequiredConnections(newAgent, nodes, connections)
      
      const orchConn = required.find(c => c.targetId === "myca-orchestrator")
      expect(orchConn).toBeDefined()
      expect(orchConn?.type).toBe("command")
    })

    it("should include memory system connection", () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      const required = determineRequiredConnections(newAgent, nodes, connections)
      
      const memoryConn = required.find(c => c.targetId === "memory-manager")
      expect(memoryConn).toBeDefined()
      expect(memoryConn?.type).toBe("message")
    })

    it("should include data system connection", () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      const required = determineRequiredConnections(newAgent, nodes, connections)
      
      const dataConn = required.find(c => c.targetId === "redis")
      expect(dataConn).toBeDefined()
      expect(dataConn?.type).toBe("query")
    })

    it("should include monitoring connection", () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      const required = determineRequiredConnections(newAgent, nodes, connections)
      
      const monitorConn = required.find(c => c.targetId === "health-monitor")
      expect(monitorConn).toBeDefined()
      expect(monitorConn?.type).toBe("heartbeat")
    })

    it("should not connect user nodes to data systems", () => {
      const userNode = createNode("user-1", "user", "core")
      const required = determineRequiredConnections(userNode, nodes, connections)
      
      const dataConn = required.find(c => c.targetId === "redis")
      expect(dataConn).toBeUndefined()
    })

    it("should skip orchestrator if node is the orchestrator", () => {
      const orch = createNode("myca-orchestrator", "orchestrator", "core")
      const required = determineRequiredConnections(orch, nodes, connections)
      
      const selfConn = required.find(c => c.targetId === "myca-orchestrator")
      expect(selfConn).toBeUndefined()
    })
  })

  describe("autoConnectAgent", () => {
    it("should create connections for new agent", async () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      
      const result = await autoConnectAgent(
        newAgent,
        nodes,
        connections,
        mockCreateConnection
      )
      
      expect(result.success).toBe(true)
      expect(result.connectionsCreated.length).toBeGreaterThan(0)
      expect(mockCreateConnection).toHaveBeenCalled()
    })

    it("should respect maxAutoConnections config", async () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      
      const result = await autoConnectAgent(
        newAgent,
        nodes,
        connections,
        mockCreateConnection,
        { maxAutoConnections: 2 }
      )
      
      expect(result.connectionsCreated.length).toBeLessThanOrEqual(2)
    })

    it("should do nothing if autoConnectOnSpawn is false", async () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      
      const result = await autoConnectAgent(
        newAgent,
        nodes,
        connections,
        mockCreateConnection,
        { autoConnectOnSpawn: false }
      )
      
      expect(result.connectionsCreated.length).toBe(0)
      expect(mockCreateConnection).not.toHaveBeenCalled()
    })

    it("should handle connection creation errors", async () => {
      const newAgent = createNode("new-agent", "agent", "mycology")
      const failingCreate = vi.fn().mockRejectedValue(new Error("Connection failed"))
      
      const result = await autoConnectAgent(
        newAgent,
        nodes,
        connections,
        failingCreate
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("validateAndFixConnections", () => {
    it("should validate all agents", async () => {
      const allNodes = [
        ...nodes,
        createNode("disconnected-agent", "agent", "security"),
      ]
      
      const result = await validateAndFixConnections(
        allNodes,
        connections,
        mockCreateConnection
      )
      
      expect(result.results.length).toBeGreaterThan(0)
    })

    it("should fix disconnected agents", async () => {
      const allNodes = [
        ...nodes,
        createNode("disconnected-agent", "agent", "security"),
      ]
      
      const result = await validateAndFixConnections(
        allNodes,
        connections,
        mockCreateConnection
      )
      
      expect(result.fixed.length).toBeGreaterThan(0)
    })

    it("should respect autoFillGaps config", async () => {
      const allNodes = [
        ...nodes,
        createNode("disconnected-agent", "agent", "security"),
      ]
      
      const result = await validateAndFixConnections(
        allNodes,
        connections,
        mockCreateConnection,
        { autoFillGaps: false }
      )
      
      expect(result.fixed.length).toBe(0)
    })
  })

  describe("fillGap", () => {
    it("should fill route_coverage gaps", async () => {
      const gap: DetectedGap = {
        id: "gap-1",
        gapType: "route_coverage",
        description: "Orphaned nodes detected",
        suggestedAgentType: "connector",
        suggestedCategory: "integration",
        priority: "high",
        autoSpawnRecommended: false,
      }
      
      const allNodes = [
        ...nodes,
        createNode("orphan-1", "agent", "mycology"),
      ]
      
      const result = await fillGap(
        gap,
        allNodes,
        connections,
        mockCreateConnection
      )
      
      expect(result.success).toBe(true)
    })

    it("should fill device_monitoring gaps", async () => {
      const gap: DetectedGap = {
        id: "gap-2",
        gapType: "device_monitoring",
        description: "Devices not monitored",
        suggestedAgentType: "monitor",
        suggestedCategory: "device",
        priority: "medium",
        autoSpawnRecommended: false,
      }
      
      const allNodes = [
        ...nodes,
        createNode("device-1", "device", "device"),
        createNode("device-2", "device", "device"),
      ]
      
      const result = await fillGap(
        gap,
        allNodes,
        connections,
        mockCreateConnection
      )
      
      expect(result.success).toBe(true)
    })

    it("should spawn agent if recommended and handler provided", async () => {
      const gap: DetectedGap = {
        id: "gap-3",
        gapType: "integration",
        description: "Missing integration agent",
        suggestedAgentType: "api-connector",
        suggestedCategory: "integration",
        priority: "high",
        autoSpawnRecommended: true,
      }
      
      const mockSpawnAgent = vi.fn().mockResolvedValue(
        createNode("new-integration", "integration", "integration")
      )
      
      const result = await fillGap(
        gap,
        nodes,
        connections,
        mockCreateConnection,
        mockSpawnAgent
      )
      
      expect(result.success).toBe(true)
      expect(result.agentSpawned).toBe("new-integration")
      expect(mockSpawnAgent).toHaveBeenCalled()
    })
  })

  describe("getConnectionHealth", () => {
    it("should return health score", () => {
      const health = getConnectionHealth(nodes, connections)
      
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(100)
    })

    it("should count connection states", () => {
      const allNodes = [
        ...nodes,
        createNode("disconnected", "agent", "security"),
      ]
      
      const health = getConnectionHealth(allNodes, connections)
      
      expect(typeof health.fullyConnected).toBe("number")
      expect(typeof health.partiallyConnected).toBe("number")
      expect(typeof health.disconnected).toBe("number")
    })

    it("should provide recommendations", () => {
      const allNodes = [
        ...nodes,
        createNode("disconnected", "agent", "security"),
      ]
      
      const health = getConnectionHealth(allNodes, connections)
      
      expect(Array.isArray(health.recommendations)).toBe(true)
    })
  })

  describe("createAutoConnectorHandlers", () => {
    it("should create handler functions", () => {
      const handlers = createAutoConnectorHandlers(
        () => nodes,
        () => connections,
        mockCreateConnection,
        vi.fn()
      )
      
      expect(typeof handlers.onAgentSpawned).toBe("function")
      expect(typeof handlers.onGapDetected).toBe("function")
    })

    it("should call onAgentSpawned handler", async () => {
      const mockNotify = vi.fn()
      const handlers = createAutoConnectorHandlers(
        () => nodes,
        () => connections,
        mockCreateConnection,
        mockNotify
      )
      
      const newAgent = createNode("new-agent", "agent", "mycology")
      await handlers.onAgentSpawned(newAgent)
      
      expect(mockCreateConnection).toHaveBeenCalled()
    })

    it("should notify on successful connection", async () => {
      const mockNotify = vi.fn()
      const handlers = createAutoConnectorHandlers(
        () => nodes,
        () => connections,
        mockCreateConnection,
        mockNotify,
        { notifyOnConnection: true }
      )
      
      const newAgent = createNode("new-agent", "agent", "mycology")
      await handlers.onAgentSpawned(newAgent)
      
      expect(mockNotify).toHaveBeenCalled()
    })
  })
})
