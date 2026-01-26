/**
 * NLQ Connectors Tests
 * Created: Jan 26, 2026
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AgentsConnector } from "@/lib/services/nlq-connectors/agents-connector"
import { DocumentsConnector } from "@/lib/services/nlq-connectors/documents-connector"
import { MemoryConnector } from "@/lib/services/nlq-connectors/memory-connector"
import { TelemetryConnector } from "@/lib/services/nlq-connectors/telemetry-connector"
import { N8nConnector } from "@/lib/services/nlq-connectors/n8n-connector"
import type { Intent } from "@/lib/services/myca-nlq"

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("AgentsConnector", () => {
  let connector: AgentsConnector

  beforeEach(() => {
    connector = new AgentsConnector()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should have correct name and sourceType", () => {
    expect(connector.name).toBe("MAS Agents")
    expect(connector.sourceType).toBe("agents")
  })

  it("should query agents successfully", async () => {
    const mockAgents = [
      { id: "1", name: "Mercury", category: "financial", status: "active" },
      { id: "2", name: "Venus", category: "core", status: "busy" },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ nodes: mockAgents }),
    })

    const intent: Intent = {
      type: "query_agents",
      confidence: 0.85,
      entities: {},
      rawQuery: "show all agents",
      suggestedDataSources: ["agents"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.length).toBe(2)
    expect(result.source).toBe("agents")
  })

  it("should filter agents by category", async () => {
    const mockAgents = [
      { id: "1", name: "Mercury", category: "financial", status: "active" },
      { id: "2", name: "Venus", category: "core", status: "busy" },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ nodes: mockAgents }),
    })

    const intent: Intent = {
      type: "query_agents",
      confidence: 0.85,
      entities: { category: "financial" },
      rawQuery: "show financial agents",
      suggestedDataSources: ["agents"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.length).toBe(1)
    expect((result.data[0] as { category: string }).category).toBe("financial")
  })

  it("should handle fetch errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const intent: Intent = {
      type: "query_agents",
      confidence: 0.85,
      entities: {},
      rawQuery: "show all agents",
      suggestedDataSources: ["agents"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe("DocumentsConnector", () => {
  let connector: DocumentsConnector

  beforeEach(() => {
    connector = new DocumentsConnector()
    vi.clearAllMocks()
  })

  it("should have correct name and sourceType", () => {
    expect(connector.name).toBe("Document KB")
    expect(connector.sourceType).toBe("documents")
  })

  it("should always be available (local fallback)", async () => {
    const available = await connector.isAvailable()
    expect(available).toBe(true)
  })

  it("should return local docs for deployment query", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API not available"))

    const intent: Intent = {
      type: "query_documents",
      confidence: 0.85,
      entities: {},
      rawQuery: "find docs about deployment",
      suggestedDataSources: ["documents"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
    expect(result.data.some((d: { title?: string }) => 
      d.title?.toLowerCase().includes("deployment")
    )).toBe(true)
  })

  it("should return local docs for mycobrain query", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API not available"))

    const intent: Intent = {
      type: "query_documents",
      confidence: 0.85,
      entities: {},
      rawQuery: "documentation about mycobrain",
      suggestedDataSources: ["documents"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.some((d: { title?: string }) => 
      d.title?.toLowerCase().includes("mycobrain")
    )).toBe(true)
  })
})

describe("MemoryConnector", () => {
  let connector: MemoryConnector

  beforeEach(() => {
    connector = new MemoryConnector()
    vi.clearAllMocks()
  })

  it("should have correct name and sourceType", () => {
    expect(connector.name).toBe("Conversation Memory")
    expect(connector.sourceType).toBe("memory")
  })

  it("should query memory with filters", async () => {
    const mockConversations = [
      { id: "1", content: "discussed security", timestamp: "2026-01-25" },
      { id: "2", content: "talked about deployment", timestamp: "2026-01-24" },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: mockConversations }),
    })

    const intent: Intent = {
      type: "query_memory",
      confidence: 0.85,
      entities: {},
      rawQuery: "what did we discuss about security",
      suggestedDataSources: ["memory"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.length).toBe(1)
    expect((result.data[0] as { content: string }).content).toContain("security")
  })
})

describe("TelemetryConnector", () => {
  let connector: TelemetryConnector

  beforeEach(() => {
    connector = new TelemetryConnector()
    vi.clearAllMocks()
  })

  it("should have correct name and sourceType", () => {
    expect(connector.name).toBe("Device Telemetry")
    expect(connector.sourceType).toBe("telemetry")
  })

  it("should return sample telemetry when API unavailable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API not available"))
    mockFetch.mockRejectedValueOnce(new Error("API not available"))

    const intent: Intent = {
      type: "query_telemetry",
      confidence: 0.85,
      entities: {},
      rawQuery: "show temperature readings",
      suggestedDataSources: ["telemetry"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
    expect(result.data.some((d: { type?: string }) => d.type === "temperature")).toBe(true)
  })
})

describe("N8nConnector", () => {
  let connector: N8nConnector

  beforeEach(() => {
    connector = new N8nConnector()
    vi.clearAllMocks()
  })

  it("should have correct name and sourceType", () => {
    expect(connector.name).toBe("n8n Workflows")
    expect(connector.sourceType).toBe("n8n")
  })

  it("should return fallback workflows when API unavailable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("n8n not available"))

    const intent: Intent = {
      type: "action_workflow",
      confidence: 0.85,
      entities: {},
      rawQuery: "list all workflows",
      suggestedDataSources: ["n8n"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
    expect(result.data.some((d: { name?: string }) => 
      d.name?.includes("Voice Chat") || d.name?.includes("Jarvis")
    )).toBe(true)
  })

  it("should attempt to trigger workflow for action_workflow intent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ executionId: "exec-123" }),
    })

    const intent: Intent = {
      type: "action_workflow",
      confidence: 0.85,
      entities: { workflowName: "health_check" },
      rawQuery: "run health check workflow",
      suggestedDataSources: ["n8n"],
    }

    const result = await connector.query(intent)

    expect(result.success).toBe(true)
    expect(result.data[0]).toHaveProperty("triggered", true)
  })
})
