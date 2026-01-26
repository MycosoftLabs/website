/**
 * MYCA NLQ Engine Tests
 * Created: Jan 26, 2026
 */

import { describe, it, expect, beforeEach } from "vitest"
import { 
  MycaNLQEngine, 
  quickParseIntent, 
  getSuggestedQueries,
  type Intent,
  type IntentType,
} from "@/lib/services/myca-nlq"

describe("MycaNLQEngine", () => {
  let engine: MycaNLQEngine

  beforeEach(() => {
    engine = MycaNLQEngine.getInstance()
  })

  describe("parseIntent", () => {
    // Agent query tests
    it("should parse 'show all agents' as query_agents", () => {
      const intent = engine.parseIntent("show all agents")
      expect(intent.type).toBe("query_agents")
      expect(intent.confidence).toBeGreaterThan(0.5)
    })

    it("should parse 'list financial agents' with category entity", () => {
      const intent = engine.parseIntent("list financial agents")
      expect(intent.type).toBe("query_agents")
      expect(intent.entities.category).toBe("financial")
    })

    it("should parse 'which agents are active'", () => {
      const intent = engine.parseIntent("which agents are active")
      expect(intent.type).toBe("query_agents")
      expect(intent.entities.status).toBe("active")
    })

    it("should parse 'agents with high cpu'", () => {
      const intent = engine.parseIntent("agents with high cpu")
      expect(intent.type).toBe("query_agents")
      expect(intent.entities.metric).toBe("cpu")
    })

    it("should parse 'find agents with high memory'", () => {
      const intent = engine.parseIntent("find agents with high memory")
      expect(intent.type).toBe("query_agents")
      expect(intent.entities.metric).toBe("memory")
    })

    // Database query tests
    it("should parse 'query the database' as query_data", () => {
      const intent = engine.parseIntent("query the database")
      expect(intent.type).toBe("query_data")
    })

    it("should parse 'search mindex for species'", () => {
      const intent = engine.parseIntent("search mindex for species")
      expect(intent.type).toBe("query_data")
    })

    // Document search tests
    it("should parse 'find docs about deployment' as query_documents", () => {
      const intent = engine.parseIntent("find docs about deployment")
      expect(intent.type).toBe("query_documents")
    })

    it("should parse 'documentation on mycobrain'", () => {
      const intent = engine.parseIntent("documentation on mycobrain")
      expect(intent.type).toBe("query_documents")
    })

    // Memory recall tests
    it("should parse 'what did we discuss yesterday' as query_memory", () => {
      const intent = engine.parseIntent("what did we discuss yesterday")
      expect(intent.type).toBe("query_memory")
    })

    it("should parse 'remember what we talked about'", () => {
      const intent = engine.parseIntent("remember what we talked about")
      expect(intent.type).toBe("query_memory")
    })

    // Telemetry tests
    it("should parse 'show temperature readings' as query_telemetry", () => {
      const intent = engine.parseIntent("show temperature readings")
      expect(intent.type).toBe("query_telemetry")
    })

    it("should parse 'mycobrain sensor data'", () => {
      const intent = engine.parseIntent("mycobrain sensor data")
      expect(intent.type).toBe("query_telemetry")
    })

    // Analytics tests
    it("should parse 'error rate today' as query_analytics", () => {
      const intent = engine.parseIntent("error rate today")
      expect(intent.type).toBe("query_analytics")
    })

    it("should parse 'average cpu usage'", () => {
      const intent = engine.parseIntent("average cpu usage")
      expect(intent.type).toBe("query_analytics")
    })

    // Action tests
    it("should parse 'restart mercury agent' as action_agent", () => {
      const intent = engine.parseIntent("restart mercury agent")
      expect(intent.type).toBe("action_agent")
      expect(intent.entities.agentName).toBeDefined()
    })

    it("should parse 'stop the financial agent'", () => {
      const intent = engine.parseIntent("stop the financial agent")
      expect(intent.type).toBe("action_agent")
    })

    it("should parse 'run health check workflow' as action_workflow", () => {
      const intent = engine.parseIntent("run health check workflow")
      expect(intent.type).toBe("action_workflow")
    })

    it("should parse 'spawn a new security agent' as action_spawn", () => {
      const intent = engine.parseIntent("spawn a new security agent")
      expect(intent.type).toBe("action_spawn")
    })

    // Navigation tests
    it("should parse 'go to topology' as navigation", () => {
      const intent = engine.parseIntent("go to topology")
      expect(intent.type).toBe("navigation")
    })

    // Help tests
    it("should parse 'what can you do' as help", () => {
      const intent = engine.parseIntent("what can you do")
      expect(intent.type).toBe("help")
    })

    it("should parse 'help' as help", () => {
      const intent = engine.parseIntent("help")
      expect(intent.type).toBe("help")
    })

    // Fallback tests
    it("should return conversation type for unrecognized queries", () => {
      const intent = engine.parseIntent("random gibberish xyz123")
      expect(intent.confidence).toBeLessThan(0.7)
    })
  })

  describe("routeQuery", () => {
    it("should route agent queries to agents data source", () => {
      const intent: Intent = {
        type: "query_agents",
        confidence: 0.85,
        entities: {},
        rawQuery: "show all agents",
        suggestedDataSources: ["agents"],
      }
      const sources = engine.routeQuery(intent)
      expect(sources).toContain("agents")
    })

    it("should route document queries to documents and qdrant", () => {
      const intent: Intent = {
        type: "query_documents",
        confidence: 0.85,
        entities: {},
        rawQuery: "find docs",
        suggestedDataSources: ["documents", "qdrant"],
      }
      const sources = engine.routeQuery(intent)
      expect(sources).toContain("documents")
    })

    it("should use custom data sources when provided", () => {
      const intent: Intent = {
        type: "query_data",
        confidence: 0.85,
        entities: {},
        rawQuery: "custom query",
        suggestedDataSources: [],
      }
      const sources = engine.routeQuery(intent, { dataSources: ["mindex"] })
      expect(sources).toEqual(["mindex"])
    })
  })

  describe("formatResponse", () => {
    it("should format agent query response correctly", () => {
      const intent: Intent = {
        type: "query_agents",
        confidence: 0.85,
        entities: {},
        rawQuery: "show all agents",
        suggestedDataSources: ["agents"],
      }
      const results = [
        { id: "1", name: "Mercury", category: "financial", status: "active" },
        { id: "2", name: "Venus", category: "core", status: "busy" },
      ]
      const sources = [{ name: "MAS Agents", type: "agents" as const, confidence: 0.85 }]
      
      const response = engine.formatResponse(results, intent, sources, 100)
      
      expect(response.type).toBe("data")
      expect(response.text).toContain("2 agents")
      expect(response.data).toHaveLength(2)
    })

    it("should format help response with suggestions", () => {
      const intent: Intent = {
        type: "help",
        confidence: 0.85,
        entities: {},
        rawQuery: "help",
        suggestedDataSources: [],
      }
      
      const response = engine.formatResponse([], intent, [], 50)
      
      expect(response.type).toBe("answer")
      expect(response.text).toContain("MYCA")
      expect(response.suggestions).toBeDefined()
      expect(response.suggestions!.length).toBeGreaterThan(0)
    })

    it("should format action response with actions", () => {
      const intent: Intent = {
        type: "action_agent",
        confidence: 0.85,
        entities: { agentName: "mercury", action: "restart" },
        rawQuery: "restart mercury",
        suggestedDataSources: ["agents"],
      }
      
      const response = engine.formatResponse([], intent, [], 50)
      
      expect(response.type).toBe("action")
      expect(response.actions).toBeDefined()
      expect(response.actions!.length).toBeGreaterThan(0)
    })
  })
})

describe("quickParseIntent", () => {
  it("should return correct intent type for agent queries", () => {
    expect(quickParseIntent("show agents")).toBe("query_agents")
  })

  it("should return correct intent type for document queries", () => {
    expect(quickParseIntent("find documentation")).toBe("query_documents")
  })
})

describe("getSuggestedQueries", () => {
  it("should return base suggestions without context", () => {
    const suggestions = getSuggestedQueries()
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions).toContain("Show all agents")
  })

  it("should return topology-specific suggestions for topology context", () => {
    const suggestions = getSuggestedQueries({ currentPage: "/natureos/mas/topology" })
    expect(suggestions.some(s => s.includes("CPU"))).toBe(true)
  })

  it("should return agent-specific suggestions when agent is selected", () => {
    const suggestions = getSuggestedQueries({ selectedAgentId: "mercury-1" })
    expect(suggestions.some(s => s.includes("agent"))).toBe(true)
  })
})
