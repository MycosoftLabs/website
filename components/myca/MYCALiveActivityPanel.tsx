"use client"

/**
 * MYCALiveActivityPanel - Real-time 2D visualization of MYCA backend activity
 * Shows: User → Router → Consciousness → Orchestrator → Agent(s) → Response
 * Uses Topology WebSocket, MYCA context (consciousness, lastResponseMetadata), and chat flow.
 * Created: Feb 17, 2026
 */

import { useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, User, Route, Cog, MessageSquare, Zap, Database, Cpu, Sparkles, ArrowRight } from "lucide-react"
import { useMYCA } from "@/contexts/myca-context"
import { useTopologyWebSocketSimple, type AgentStatus } from "@/hooks/use-topology-websocket-simple"
import { cn } from "@/lib/utils"

const KEY_AGENTS = [
  "Orchestrator",
  "CodingAgent",
  "ResearchAgent",
  "MindexAgent",
  "LabAgent",
  "SecurityAgent",
  "Earth2Orchestrator",
  "CEOAgent",
]

const NODE_BASE = "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors"
const NODE_IDLE = "border-border bg-muted/50 text-muted-foreground"
const NODE_ACTIVE = "border-green-500/50 bg-green-500/20 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
const NODE_HIGHLIGHT = "border-amber-500/60 bg-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
const NODE_BUSY = "border-blue-500/40 bg-blue-500/15 text-blue-400"

function statusToNodeVariant(status: AgentStatus | undefined): string {
  if (!status) return NODE_IDLE
  if (status === "active" || status === "healthy") return NODE_ACTIVE
  if (status === "busy") return NODE_BUSY
  if (status === "error" || status === "degraded") return "border-red-500/40 bg-red-500/15 text-red-400"
  return NODE_IDLE
}

interface NodeProps {
  id: string
  label: string
  icon: React.ReactNode
  isActive: boolean
  isHighlight: boolean
  status?: AgentStatus
  compact?: boolean
}

function ActivityNode({ id, label, icon, isActive, isHighlight, status, compact }: NodeProps) {
  const variant = isHighlight ? NODE_HIGHLIGHT : isActive ? NODE_ACTIVE : statusToNodeVariant(status)
  return (
    <motion.div
      layout
      initial={{ opacity: 0.6, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: isActive || isHighlight ? "0 0 12px rgba(34,197,94,0.25)" : "0 0 0 transparent",
      }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex items-center gap-1.5 shrink-0",
        compact ? "px-2 py-1" : "px-2.5 py-1.5",
        NODE_BASE,
        variant
      )}
    >
      <span className="shrink-0 text-current opacity-90">{icon}</span>
      <span className={cn("truncate max-w-[80px]", compact && "max-w-[60px]")}>{label}</span>
    </motion.div>
  )
}

interface FlowConnectorProps {
  visible: boolean
}

function FlowConnector({ visible }: FlowConnectorProps) {
  return (
    <div className="relative w-6 h-px bg-border shrink-0 overflow-visible">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export function MYCALiveActivityPanel({ className }: { className?: string }) {
  const { isLoading, consciousness, lastResponseMetadata } = useMYCA()
  const { connected, connecting, error, agentStatus } = useTopologyWebSocketSimple()
  const highlightAgent = lastResponseMetadata?.routed_to || lastResponseMetadata?.agent
  const prevHighlightRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (highlightAgent) prevHighlightRef.current = highlightAgent
  }, [highlightAgent])

  const displayHighlight = highlightAgent ?? (lastResponseMetadata ? prevHighlightRef.current : undefined)

  function isAgentHighlighted(agentId: string): boolean {
    if (!displayHighlight) return false
    const a = agentId.toLowerCase().replace(/[-_\s]/g, "")
    const b = displayHighlight.toLowerCase().replace(/[-_\s]/g, "")
    return a === b || a.includes(b) || b.includes(a)
  }

  const coreNodes = useMemo(
    () => [
      { id: "user", label: "User", icon: <User className="h-3 w-3" /> },
      { id: "router", label: "Router", icon: <Route className="h-3 w-3" /> },
      { id: "consciousness", label: "Consciousness", icon: <Brain className="h-3 w-3" /> },
      { id: "orchestrator", label: "Orchestrator", icon: <Cog className="h-3 w-3" /> },
    ],
    []
  )

  const agentNodes = useMemo(() => {
    const fromTopology = Object.keys(agentStatus)
    const combined = [...new Set([...KEY_AGENTS, ...fromTopology])].slice(0, 8)
    return combined.map((id) => ({
      id,
      label: id.replace(/Agent$/, ""),
      status: agentStatus[id],
    }))
  }, [agentStatus])

  const showFlow = isLoading
  const isIdle = !isLoading && !lastResponseMetadata && !consciousness?.is_conscious

  const pipelineSegments = useMemo(
    () => [
      { id: "input", label: "Input", icon: <User className="h-3 w-3" /> },
      { id: "router", label: "Router", icon: <Route className="h-3 w-3" /> },
      { id: "consciousness", label: "Consciousness", icon: <Brain className="h-3 w-3" /> },
      { id: "orchestrator", label: "Orchestrator", icon: <Cog className="h-3 w-3" /> },
      { id: "memory", label: "Memory", icon: <Database className="h-3 w-3" /> },
      { id: "llm", label: "LLM", icon: <Cpu className="h-3 w-3" /> },
      { id: "response", label: "Response", icon: <Sparkles className="h-3 w-3" /> },
    ],
    []
  )

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 flex flex-col h-full min-h-[200px]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-green-500" />
          Live Activity
        </h3>
        <div className="flex items-center gap-1.5">
          {connecting && (
            <span className="text-[10px] text-amber-500 animate-pulse">Connecting…</span>
          )}
          {error && !connecting && (
            <span className="text-[10px] text-red-500">Offline</span>
          )}
          {connected && (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Topology connected" />
          )}
        </div>
      </div>

      {isIdle && !showFlow ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm py-8 gap-4">
          <p>No activity — send a message to see the flow</p>
          <div className="flex items-center gap-1 text-muted-foreground/60">
            {pipelineSegments.map((s, i) => (
              <div key={s.id} className="flex items-center gap-0.5">
                <div className="w-6 h-6 rounded border border-border/50 flex items-center justify-center">
                  {s.icon}
                </div>
                {i < pipelineSegments.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-auto space-y-4">
          {/* Pipeline segments - visual flow */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Pipeline
            </div>
            <div className="flex flex-wrap items-center gap-1 min-w-max">
              {pipelineSegments.map((seg, i) => (
                <div key={seg.id} className="flex items-center gap-1">
                  <ActivityNode
                    id={seg.id}
                    label={seg.label}
                    icon={seg.icon}
                    isActive={showFlow}
                    isHighlight={i < 4 && showFlow}
                  />
                  {i < pipelineSegments.length - 1 && (
                    <FlowConnector visible={showFlow} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Core path: User → Router → Consciousness → Orchestrator */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Request Path
            </div>
            <div className="flex items-center gap-1 min-w-max">
              {coreNodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-1">
                  <ActivityNode
                    id={node.id}
                    label={node.label}
                    icon={node.icon}
                    isActive={showFlow && i < 3}
                    isHighlight={false}
                  />
                  {i < coreNodes.length - 1 && (
                    <FlowConnector visible={showFlow} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agent nodes (Palm/Fingers style) */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Agent Pool
            </div>
            <div className="flex flex-wrap gap-1.5">
              {agentNodes.map((agent) => (
                <ActivityNode
                  key={agent.id}
                  id={agent.id}
                  label={agent.label}
                  icon={<MessageSquare className="h-3 w-3" />}
                  isActive={showFlow}
                  isHighlight={isAgentHighlighted(agent.id)}
                  status={agent.status}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Response indicator */}
          {lastResponseMetadata && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-muted-foreground pt-1 border-t border-border/50"
            >
              Last routed to:{" "}
              <span className="text-amber-500 font-medium">
                {lastResponseMetadata.routed_to || lastResponseMetadata.agent || "—"}
              </span>
            </motion.div>
          )}

          {/* Consciousness status indicator */}
          {consciousness?.is_conscious && (
            <div className="flex items-center gap-2 text-[10px] text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              MYCA conscious
            </div>
          )}
        </div>
      )}
    </div>
  )
}
