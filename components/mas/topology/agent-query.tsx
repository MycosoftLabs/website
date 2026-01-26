"use client"

/**
 * Agent Query Component
 * Metabase-style natural language query for agents
 * Inspired by: https://github.com/metabase/metabase (Metabot AI)
 * 
 * Allows users to ask questions like:
 * - "Which agents have high CPU usage?"
 * - "Show me all agents connected to Redis"
 * - "What's the error rate for financial agents?"
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Sparkles,
  Send,
  X,
  HelpCircle,
  Cpu,
  MemoryStick,
  AlertTriangle,
  Activity,
  Network,
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type { TopologyNode, TopologyConnection, NodeCategory, NodeStatus } from "./types"
import { CATEGORY_COLORS, STATUS_COLORS } from "./types"

interface AgentQueryProps {
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  onNodeSelect: (nodeId: string) => void
  onHighlightNodes: (nodeIds: string[]) => void
  className?: string
}

interface QueryResult {
  type: "agents" | "stats" | "answer"
  agents?: TopologyNode[]
  stats?: Record<string, number | string>
  answer?: string
  query: string
}

// Query patterns for parsing natural language
const QUERY_PATTERNS = [
  // High CPU/Memory queries
  { pattern: /(?:agents?|nodes?)\s+(?:with\s+)?high\s+cpu/i, type: "high_cpu" },
  { pattern: /(?:agents?|nodes?)\s+(?:with\s+)?high\s+memory/i, type: "high_memory" },
  { pattern: /(?:agents?|nodes?)\s+(?:with\s+)?high\s+error/i, type: "high_errors" },
  
  // Status queries
  { pattern: /(?:agents?|nodes?)\s+(?:that\s+are\s+)?offline/i, type: "status_offline" },
  { pattern: /(?:agents?|nodes?)\s+(?:that\s+are\s+)?active/i, type: "status_active" },
  { pattern: /(?:agents?|nodes?)\s+(?:that\s+are\s+)?busy/i, type: "status_busy" },
  { pattern: /(?:agents?|nodes?)\s+(?:that\s+are\s+)?idle/i, type: "status_idle" },
  { pattern: /(?:agents?|nodes?)\s+(?:with\s+)?errors?/i, type: "status_error" },
  
  // Category queries
  { pattern: /(?:show|list|get|find)\s+(?:all\s+)?(\w+)\s+agents?/i, type: "category" },
  { pattern: /agents?\s+in\s+(?:the\s+)?(\w+)\s+category/i, type: "category" },
  
  // Connection queries
  { pattern: /(?:agents?|nodes?)\s+connected\s+to\s+(\w+)/i, type: "connected_to" },
  { pattern: /connections?\s+(?:to|from)\s+(\w+)/i, type: "connected_to" },
  
  // Stats queries
  { pattern: /how\s+many\s+agents?/i, type: "count_agents" },
  { pattern: /total\s+(?:number\s+of\s+)?agents?/i, type: "count_agents" },
  { pattern: /average\s+(?:cpu|memory|error)/i, type: "average_metrics" },
  { pattern: /(?:system|overall)\s+health/i, type: "system_health" },
  
  // Most/Top queries
  { pattern: /(?:most|top|highest)\s+cpu/i, type: "top_cpu" },
  { pattern: /(?:most|top|highest)\s+memory/i, type: "top_memory" },
  { pattern: /(?:most|top|highest)\s+(?:active|busy)/i, type: "most_active" },
  
  // Search by name
  { pattern: /(?:find|search|where\s+is)\s+(\w+)/i, type: "search_name" },
]

// Example queries for help
const EXAMPLE_QUERIES = [
  "Which agents have high CPU usage?",
  "Show all financial agents",
  "Agents connected to Redis",
  "How many agents are active?",
  "Top 5 CPU consumers",
  "Agents with errors",
  "Find mycobrain",
  "System health status",
]

// Parse and execute natural language query
function executeQuery(
  query: string, 
  nodes: TopologyNode[], 
  connections: TopologyConnection[]
): QueryResult {
  const normalizedQuery = query.toLowerCase().trim()
  
  // Check each pattern
  for (const { pattern, type } of QUERY_PATTERNS) {
    const match = normalizedQuery.match(pattern)
    if (!match) continue
    
    switch (type) {
      case "high_cpu": {
        const highCpu = nodes.filter(n => n.metrics.cpuPercent > 50).sort((a, b) => b.metrics.cpuPercent - a.metrics.cpuPercent)
        return {
          type: "agents",
          agents: highCpu,
          query,
          answer: highCpu.length > 0 
            ? `Found ${highCpu.length} agents with CPU > 50%`
            : "No agents with high CPU usage found",
        }
      }
      
      case "high_memory": {
        const highMem = nodes.filter(n => n.metrics.memoryMb > 512).sort((a, b) => b.metrics.memoryMb - a.metrics.memoryMb)
        return {
          type: "agents",
          agents: highMem,
          query,
          answer: highMem.length > 0 
            ? `Found ${highMem.length} agents using > 512MB memory`
            : "No agents with high memory usage found",
        }
      }
      
      case "high_errors": {
        const highErrors = nodes.filter(n => n.metrics.errorRate > 0.01).sort((a, b) => b.metrics.errorRate - a.metrics.errorRate)
        return {
          type: "agents",
          agents: highErrors,
          query,
          answer: highErrors.length > 0 
            ? `Found ${highErrors.length} agents with error rate > 1%`
            : "No agents with high error rates found",
        }
      }
      
      case "status_offline":
      case "status_active":
      case "status_busy":
      case "status_idle":
      case "status_error": {
        const status = type.replace("status_", "") as NodeStatus
        const filtered = nodes.filter(n => n.status === status)
        return {
          type: "agents",
          agents: filtered,
          query,
          answer: `Found ${filtered.length} ${status} agents`,
        }
      }
      
      case "category": {
        const categoryName = match[1]?.toLowerCase()
        const validCategories: NodeCategory[] = [
          "core", "financial", "mycology", "research", "dao", "communication",
          "data", "infrastructure", "simulation", "security", "integration",
          "device", "chemistry", "nlm"
        ]
        const category = validCategories.find(c => c.includes(categoryName) || categoryName.includes(c))
        if (category) {
          const filtered = nodes.filter(n => n.category === category)
          return {
            type: "agents",
            agents: filtered,
            query,
            answer: `Found ${filtered.length} ${category} agents`,
          }
        }
        break
      }
      
      case "connected_to": {
        const targetName = match[1]?.toLowerCase()
        const targetNode = nodes.find(n => 
          n.name.toLowerCase().includes(targetName) || 
          n.shortName.toLowerCase().includes(targetName) ||
          n.id.toLowerCase().includes(targetName)
        )
        if (targetNode) {
          const connectedIds = connections
            .filter(c => c.sourceId === targetNode.id || c.targetId === targetNode.id)
            .map(c => c.sourceId === targetNode.id ? c.targetId : c.sourceId)
          const connected = nodes.filter(n => connectedIds.includes(n.id))
          return {
            type: "agents",
            agents: connected,
            query,
            answer: `Found ${connected.length} agents connected to ${targetNode.shortName}`,
          }
        }
        return {
          type: "answer",
          query,
          answer: `Could not find agent matching "${targetName}"`,
        }
      }
      
      case "count_agents": {
        const active = nodes.filter(n => n.status === "active" || n.status === "busy").length
        const offline = nodes.filter(n => n.status === "offline").length
        return {
          type: "stats",
          stats: {
            "Total Agents": nodes.length,
            "Active": active,
            "Offline": offline,
            "Categories": new Set(nodes.map(n => n.category)).size,
          },
          query,
          answer: `There are ${nodes.length} total agents (${active} active, ${offline} offline)`,
        }
      }
      
      case "average_metrics": {
        const avgCpu = nodes.reduce((sum, n) => sum + n.metrics.cpuPercent, 0) / nodes.length
        const avgMem = nodes.reduce((sum, n) => sum + n.metrics.memoryMb, 0) / nodes.length
        const avgErr = nodes.reduce((sum, n) => sum + n.metrics.errorRate, 0) / nodes.length * 100
        return {
          type: "stats",
          stats: {
            "Avg CPU": `${avgCpu.toFixed(1)}%`,
            "Avg Memory": `${avgMem.toFixed(0)}MB`,
            "Avg Error Rate": `${avgErr.toFixed(2)}%`,
          },
          query,
          answer: `Average metrics across ${nodes.length} agents`,
        }
      }
      
      case "system_health": {
        const active = nodes.filter(n => n.status === "active" || n.status === "busy").length
        const healthPercent = (active / nodes.length) * 100
        const avgError = nodes.reduce((sum, n) => sum + n.metrics.errorRate, 0) / nodes.length * 100
        const status = healthPercent > 90 && avgError < 1 ? "Healthy" :
                       healthPercent > 70 && avgError < 5 ? "Degraded" : "Critical"
        return {
          type: "stats",
          stats: {
            "Status": status,
            "Uptime": `${healthPercent.toFixed(1)}%`,
            "Active Agents": `${active}/${nodes.length}`,
            "Error Rate": `${avgError.toFixed(2)}%`,
          },
          query,
          answer: `System is ${status} with ${healthPercent.toFixed(0)}% of agents active`,
        }
      }
      
      case "top_cpu": {
        const topN = 5
        const top = [...nodes].sort((a, b) => b.metrics.cpuPercent - a.metrics.cpuPercent).slice(0, topN)
        return {
          type: "agents",
          agents: top,
          query,
          answer: `Top ${topN} agents by CPU usage`,
        }
      }
      
      case "top_memory": {
        const topN = 5
        const top = [...nodes].sort((a, b) => b.metrics.memoryMb - a.metrics.memoryMb).slice(0, topN)
        return {
          type: "agents",
          agents: top,
          query,
          answer: `Top ${topN} agents by memory usage`,
        }
      }
      
      case "most_active": {
        const topN = 5
        const top = [...nodes]
          .filter(n => n.status === "active" || n.status === "busy")
          .sort((a, b) => b.metrics.messagesPerSecond - a.metrics.messagesPerSecond)
          .slice(0, topN)
        return {
          type: "agents",
          agents: top,
          query,
          answer: `Top ${topN} most active agents by message throughput`,
        }
      }
      
      case "search_name": {
        const searchTerm = match[1]?.toLowerCase()
        const found = nodes.filter(n => 
          n.name.toLowerCase().includes(searchTerm) || 
          n.shortName.toLowerCase().includes(searchTerm) ||
          n.id.toLowerCase().includes(searchTerm)
        )
        return {
          type: "agents",
          agents: found,
          query,
          answer: found.length > 0 
            ? `Found ${found.length} agents matching "${searchTerm}"`
            : `No agents found matching "${searchTerm}"`,
        }
      }
    }
  }
  
  // Fallback: Try simple text search
  const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 2)
  const found = nodes.filter(n => 
    searchTerms.some(term => 
      n.name.toLowerCase().includes(term) || 
      n.shortName.toLowerCase().includes(term) ||
      n.category.includes(term) ||
      n.type.includes(term)
    )
  )
  
  if (found.length > 0) {
    return {
      type: "agents",
      agents: found,
      query,
      answer: `Found ${found.length} matching agents`,
    }
  }
  
  return {
    type: "answer",
    query,
    answer: "I couldn't understand that query. Try one of the example queries below.",
  }
}

export function AgentQuery({
  nodes,
  connections,
  onNodeSelect,
  onHighlightNodes,
  className = "",
}: AgentQueryProps) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const handleSubmit = useCallback(() => {
    if (!query.trim()) return
    
    setIsLoading(true)
    // Simulate AI processing delay
    setTimeout(() => {
      const queryResult = executeQuery(query, nodes, connections)
      setResult(queryResult)
      setIsLoading(false)
      setIsExpanded(true)
      
      // Highlight matching nodes
      if (queryResult.agents) {
        onHighlightNodes(queryResult.agents.map(a => a.id))
      }
    }, 300)
  }, [query, nodes, connections, onHighlightNodes])
  
  const handleExampleClick = (example: string) => {
    setQuery(example)
    setShowExamples(false)
    inputRef.current?.focus()
  }
  
  const handleClear = () => {
    setQuery("")
    setResult(null)
    onHighlightNodes([])
  }
  
  // Don't render if hidden
  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="absolute top-20 left-4 z-20 bg-black/80 border-white/10 text-white hover:bg-black/90"
        onClick={() => setIsVisible(true)}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Ask MYCA
      </Button>
    )
  }
  
  return (
    <div className={`absolute top-20 left-4 z-20 max-h-[50vh] ${className}`}>
      <Card className="w-80 bg-black/80 backdrop-blur-md border-white/10 text-white max-h-[50vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Ask MYCA
              <Badge variant="outline" className="text-[10px]">AI</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-red-400"
              onClick={() => {
                setIsVisible(false)
                onHighlightNodes([])
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 overflow-y-auto flex-1">
          {/* Query input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="Ask about agents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              onFocus={() => setShowExamples(true)}
              className="pl-8 pr-16 h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              {query && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button 
                size="icon" 
                className="h-7 w-7 bg-cyan-600 hover:bg-cyan-700" 
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Example queries */}
          {showExamples && !result && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <HelpCircle className="h-3 w-3" />
                Try asking:
              </div>
              <div className="flex flex-wrap gap-1">
                {EXAMPLE_QUERIES.slice(0, 4).map((ex) => (
                  <Button
                    key={ex}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6 px-2 border-white/10 text-gray-300 hover:text-white"
                    onClick={() => handleExampleClick(ex)}
                  >
                    {ex}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Results */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{result.answer}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
              
              {isExpanded && (
                <>
                  {/* Agent results */}
                  {result.type === "agents" && result.agents && (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {result.agents.slice(0, 10).map((agent) => (
                          <button
                            key={agent.id}
                            className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                            onClick={() => onNodeSelect(agent.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: STATUS_COLORS[agent.status] }}
                              />
                              <span className="text-sm font-medium flex-1 truncate">{agent.shortName}</span>
                              <Badge 
                                variant="outline" 
                                className="text-[9px]"
                                style={{ borderColor: CATEGORY_COLORS[agent.category], color: CATEGORY_COLORS[agent.category] }}
                              >
                                {agent.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1">
                                <Cpu className="h-2.5 w-2.5" />
                                {agent.metrics.cpuPercent.toFixed(0)}%
                              </span>
                              <span className="flex items-center gap-1">
                                <MemoryStick className="h-2.5 w-2.5" />
                                {agent.metrics.memoryMb}MB
                              </span>
                              <span className="flex items-center gap-1">
                                <Activity className="h-2.5 w-2.5" />
                                {agent.metrics.messagesPerSecond.toFixed(0)}/s
                              </span>
                            </div>
                          </button>
                        ))}
                        {result.agents.length > 10 && (
                          <div className="text-xs text-gray-400 text-center py-2">
                            +{result.agents.length - 10} more agents
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                  
                  {/* Stats results */}
                  {result.type === "stats" && result.stats && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.stats).map(([key, value]) => (
                        <div key={key} className="p-2 rounded-lg bg-white/5">
                          <div className="text-[10px] text-gray-400">{key}</div>
                          <div className="text-sm font-bold">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AgentQuery
