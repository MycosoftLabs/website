"use client"

/**
 * MYCALiveActivityPanel - Real-time visualization of MYCA backend activity
 * Agents and interactions derive from conversation use, not hardcoded lists.
 * Neuromorphic design, no scrolling, Material Design-inspired structure.
 * Created: Feb 17, 2026 | Redesigned: Feb 17, 2026
 */

import { useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  User,
  Route,
  Cog,
  MessageSquare,
  Zap,
  ArrowRight,
  Cpu,
  Database,
  Sparkles,
  Anchor,
} from "lucide-react"
import { useMYCA } from "@/contexts/myca-context"
import { useTopologyWebSocketSimple, type AgentStatus } from "@/hooks/use-topology-websocket-simple"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import { cn } from "@/lib/utils"

interface ActivityNodeProps {
  id: string
  label: string
  icon: React.ReactNode
  isActive: boolean
  isHighlight: boolean
  status?: AgentStatus
  neuromorphic?: boolean
}

function ActivityNode({
  id,
  label,
  icon,
  isActive,
  isHighlight,
  status,
  neuromorphic = true,
}: ActivityNodeProps) {
  const raised = isActive || isHighlight

  return (
    <motion.div
      layout
      initial={{ opacity: 0.6, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
        neuromorphic && raised && "neu-raised-sm",
        neuromorphic && !raised && "border-border/60 bg-muted/30",
        neuromorphic && status === "error" && "border-red-500/40 bg-red-500/10",
        neuromorphic && status === "busy" && "border-blue-500/40 bg-blue-500/10",
        neuromorphic && isHighlight && "border-amber-500/40 bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
        neuromorphic && isActive && !isHighlight && "border-green-500/40 bg-green-500/15 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
        !neuromorphic && (isHighlight ? "border-amber-500/50 bg-amber-500/20" : isActive ? "border-green-500/50 bg-green-500/20" : "border-border bg-muted/50")
      )}
    >
      <span className="shrink-0 text-current opacity-90 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>
      <span className="truncate max-w-[72px]">{label}</span>
    </motion.div>
  )
}

function FlowDot({ visible }: { visible: boolean }) {
  return (
    <div className="relative w-5 h-px bg-border/60 shrink-0 overflow-visible flex items-center justify-center">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** Derive agents used in this conversation from messages + lastResponseMetadata */
function useConversationAgents() {
  const { messages, lastResponseMetadata } = useMYCA()

  return useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; label: string }[] = []

    const add = (raw: string | undefined) => {
      if (!raw || typeof raw !== "string") return
      const id = raw.replace(/[-_\s]/g, "").toLowerCase()
      if (!id || seen.has(id)) return
      seen.add(id)
      let label = raw.replace(/Agent$/, "").replace(/^myca-/, "")
      label = label.charAt(0).toUpperCase() + label.slice(1)
      if (label.length > 12) label = label.slice(0, 12)
      list.push({ id: raw, label })
    }

    add(lastResponseMetadata?.routed_to)
    add(lastResponseMetadata?.agent)
    messages.forEach((m) => add(m.agent))
    return list
  }, [messages, lastResponseMetadata])
}

export function MYCALiveActivityPanel({ className }: { className?: string }) {
  const { isLoading, consciousness, lastResponseMetadata } = useMYCA()
  const { connected, connecting, error, agentStatus } = useTopologyWebSocketSimple()
  const conversationAgents = useConversationAgents()

  const highlightAgent = lastResponseMetadata?.routed_to || lastResponseMetadata?.agent
  const prevHighlightRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (highlightAgent) prevHighlightRef.current = highlightAgent
  }, [highlightAgent])
  const displayHighlight = highlightAgent ?? (lastResponseMetadata ? prevHighlightRef.current : undefined)

  const isAgentHighlighted = (agentId: string): boolean => {
    if (!displayHighlight) return false
    const a = agentId.toLowerCase().replace(/[-_\s]/g, "")
    const b = displayHighlight.toLowerCase().replace(/[-_\s]/g, "")
    return a === b || a.includes(b) || b.includes(a)
  }

  const pipelineSegments = [
    { id: "user", label: "User", icon: <User /> },
    { id: "router", label: "Router", icon: <Route /> },
    { id: "consciousness", label: "Consciousness", icon: <Brain /> },
    { id: "grounding", label: "Ground", icon: <Anchor /> },
    { id: "orchestrator", label: "Orchestrator", icon: <Cog /> },
    { id: "llm", label: "LLM", icon: <Cpu /> },
    { id: "response", label: "Response", icon: <Sparkles /> },
  ]

  const showFlow = isLoading
  const isIdle = !isLoading && !lastResponseMetadata && !consciousness?.is_conscious
  const hasAgents = conversationAgents.length > 0

  return (
    <NeuCard
      className={cn(
        "h-full min-h-[200px] overflow-hidden border border-border/50 bg-card/40 backdrop-blur-md",
        className
      )}
    >
      <NeuCardContent className="p-4 h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            Live Activity
          </h3>
          <div className="flex items-center gap-2">
            {connecting && (
              <NeuBadge variant="outline" className="text-[10px] text-amber-500 animate-pulse">
                Connecting…
              </NeuBadge>
            )}
            {error && !connecting && (
              <NeuBadge variant="outline" className="text-[10px] text-red-500 border-red-500/40">
                Offline
              </NeuBadge>
            )}
            {connected && (
              <span
                className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                title="Topology connected"
              />
            )}
          </div>
        </div>

        {isIdle && !showFlow ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm py-6 gap-4 overflow-hidden">
            <p className="text-center">Send a message to see agents and flow</p>
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-full">
              {pipelineSegments.map((s, i) => (
                <div key={s.id} className="flex items-center gap-0.5">
                  <div className="w-7 h-7 rounded-lg border border-border/50 flex items-center justify-center bg-muted/30">
                    {s.icon}
                  </div>
                  {i < pipelineSegments.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
            {/* Pipeline - single row, no scroll */}
            <div className="shrink-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Pipeline
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {pipelineSegments.map((seg, i) => (
                  <div key={seg.id} className="flex items-center gap-1">
                    <ActivityNode
                      id={seg.id}
                      label={seg.label}
                      icon={seg.icon}
                      isActive={showFlow}
                      isHighlight={showFlow && i < 5}
                      neuromorphic
                    />
                    {i < pipelineSegments.length - 1 && <FlowDot visible={showFlow} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic agents from conversation - no hardcoding */}
            {hasAgents && (
              <div className="shrink-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  Active in conversation
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {conversationAgents.map((agent) => (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ActivityNode
                          id={agent.id}
                          label={agent.label}
                          icon={<MessageSquare />}
                          isActive={showFlow}
                          isHighlight={isAgentHighlighted(agent.id)}
                          status={agentStatus[agent.id]}
                          neuromorphic
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Status footer - compact */}
            <div className="shrink-0 flex items-center gap-3 mt-auto pt-2 border-t border-border/50">
              {lastResponseMetadata && (
                <span className="text-[10px] text-muted-foreground">
                  Routed to:{" "}
                  <span className="text-amber-500 font-medium">
                    {lastResponseMetadata.routed_to || lastResponseMetadata.agent || "—"}
                  </span>
                </span>
              )}
              {consciousness?.is_conscious && (
                <span className="flex items-center gap-1.5 text-[10px] text-green-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Conscious
                </span>
              )}
            </div>
          </div>
        )}
      </NeuCardContent>
    </NeuCard>
  )
}
