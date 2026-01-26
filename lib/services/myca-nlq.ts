/**
 * MYCA Natural Language Query (NLQ) Engine
 * Metabase-style natural language to structured query system
 * 
 * Provides unified NLQ across all MYCA interfaces:
 * - Command-K search
 * - MYCA Chat Panel
 * - Topology AgentQuery
 * - Voice STT/TTS
 * 
 * Created: Jan 26, 2026
 */

// =============================================================================
// Types
// =============================================================================

export type IntentType = 
  | "query_agents"      // Query agent status, metrics, list
  | "query_data"        // Query databases (MINDEX, Supabase)
  | "query_documents"   // Search document knowledge base
  | "query_memory"      // Recall conversation history
  | "query_telemetry"   // Device/sensor data queries
  | "query_analytics"   // Analytics and trends
  | "action_agent"      // Agent control (start, stop, restart)
  | "action_workflow"   // Trigger n8n workflow
  | "action_spawn"      // Spawn new agent
  | "action_connection" // Create/modify agent connections
  | "navigation"        // Navigate to page/feature
  | "help"              // Help and documentation
  | "conversation"      // General conversation
  | "unknown"

export type DataSourceType = 
  | "agents"            // MAS agent registry
  | "mindex"            // MINDEX PostgreSQL
  | "supabase"          // Supabase tables
  | "qdrant"            // Vector similarity search
  | "n8n"               // n8n workflows
  | "memory"            // Conversation memory
  | "telemetry"         // Device telemetry
  | "documents"         // Document knowledge base

export interface Intent {
  type: IntentType
  confidence: number
  entities: Record<string, string | number | boolean>
  rawQuery: string
  suggestedDataSources: DataSourceType[]
}

export interface NLQQuery {
  text: string
  context?: NLQContext
  options?: NLQOptions
}

export interface NLQContext {
  sessionId?: string
  userId?: string
  currentPage?: string
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
  selectedAgentId?: string
  filters?: Record<string, unknown>
}

export interface NLQOptions {
  wantAudio?: boolean
  maxResults?: number
  includeActions?: boolean
  streamResponse?: boolean
  dataSources?: DataSourceType[]
}

export interface NLQAction {
  id: string
  label: string
  description?: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  params?: Record<string, unknown>
  requiresConfirmation?: boolean
  icon?: string
}

export interface NLQDataItem {
  id: string
  type: string
  title: string
  subtitle?: string
  data: Record<string, unknown>
  onClick?: { action: string; params: Record<string, unknown> }
}

export interface NLQSource {
  name: string
  type: DataSourceType
  confidence: number
  queryTime?: number
}

export interface NLQResponse {
  type: "data" | "action" | "answer" | "clarification" | "error"
  text: string
  data?: NLQDataItem[]
  actions?: NLQAction[]
  suggestions?: string[]
  sources?: NLQSource[]
  audio_base64?: string
  metadata?: {
    intent: Intent
    processingTime: number
    tokensUsed?: number
  }
}

// =============================================================================
// Intent Patterns
// =============================================================================

interface IntentPattern {
  patterns: RegExp[]
  type: IntentType
  entities?: string[]
  dataSources: DataSourceType[]
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Agent queries
  {
    patterns: [
      /(?:show|list|get|find|display)\s+(?:all\s+)?(?:the\s+)?(?:(\w+)\s+)?agents?/i,
      /(?:which|what)\s+agents?\s+(?:are\s+)?(\w+)/i,
      /agents?\s+(?:with|that\s+have)\s+(?:high\s+)?(\w+)/i,
      /(?:how\s+many|count)\s+agents?/i,
      /agent\s+status/i,
      /(?:top|most)\s+(\w+)\s+agents?/i,
    ],
    type: "query_agents",
    entities: ["category", "status", "metric"],
    dataSources: ["agents"],
  },
  
  // Database queries
  {
    patterns: [
      /(?:query|search|find)\s+(?:in\s+)?(?:the\s+)?(?:database|db|mindex)/i,
      /(?:show|get)\s+(?:data|records?)\s+(?:from|in)/i,
      /select\s+.+\s+from/i,
      /(?:what|which)\s+(?:data|records?)/i,
    ],
    type: "query_data",
    dataSources: ["mindex", "supabase"],
  },
  
  // Document search
  {
    patterns: [
      /(?:find|search|look\s+for)\s+(?:docs?|documentation|documents?)/i,
      /(?:where|how)\s+(?:is|do|can)\s+.+\s+(?:documented|explained)/i,
      /docs?\s+(?:about|on|for)\s+(\w+)/i,
      /(?:read|open|show)\s+(?:the\s+)?(\w+)\s+(?:docs?|documentation)/i,
    ],
    type: "query_documents",
    dataSources: ["documents", "qdrant"],
  },
  
  // Memory recall
  {
    patterns: [
      /(?:what|when)\s+did\s+(?:we|i)\s+(?:discuss|talk\s+about|mention)/i,
      /(?:remember|recall)\s+(?:when|what)/i,
      /(?:conversation|chat)\s+history/i,
      /(?:previous|last)\s+(?:conversation|discussion)/i,
    ],
    type: "query_memory",
    dataSources: ["memory"],
  },
  
  // Telemetry queries
  {
    patterns: [
      /(?:sensor|device|mycobrain)\s+(?:data|readings?|values?)/i,
      /(?:temperature|humidity|pressure|gas)\s+(?:readings?|data|level)/i,
      /(?:what|show)\s+(?:is|are)\s+(?:the\s+)?(?:current\s+)?(?:sensor|device)/i,
      /telemetry\s+(?:data|from)/i,
    ],
    type: "query_telemetry",
    dataSources: ["telemetry"],
  },
  
  // Analytics
  {
    patterns: [
      /(?:error|cpu|memory|message)\s+rate/i,
      /(?:average|avg|mean|total)\s+(\w+)/i,
      /(?:trend|graph|chart)\s+(?:of|for)/i,
      /(?:how\s+many|count)\s+(?:messages?|errors?|tasks?)/i,
      /(?:usage|utilization)\s+(?:over|for|this)/i,
      /(?:performance|health)\s+(?:metrics?|stats?|report)/i,
    ],
    type: "query_analytics",
    dataSources: ["agents", "mindex", "telemetry"],
  },
  
  // Agent actions
  {
    patterns: [
      /(?:start|stop|restart|pause|resume)\s+(?:the\s+)?(\w+)\s*(?:agent)?/i,
      /(?:kill|terminate)\s+(?:the\s+)?(\w+)/i,
      /(?:configure|reconfigure)\s+(?:the\s+)?(\w+)/i,
    ],
    type: "action_agent",
    entities: ["agentName", "action"],
    dataSources: ["agents"],
  },
  
  // Workflow actions
  {
    patterns: [
      /(?:run|execute|trigger)\s+(?:the\s+)?(\w+)\s*workflow/i,
      /(?:start|launch)\s+(?:the\s+)?(\w+)\s*(?:automation|job)/i,
      /(?:list|show)\s+(?:all\s+)?workflows?/i,
    ],
    type: "action_workflow",
    entities: ["workflowName"],
    dataSources: ["n8n"],
  },
  
  // Spawn agent
  {
    patterns: [
      /(?:spawn|create|deploy)\s+(?:a\s+)?(?:new\s+)?(\w+)\s*agent/i,
      /(?:add|provision)\s+(?:a\s+)?(?:new\s+)?agent/i,
    ],
    type: "action_spawn",
    entities: ["agentType", "category"],
    dataSources: ["agents"],
  },
  
  // Connection actions
  {
    patterns: [
      /(?:connect|link)\s+(\w+)\s+(?:to|with)\s+(\w+)/i,
      /(?:disconnect|unlink)\s+(\w+)\s+(?:from)\s+(\w+)/i,
      /(?:show|list)\s+connections?/i,
    ],
    type: "action_connection",
    entities: ["sourceAgent", "targetAgent"],
    dataSources: ["agents"],
  },
  
  // Navigation
  {
    patterns: [
      /(?:go|navigate|take\s+me)\s+to\s+(?:the\s+)?(\w+)/i,
      /(?:open|show|display)\s+(?:the\s+)?(\w+)\s*(?:page|dashboard|view)?/i,
    ],
    type: "navigation",
    entities: ["destination"],
    dataSources: [],
  },
  
  // Help
  {
    patterns: [
      /(?:help|assist|guide)/i,
      /(?:what|how)\s+can\s+(?:you|myca)\s+do/i,
      /(?:commands?|features?|capabilities)/i,
    ],
    type: "help",
    dataSources: ["documents"],
  },
]

// =============================================================================
// Entity Extraction Patterns
// =============================================================================

const ENTITY_PATTERNS = {
  // Agent categories
  category: /\b(core|financial|mycology|research|dao|communication|data|infrastructure|simulation|security|integration|device|chemistry|nlm)\b/i,
  
  // Agent statuses
  status: /\b(active|busy|idle|offline|error|starting|stopping)\b/i,
  
  // Metrics
  metric: /\b(cpu|memory|ram|error|latency|messages?|throughput|uptime)\b/i,
  
  // Time references
  timeRange: /\b(today|yesterday|this\s+week|last\s+week|this\s+month|last\s+hour)\b/i,
  
  // Numbers
  number: /\b(\d+)\b/,
  
  // Comparison
  comparison: /\b(high|low|above|below|greater|less|more|fewer)\b/i,
}

// =============================================================================
// NLQ Engine Class
// =============================================================================

export class MycaNLQEngine {
  private static instance: MycaNLQEngine
  
  private constructor() {}
  
  static getInstance(): MycaNLQEngine {
    if (!MycaNLQEngine.instance) {
      MycaNLQEngine.instance = new MycaNLQEngine()
    }
    return MycaNLQEngine.instance
  }
  
  /**
   * Parse natural language query into structured intent
   */
  parseIntent(query: string): Intent {
    const normalizedQuery = query.toLowerCase().trim()
    
    // Try each pattern
    for (const pattern of INTENT_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = normalizedQuery.match(regex)
        if (match) {
          const entities = this.extractEntities(normalizedQuery, pattern.entities || [])
          
          // Add captured groups as entities
          if (match.length > 1) {
            match.slice(1).forEach((group, i) => {
              if (group && pattern.entities && pattern.entities[i]) {
                entities[pattern.entities[i]] = group
              }
            })
          }
          
          return {
            type: pattern.type,
            confidence: 0.85,
            entities,
            rawQuery: query,
            suggestedDataSources: pattern.dataSources,
          }
        }
      }
    }
    
    // Fallback: try to extract any entities for general query
    const entities = this.extractEntities(normalizedQuery, Object.keys(ENTITY_PATTERNS))
    
    // Determine best fallback type based on entities
    let fallbackType: IntentType = "conversation"
    const fallbackSources: DataSourceType[] = []
    
    if (entities.category || entities.status) {
      fallbackType = "query_agents"
      fallbackSources.push("agents")
    } else if (entities.metric) {
      fallbackType = "query_analytics"
      fallbackSources.push("agents", "mindex")
    }
    
    return {
      type: fallbackType,
      confidence: 0.5,
      entities,
      rawQuery: query,
      suggestedDataSources: fallbackSources,
    }
  }
  
  /**
   * Extract entities from query text
   */
  private extractEntities(query: string, entityTypes: string[]): Record<string, string | number | boolean> {
    const entities: Record<string, string | number | boolean> = {}
    
    for (const entityType of entityTypes) {
      const pattern = ENTITY_PATTERNS[entityType as keyof typeof ENTITY_PATTERNS]
      if (pattern) {
        const match = query.match(pattern)
        if (match) {
          entities[entityType] = match[1]
        }
      }
    }
    
    return entities
  }
  
  /**
   * Route query to appropriate data sources
   */
  routeQuery(intent: Intent, options?: NLQOptions): DataSourceType[] {
    // Use specified data sources if provided
    if (options?.dataSources && options.dataSources.length > 0) {
      return options.dataSources
    }
    
    // Use suggested sources from intent
    if (intent.suggestedDataSources.length > 0) {
      return intent.suggestedDataSources
    }
    
    // Default routing based on intent type
    const routingMap: Record<IntentType, DataSourceType[]> = {
      query_agents: ["agents"],
      query_data: ["mindex", "supabase"],
      query_documents: ["documents", "qdrant"],
      query_memory: ["memory"],
      query_telemetry: ["telemetry"],
      query_analytics: ["agents", "mindex"],
      action_agent: ["agents"],
      action_workflow: ["n8n"],
      action_spawn: ["agents"],
      action_connection: ["agents"],
      navigation: [],
      help: ["documents"],
      conversation: ["memory"],
      unknown: [],
    }
    
    return routingMap[intent.type] || []
  }
  
  /**
   * Build context for query execution
   */
  buildContext(query: NLQQuery): NLQContext {
    return {
      sessionId: query.context?.sessionId || `session-${Date.now()}`,
      userId: query.context?.userId || "default",
      currentPage: query.context?.currentPage,
      conversationHistory: query.context?.conversationHistory || [],
      selectedAgentId: query.context?.selectedAgentId,
      filters: query.context?.filters || {},
    }
  }
  
  /**
   * Format response based on intent and results
   */
  formatResponse(
    results: unknown[],
    intent: Intent,
    sources: NLQSource[],
    processingTime: number
  ): NLQResponse {
    const response: NLQResponse = {
      type: "answer",
      text: "",
      data: [],
      actions: [],
      suggestions: [],
      sources,
      metadata: {
        intent,
        processingTime,
      },
    }
    
    // Format based on intent type
    switch (intent.type) {
      case "query_agents":
        response.type = "data"
        response.text = this.formatAgentQueryText(results, intent)
        response.data = this.formatAgentData(results)
        response.actions = this.getAgentActions(results)
        break
        
      case "query_data":
      case "query_analytics":
        response.type = "data"
        response.text = this.formatDataQueryText(results, intent)
        response.data = this.formatGenericData(results)
        break
        
      case "query_documents":
        response.type = "data"
        response.text = `Found ${results.length} relevant documents.`
        response.data = this.formatDocumentData(results)
        break
        
      case "query_memory":
        response.type = "data"
        response.text = this.formatMemoryText(results)
        response.data = this.formatMemoryData(results)
        break
        
      case "query_telemetry":
        response.type = "data"
        response.text = this.formatTelemetryText(results)
        response.data = this.formatTelemetryData(results)
        break
        
      case "action_agent":
      case "action_workflow":
      case "action_spawn":
      case "action_connection":
        response.type = "action"
        response.text = this.formatActionText(intent)
        response.actions = this.buildActions(intent)
        break
        
      case "navigation":
        response.type = "action"
        response.text = `Navigating to ${intent.entities.destination || "the requested page"}.`
        response.actions = [this.buildNavigationAction(intent)]
        break
        
      case "help":
        response.type = "answer"
        response.text = this.getHelpText()
        response.suggestions = this.getHelpSuggestions()
        break
        
      default:
        response.type = "answer"
        response.text = "I understand. How can I help you with that?"
        response.suggestions = this.getDefaultSuggestions()
    }
    
    return response
  }
  
  // =============================================================================
  // Formatting Helpers
  // =============================================================================
  
  private formatAgentQueryText(results: unknown[], intent: Intent): string {
    const count = Array.isArray(results) ? results.length : 0
    const category = intent.entities.category as string
    const status = intent.entities.status as string
    
    let text = `Found ${count} agent${count !== 1 ? "s" : ""}`
    if (category) text += ` in the ${category} category`
    if (status) text += ` with ${status} status`
    
    return text + "."
  }
  
  private formatAgentData(results: unknown[]): NLQDataItem[] {
    if (!Array.isArray(results)) return []
    
    return results.slice(0, 20).map((agent: unknown) => {
      const a = agent as Record<string, unknown>
      return {
        id: String(a.id || ""),
        type: "agent",
        title: String(a.name || a.shortName || "Unknown Agent"),
        subtitle: `${a.category || "unknown"} • ${a.status || "unknown"}`,
        data: a,
        onClick: { action: "selectAgent", params: { agentId: a.id } },
      }
    })
  }
  
  private getAgentActions(results: unknown[]): NLQAction[] {
    const actions: NLQAction[] = []
    
    if (Array.isArray(results) && results.length > 0) {
      const firstAgent = results[0] as Record<string, unknown>
      actions.push({
        id: "restart-agent",
        label: "Restart Agent",
        description: "Restart the selected agent",
        endpoint: "/api/mas/agents/action",
        method: "POST",
        params: { agentId: firstAgent.id, action: "restart" },
        requiresConfirmation: true,
        icon: "refresh",
      })
    }
    
    return actions
  }
  
  private formatDataQueryText(results: unknown[], intent: Intent): string {
    const count = Array.isArray(results) ? results.length : 0
    return `Query returned ${count} result${count !== 1 ? "s" : ""}.`
  }
  
  private formatGenericData(results: unknown[]): NLQDataItem[] {
    if (!Array.isArray(results)) return []
    
    return results.slice(0, 50).map((item: unknown, index: number) => {
      const i = item as Record<string, unknown>
      return {
        id: String(i.id || `item-${index}`),
        type: "data",
        title: String(i.name || i.title || `Item ${index + 1}`),
        subtitle: String(i.description || i.type || ""),
        data: i,
      }
    })
  }
  
  private formatDocumentData(results: unknown[]): NLQDataItem[] {
    if (!Array.isArray(results)) return []
    
    return results.slice(0, 10).map((doc: unknown) => {
      const d = doc as Record<string, unknown>
      return {
        id: String(d.id || d.path || ""),
        type: "document",
        title: String(d.title || d.name || "Untitled"),
        subtitle: String(d.path || d.href || ""),
        data: d,
        onClick: { action: "openDocument", params: { path: d.path || d.href } },
      }
    })
  }
  
  private formatMemoryText(results: unknown[]): string {
    const count = Array.isArray(results) ? results.length : 0
    if (count === 0) return "No relevant conversation history found."
    return `Found ${count} relevant conversation${count !== 1 ? "s" : ""} in memory.`
  }
  
  private formatMemoryData(results: unknown[]): NLQDataItem[] {
    if (!Array.isArray(results)) return []
    
    return results.slice(0, 10).map((mem: unknown) => {
      const m = mem as Record<string, unknown>
      return {
        id: String(m.id || m.session_id || ""),
        type: "memory",
        title: String(m.content || m.message || "").slice(0, 100),
        subtitle: String(m.timestamp || m.created_at || ""),
        data: m,
      }
    })
  }
  
  private formatTelemetryText(results: unknown[]): string {
    const count = Array.isArray(results) ? results.length : 0
    return `Retrieved ${count} telemetry reading${count !== 1 ? "s" : ""}.`
  }
  
  private formatTelemetryData(results: unknown[]): NLQDataItem[] {
    if (!Array.isArray(results)) return []
    
    return results.slice(0, 50).map((reading: unknown, index: number) => {
      const r = reading as Record<string, unknown>
      return {
        id: String(r.id || `reading-${index}`),
        type: "telemetry",
        title: String(r.sensor_name || r.device_id || `Sensor ${index + 1}`),
        subtitle: `${r.value || "-"} ${r.unit || ""}`,
        data: r,
      }
    })
  }
  
  private formatActionText(intent: Intent): string {
    const actionMap: Record<string, string> = {
      action_agent: `Ready to ${intent.entities.action || "perform action on"} agent.`,
      action_workflow: `Ready to run ${intent.entities.workflowName || "workflow"}.`,
      action_spawn: `Ready to spawn new ${intent.entities.agentType || ""} agent.`,
      action_connection: `Ready to modify agent connections.`,
    }
    return actionMap[intent.type] || "Action ready to execute."
  }
  
  private buildActions(intent: Intent): NLQAction[] {
    const actions: NLQAction[] = []
    
    switch (intent.type) {
      case "action_agent":
        actions.push({
          id: `${intent.entities.action}-agent`,
          label: `${String(intent.entities.action || "Action")} Agent`,
          endpoint: "/api/mas/agents/action",
          method: "POST",
          params: {
            agentName: intent.entities.agentName,
            action: intent.entities.action,
          },
          requiresConfirmation: true,
        })
        break
        
      case "action_workflow":
        actions.push({
          id: "run-workflow",
          label: `Run ${intent.entities.workflowName || "Workflow"}`,
          endpoint: "/api/mas/workflows/trigger",
          method: "POST",
          params: { workflowName: intent.entities.workflowName },
          requiresConfirmation: true,
        })
        break
        
      case "action_spawn":
        actions.push({
          id: "spawn-agent",
          label: `Spawn ${intent.entities.agentType || "Agent"}`,
          endpoint: "/api/mas/agents/spawn",
          method: "POST",
          params: {
            type: intent.entities.agentType,
            category: intent.entities.category,
          },
          requiresConfirmation: true,
        })
        break
    }
    
    return actions
  }
  
  private buildNavigationAction(intent: Intent): NLQAction {
    const destination = String(intent.entities.destination || "").toLowerCase()
    
    const navigationMap: Record<string, string> = {
      topology: "/natureos/mas/topology",
      dashboard: "/natureos",
      agents: "/natureos/mas/topology",
      devices: "/natureos/devices",
      mindex: "/natureos/mindex",
      settings: "/natureos/settings",
      workflows: "/natureos/workflows",
      "ai studio": "/natureos/ai-studio",
      security: "/natureos/security",
    }
    
    return {
      id: "navigate",
      label: `Go to ${intent.entities.destination || "page"}`,
      endpoint: navigationMap[destination] || `/natureos/${destination}`,
      method: "GET",
    }
  }
  
  private getHelpText(): string {
    return `I'm MYCA, your Mycosoft Cognitive Agent. I can help you with:

**Agent Management**
• "Show all financial agents"
• "Restart the mercury agent"
• "Spawn a new security agent"

**System Queries**
• "What's the CPU usage?"
• "Show error rate for today"
• "Find agents with high memory"

**Documents & Memory**
• "Find docs about deployment"
• "What did we discuss about security?"

**Workflows**
• "Run the health check workflow"
• "List all workflows"

**Navigation**
• "Go to topology"
• "Open the dashboard"

Just ask naturally and I'll route your request to the right systems.`
  }
  
  private getHelpSuggestions(): string[] {
    return [
      "Show all active agents",
      "What's the system health?",
      "Find documentation about MINDEX",
      "List n8n workflows",
      "Go to topology view",
    ]
  }
  
  private getDefaultSuggestions(): string[] {
    return [
      "Show agent status",
      "What can you do?",
      "List all agents",
      "System health",
    ]
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const nlqEngine = MycaNLQEngine.getInstance()

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick parse for simple intent detection (used in UI components)
 */
export function quickParseIntent(query: string): IntentType {
  return nlqEngine.parseIntent(query).type
}

/**
 * Get suggested queries based on current context
 */
export function getSuggestedQueries(context?: NLQContext): string[] {
  const base = [
    "Show all agents",
    "System health status",
    "What can you do?",
  ]
  
  if (context?.currentPage?.includes("topology")) {
    return [
      "Show agents with high CPU",
      "Find offline agents",
      "Spawn a security agent",
      ...base,
    ]
  }
  
  if (context?.selectedAgentId) {
    return [
      "Restart this agent",
      "Show agent metrics",
      "Find connected agents",
      ...base,
    ]
  }
  
  return base
}
