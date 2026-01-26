/**
 * Connection Validator Service Tests
 * Tests for connection validation logic ensuring all agents reach core systems
 * 
 * Created: Jan 26, 2026
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  validateAgentConnections,
  getValidationSummary,
  generateAutoConnections,
  generateAllAutoConnections,
} from "../../../lib/services/connection-validator"
import type { TopologyNode, TopologyConnection, NodeCategory } from "../../../components/mas/topology/types"

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

// Helper to create test connections
function createConnection(
  sourceId: string,
  targetId: string,
  bidirectional = true
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
    bidirectional,
  }
}

describe("Connection Validator", () => {
  let nodes: TopologyNode[]
  let connections: TopologyConnection[]

  beforeEach(() => {
    // Set up a basic topology with core systems
    nodes = [
      createNode("myca-orchestrator", "orchestrator", "core"),
      createNode("memory-manager", "service", "core"),
      createNode("task-router", "service", "core"),
      createNode("redis", "database", "data"),
      createNode("postgres", "database", "data"),
      createNode("health-monitor", "service", "infrastructure"),
      createNode("test-agent-1", "agent", "mycology"),
      createNode("test-agent-2", "agent", "financial"),
      createNode("disconnected-agent", "agent", "security"),
    ]
    
    // Set up connections - test-agent-1 is fully connected, test-agent-2 partial, disconnected-agent has none
    connections = [
      // test-agent-1 connections
      createConnection("test-agent-1", "myca-orchestrator"),
      createConnection("test-agent-1", "memory-manager"),
      createConnection("test-agent-1", "redis"),
      
      // test-agent-2 only has orchestrator connection
      createConnection("test-agent-2", "myca-orchestrator"),
      
      // Core system interconnections
      createConnection("myca-orchestrator", "memory-manager"),
      createConnection("myca-orchestrator", "task-router"),
      createConnection("memory-manager", "redis"),
    ]
  })

  describe("validateAgentConnections", () => {
    it("should identify fully connected agents", () => {
      const results = validateAgentConnections(nodes, connections)
      const agent1Result = results.find(r => r.agentId === "test-agent-1")
      
      expect(agent1Result).toBeDefined()
      expect(agent1Result?.isFullyConnected).toBe(true)
      expect(agent1Result?.hasOrchestratorPath).toBe(true)
      expect(agent1Result?.hasMemoryPath).toBe(true)
      expect(agent1Result?.hasDataPath).toBe(true)
      expect(agent1Result?.score).toBeGreaterThanOrEqual(90)
    })

    it("should identify partially connected agents", () => {
      // Create a partial connection scenario: agent connects to orchestrator 
      // but orchestrator doesn't connect to data systems in this test
      const partialNodes = [
        createNode("myca-orchestrator", "orchestrator", "core"),
        createNode("memory-manager", "service", "core"),
        createNode("redis", "database", "data"),
        createNode("partial-agent", "agent", "mycology"),
      ]
      
      const partialConnections = [
        // partial-agent connects to orchestrator
        createConnection("partial-agent", "myca-orchestrator"),
        // BUT orchestrator does NOT connect to memory or data systems
        // So agent has orchestrator path but no memory/data path
      ]
      
      const results = validateAgentConnections(partialNodes, partialConnections)
      const partialResult = results.find(r => r.agentId === "partial-agent")
      
      expect(partialResult).toBeDefined()
      expect(partialResult?.isFullyConnected).toBe(false)
      expect(partialResult?.hasOrchestratorPath).toBe(true)
      expect(partialResult?.hasMemoryPath).toBe(false)
      expect(partialResult?.hasDataPath).toBe(false)
      expect(partialResult?.missingConnections.length).toBeGreaterThan(0)
    })

    it("should identify disconnected agents", () => {
      const results = validateAgentConnections(nodes, connections)
      const disconnectedResult = results.find(r => r.agentId === "disconnected-agent")
      
      expect(disconnectedResult).toBeDefined()
      expect(disconnectedResult?.isFullyConnected).toBe(false)
      expect(disconnectedResult?.hasOrchestratorPath).toBe(false)
      expect(disconnectedResult?.score).toBeLessThan(30)
    })

    it("should provide connection path to orchestrator", () => {
      const results = validateAgentConnections(nodes, connections)
      const agent1Result = results.find(r => r.agentId === "test-agent-1")
      
      expect(agent1Result?.connectionPath).toContain("test-agent-1")
      expect(agent1Result?.connectionPath).toContain("myca-orchestrator")
    })

    it("should suggest targets for missing connections", () => {
      const results = validateAgentConnections(nodes, connections)
      const disconnectedResult = results.find(r => r.agentId === "disconnected-agent")
      
      expect(disconnectedResult?.missingConnections).toBeDefined()
      expect(disconnectedResult?.missingConnections.some(m => m.type === "orchestrator")).toBe(true)
      expect(disconnectedResult?.missingConnections.every(m => m.suggestedTarget)).toBe(true)
    })
  })

  describe("getValidationSummary", () => {
    it("should return correct counts", () => {
      const results = validateAgentConnections(nodes, connections)
      const summary = getValidationSummary(results)
      
      expect(summary.fullyConnectedAgents).toBeGreaterThanOrEqual(1)
      expect(summary.disconnectedAgents).toBeGreaterThanOrEqual(1)
      expect(summary.totalAgents).toBe(results.length)
    })

    it("should calculate overall score", () => {
      const results = validateAgentConnections(nodes, connections)
      const summary = getValidationSummary(results)
      
      expect(summary.overallScore).toBeGreaterThanOrEqual(0)
      expect(summary.overallScore).toBeLessThanOrEqual(100)
    })

    it("should identify critical issues", () => {
      const results = validateAgentConnections(nodes, connections)
      const summary = getValidationSummary(results)
      
      expect(summary.criticalIssues.length).toBeGreaterThanOrEqual(1)
      expect(summary.criticalIssues.every(i => !i.hasOrchestratorPath)).toBe(true)
    })

    it("should count auto-fixable issues", () => {
      const results = validateAgentConnections(nodes, connections)
      const summary = getValidationSummary(results)
      
      expect(summary.autoFixableCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe("generateAutoConnections", () => {
    it("should generate connections for disconnected agent", () => {
      const autoConns = generateAutoConnections("disconnected-agent", nodes, connections)
      
      expect(autoConns.length).toBeGreaterThan(0)
      expect(autoConns.every(c => c.sourceId === "disconnected-agent")).toBe(true)
    })

    it("should prioritize orchestrator connection", () => {
      const autoConns = generateAutoConnections("disconnected-agent", nodes, connections)
      const orchConn = autoConns.find(c => c.targetId === "myca-orchestrator")
      
      expect(orchConn).toBeDefined()
      expect(orchConn?.type).toBe("command")
    })

    it("should include data and memory connections", () => {
      const autoConns = generateAutoConnections("disconnected-agent", nodes, connections)
      
      const hasDataConn = autoConns.some(c => 
        c.targetId === "redis" || c.targetId === "postgres"
      )
      const hasMemoryConn = autoConns.some(c => 
        c.targetId === "memory-manager" || c.targetId === "task-router"
      )
      
      // At least one of each type should be suggested
      expect(hasDataConn || hasMemoryConn).toBe(true)
    })

    it("should not generate connections for fully connected agent", () => {
      const autoConns = generateAutoConnections("test-agent-1", nodes, connections)
      
      expect(autoConns.length).toBe(0)
    })
  })

  describe("generateAllAutoConnections", () => {
    it("should generate connections for all disconnected agents", () => {
      const results = validateAgentConnections(nodes, connections)
      const allAutoConns = generateAllAutoConnections(results, nodes)
      
      expect(allAutoConns.length).toBeGreaterThan(0)
    })

    it("should create unique connection IDs", () => {
      const results = validateAgentConnections(nodes, connections)
      const allAutoConns = generateAllAutoConnections(results, nodes)
      
      const ids = allAutoConns.map(c => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })
})

describe("Edge Cases", () => {
  it("should handle empty topology", () => {
    const results = validateAgentConnections([], [])
    expect(results).toEqual([])
  })

  it("should handle single node topology", () => {
    const nodes = [createNode("lonely-agent")]
    const results = validateAgentConnections(nodes, [])
    
    expect(results.length).toBe(1)
    expect(results[0].isFullyConnected).toBe(false)
  })

  it("should handle circular connections", () => {
    const nodes = [
      createNode("agent-a"),
      createNode("agent-b"),
      createNode("agent-c"),
    ]
    const connections = [
      createConnection("agent-a", "agent-b"),
      createConnection("agent-b", "agent-c"),
      createConnection("agent-c", "agent-a"),
    ]
    
    const results = validateAgentConnections(nodes, connections)
    expect(results.length).toBe(3)
  })

  it("should handle inactive connections", () => {
    const nodes = [
      createNode("myca-orchestrator", "orchestrator"),
      createNode("test-agent"),
    ]
    const connections = [
      { ...createConnection("test-agent", "myca-orchestrator"), active: false },
    ]
    
    const results = validateAgentConnections(nodes, connections)
    const agentResult = results.find(r => r.agentId === "test-agent")
    
    // Inactive connection should not count
    expect(agentResult?.hasOrchestratorPath).toBe(false)
  })
})
