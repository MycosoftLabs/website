"use client"

import { useId, useMemo, useState, type KeyboardEvent } from "react"
import * as d3 from "d3"
import {
  Activity,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  CircleOff,
  Database,
  Eye,
  EyeOff,
  GitBranch,
  Globe2,
  MemoryStick,
  Network,
  RadioTower,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useOptionalMYCA, type MYCAContextValue, type MYCAMessage } from "@/contexts/myca-context"

export type MYCAChordInteractionKind =
  | "route"
  | "consciousness"
  | "memory"
  | "tool"
  | "agent"
  | "world"
  | "device"
  | "service"
  | "guardrail"
  | "response"

export type MYCAChordInteractionStatus = "idle" | "active" | "busy" | "complete" | "error"

export interface MYCAChordInteraction {
  id: string
  source: string
  target: string
  value: number
  kind: MYCAChordInteractionKind
  status?: MYCAChordInteractionStatus
  detail: string
  latencyMs?: number
}

interface MYCALiveActivityChordDiagramProps {
  interactions?: MYCAChordInteraction[]
  className?: string
  height?: number
  live?: boolean
}

type NodeMeta = {
  label: string
  role: string
  color: string
  icon: typeof User
}

const NODE_ORDER = [
  "User",
  "MYCA Router",
  "Consciousness",
  "Memory",
  "Grounding",
  "Tool Router",
  "Agents",
  "Services",
  "Devices",
  "World Model",
  "Guardrails",
  "Response",
]

const NODE_META: Record<string, NodeMeta> = {
  User: {
    label: "User",
    role: "single stream",
    color: "#e5edf6",
    icon: User,
  },
  "MYCA Router": {
    label: "MYCA Router",
    role: "intent and routing",
    color: "#5eead4",
    icon: GitBranch,
  },
  Consciousness: {
    label: "Consciousness",
    role: "state and reasoning",
    color: "#86efac",
    icon: BrainCircuit,
  },
  Memory: {
    label: "Memory",
    role: "session context",
    color: "#a7f3d0",
    icon: MemoryStick,
  },
  Grounding: {
    label: "Grounding",
    role: "reality checks",
    color: "#7dd3fc",
    icon: Search,
  },
  "Tool Router": {
    label: "Tool Router",
    role: "tool selection",
    color: "#fbbf24",
    icon: Wrench,
  },
  Agents: {
    label: "Agents",
    role: "specialist work",
    color: "#c4b5fd",
    icon: Network,
  },
  Services: {
    label: "Services",
    role: "live APIs",
    color: "#67e8f9",
    icon: RadioTower,
  },
  Devices: {
    label: "Devices",
    role: "field telemetry",
    color: "#fb7185",
    icon: Activity,
  },
  "World Model": {
    label: "World Model",
    role: "environment state",
    color: "#38bdf8",
    icon: Globe2,
  },
  Guardrails: {
    label: "Guardrails",
    role: "policy checks",
    color: "#fda4af",
    icon: ShieldCheck,
  },
  Response: {
    label: "Response",
    role: "answer synthesis",
    color: "#ffffff",
    icon: Sparkles,
  },
}

const KIND_LABELS: Record<MYCAChordInteractionKind, string> = {
  route: "Routing",
  consciousness: "Consciousness",
  memory: "Memory",
  tool: "Tool",
  agent: "Agent",
  world: "World",
  device: "Device",
  service: "Service",
  guardrail: "Guardrail",
  response: "Response",
}

const KIND_COLORS: Record<MYCAChordInteractionKind, string> = {
  route: "#5eead4",
  consciousness: "#86efac",
  memory: "#a7f3d0",
  tool: "#fbbf24",
  agent: "#c4b5fd",
  world: "#38bdf8",
  device: "#fb7185",
  service: "#67e8f9",
  guardrail: "#fda4af",
  response: "#ffffff",
}

function polarPoint(angle: number, radius: number, center: number) {
  const adjusted = angle - Math.PI / 2
  return {
    x: center + Math.cos(adjusted) * radius,
    y: center + Math.sin(adjusted) * radius,
  }
}

function nodeSortValue(name: string) {
  const index = NODE_ORDER.indexOf(name)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function describeStatus(status?: MYCAChordInteractionStatus) {
  if (!status) return "idle"
  return status
}

function formatTime(timestamp?: string) {
  const date = timestamp ? new Date(timestamp) : new Date()
  if (Number.isNaN(date.getTime())) return "live"
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
}

function metadataNumber(message: MYCAMessage, keys: string[]) {
  for (const key of keys) {
    const value = message.metadata?.[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }
  return undefined
}

function labelAgent(raw?: string) {
  if (!raw || raw === "myca-local-fallback") return "MYCA"
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function addInteraction(
  list: MYCAChordInteraction[],
  interaction: Omit<MYCAChordInteraction, "value"> & { value?: number }
) {
  list.push({
    ...interaction,
    value: Math.max(1, Math.floor(interaction.value ?? 1)),
  })
}

function buildInteractionsFromMYCA(myca: MYCAContextValue | null): MYCAChordInteraction[] {
  if (!myca) return []

  const interactions: MYCAChordInteraction[] = []
  const visibleMessages = myca.messages.filter((message) => message.role !== "system")
  const latestUserId = [...visibleMessages].reverse().find((message) => message.role === "user")?.id
  const latestAssistantId = [...visibleMessages].reverse().find((message) => message.role === "assistant")?.id

  if (myca.draftActivity.length > 0) {
    addInteraction(interactions, {
      id: `draft-${myca.draftActivity.version}`,
      source: "User",
      target: "MYCA Router",
      kind: "route",
      status: "active",
      detail: `Draft input is active with ${myca.draftActivity.length} characters typed.`,
    })
  }

  visibleMessages.forEach((message, index) => {
    const timestamp = formatTime(message.timestamp)
    const latencyMs = metadataNumber(message, ["latency_ms", "latencyMs", "duration_ms", "durationMs"])

    if (message.role === "user") {
      addInteraction(interactions, {
        id: `${message.id}-input-router`,
        source: "User",
        target: "MYCA Router",
        kind: "route",
        status: myca.isLoading && message.id === latestUserId ? "active" : "complete",
        detail: `User input event accepted at ${timestamp}; ${message.content.length} characters were routed.`,
      })

      if (myca.userId && myca.memoryEnabled) {
        addInteraction(interactions, {
          id: `${message.id}-router-memory`,
          source: "MYCA Router",
          target: "Memory",
          kind: "memory",
          status: "complete",
          detail: `Authenticated memory write was eligible for this user input at ${timestamp}.`,
        })
      }
      return
    }

    if (message.role !== "assistant") return

    const routedTo = String(message.metadata?.routed_to || myca.lastResponseMetadata?.routed_to || message.agent || "MYCA")
    const agentLabel = labelAgent(message.agent || routedTo)
    const activeResponse = myca.isLoading && message.id === latestAssistantId

    addInteraction(interactions, {
      id: `${message.id}-router-agent`,
      source: "MYCA Router",
      target: "Agents",
      kind: "agent",
      status: activeResponse ? "active" : "complete",
      detail: `Response event was routed through ${agentLabel} at ${timestamp}.`,
      latencyMs,
    })

    if (Array.isArray(message.nlqSources) && message.nlqSources.length > 0) {
      addInteraction(interactions, {
        id: `${message.id}-router-tool`,
        source: "MYCA Router",
        target: "Tool Router",
        kind: "tool",
        status: "complete",
        detail: `${message.nlqSources.length} live source${message.nlqSources.length === 1 ? "" : "s"} were attached to this response.`,
        latencyMs,
      })
      message.nlqSources.forEach((source, sourceIndex) => {
        addInteraction(interactions, {
          id: `${message.id}-service-${sourceIndex}`,
          source: "Tool Router",
          target: "Services",
          kind: "service",
          status: "complete",
          detail: `Service source returned: ${source.name || source.type || "unnamed source"}.`,
        })
      })
    }

    if (Array.isArray(message.nlqActions) && message.nlqActions.length > 0) {
      addInteraction(interactions, {
        id: `${message.id}-tool-response`,
        source: "Tool Router",
        target: "Response",
        kind: "tool",
        status: "complete",
        detail: `${message.nlqActions.length} action${message.nlqActions.length === 1 ? "" : "s"} were prepared for the response.`,
      })
    }

    if (Array.isArray(message.nlqData) && message.nlqData.length > 0) {
      addInteraction(interactions, {
        id: `${message.id}-world-response`,
        source: "World Model",
        target: "Response",
        kind: "world",
        status: "complete",
        detail: `${message.nlqData.length} structured data block${message.nlqData.length === 1 ? "" : "s"} were merged into the response.`,
      })
    }

    if (message.requires_confirmation) {
      addInteraction(interactions, {
        id: `${message.id}-response-guardrails`,
        source: "Response",
        target: "Guardrails",
        kind: "guardrail",
        status: "active",
        detail: "This response requires confirmation before continuing.",
      })
    }

    addInteraction(interactions, {
      id: `${message.id}-agent-response`,
      source: "Agents",
      target: "Response",
      kind: "agent",
      status: activeResponse ? "active" : "complete",
      detail: `${agentLabel} produced a response event at ${timestamp}; ${message.content.length} characters were composed.`,
      latencyMs,
    })

    addInteraction(interactions, {
      id: `${message.id}-response-user`,
      source: "Response",
      target: "User",
      kind: "response",
      status: activeResponse ? "active" : "complete",
      detail: `MYCA response was delivered at ${timestamp}.`,
      latencyMs,
    })
  })

  if (myca.isLoading) {
    addInteraction(interactions, {
      id: `loading-${visibleMessages.length}`,
      source: "MYCA Router",
      target: "Consciousness",
      kind: "consciousness",
      status: "busy",
      detail: "A MYCA request is currently in flight.",
    })
  }

  if (myca.consciousness?.is_conscious) {
    addInteraction(interactions, {
      id: `consciousness-${myca.consciousness.world_updates ?? visibleMessages.length}`,
      source: "Consciousness",
      target: "MYCA Router",
      kind: "consciousness",
      status: "active",
      detail: `Consciousness status is active${typeof myca.consciousness.world_updates === "number" ? ` with ${myca.consciousness.world_updates} world updates` : ""}.`,
    })
  }

  if (myca.grounding?.is_grounded) {
    addInteraction(interactions, {
      id: `grounding-${myca.grounding.ep_id || myca.grounding.thought_count}`,
      source: "Grounding",
      target: "World Model",
      kind: "world",
      status: "active",
      detail: `Grounding is active${myca.grounding.ep_id ? ` on ${myca.grounding.ep_id}` : ""}; ${myca.grounding.thought_count} thoughts are available.`,
    })
  }

  if (myca.pendingConfirmationId) {
    addInteraction(interactions, {
      id: `pending-confirmation-${myca.pendingConfirmationId}`,
      source: "Guardrails",
      target: "User",
      kind: "guardrail",
      status: "active",
      detail: "MYCA is waiting for a user confirmation event.",
    })
  }

  return interactions.slice(-80)
}

export function MYCALiveActivityChordDiagram({
  interactions,
  className,
  height = 720,
  live = true,
}: MYCALiveActivityChordDiagramProps) {
  const rawId = useId()
  const instanceId = rawId.replace(/[^a-zA-Z0-9_-]/g, "")
  const myca = useOptionalMYCA()
  const liveInteractions = useMemo(
    () => interactions ?? buildInteractionsFromMYCA(myca),
    [interactions, myca]
  )
  const [selectedNode, setSelectedNode] = useState<string | null>("MYCA Router")
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [detailsOpen, setDetailsOpen] = useState(true)

  const model = useMemo(() => {
    const visibleInteractions = liveInteractions.filter(
      (interaction) =>
        !collapsedNodes.has(interaction.source) && !collapsedNodes.has(interaction.target)
    )
    const nodeNames = Array.from(
      new Set(visibleInteractions.flatMap((interaction) => [interaction.source, interaction.target]))
    ).sort((a, b) => nodeSortValue(a) - nodeSortValue(b) || a.localeCompare(b))

    const indexByName = new Map(nodeNames.map((name, index) => [name, index]))
    const matrix = nodeNames.map(() => nodeNames.map(() => 0))

    visibleInteractions.forEach((interaction) => {
      const sourceIndex = indexByName.get(interaction.source)
      const targetIndex = indexByName.get(interaction.target)
      if (sourceIndex === undefined || targetIndex === undefined) return
      matrix[sourceIndex][targetIndex] += interaction.value
    })

    const chordLayout = d3
      .chord()
      .padAngle(0.045)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending)

    const chords = chordLayout(matrix)
    const groupByName = new Map<string, d3.ChordGroup>()
    chords.groups.forEach((group) => {
      const name = nodeNames[group.index]
      if (name) groupByName.set(name, group)
    })

    const totalValue = visibleInteractions.reduce((sum, interaction) => sum + interaction.value, 0)
    const byNode = nodeNames.map((name) => {
      const inbound = visibleInteractions
        .filter((interaction) => interaction.target === name)
        .reduce((sum, interaction) => sum + interaction.value, 0)
      const outbound = visibleInteractions
        .filter((interaction) => interaction.source === name)
        .reduce((sum, interaction) => sum + interaction.value, 0)
      return {
        name,
        inbound,
        outbound,
        total: inbound + outbound,
        count: visibleInteractions.filter(
          (interaction) => interaction.source === name || interaction.target === name
        ).length,
      }
    })

    return {
      visibleInteractions,
      nodeNames,
      chords,
      groupByName,
      byNode,
      totalValue,
    }
  }, [collapsedNodes, liveInteractions])

  const chart = useMemo(() => {
    const center = 340
    const outerRadius = 268
    const innerRadius = 238
    const labelRadius = 304
    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(10)
    const ribbon = d3
      .ribbon()
      .radius(innerRadius - 3)
      .padAngle(0.012) as unknown as (chord: d3.Chord) => string | null

    const packets = model.visibleInteractions
      .map((interaction, index) => {
        const sourceGroup = model.groupByName.get(interaction.source)
        const targetGroup = model.groupByName.get(interaction.target)
        if (!sourceGroup || !targetGroup) return null
        const sourceAngle = (sourceGroup.startAngle + sourceGroup.endAngle) / 2
        const targetAngle = (targetGroup.startAngle + targetGroup.endAngle) / 2
        const source = polarPoint(sourceAngle, innerRadius - 24, center)
        const target = polarPoint(targetAngle, innerRadius - 24, center)
        const middle = polarPoint((sourceAngle + targetAngle) / 2, 64 + (index % 3) * 18, center)
        return {
          ...interaction,
          color: KIND_COLORS[interaction.kind],
          path: `M ${source.x.toFixed(2)} ${source.y.toFixed(2)} Q ${middle.x.toFixed(2)} ${middle.y.toFixed(2)} ${target.x.toFixed(2)} ${target.y.toFixed(2)}`,
          duration: Math.max(2.6, 7.2 - interaction.value * 0.28),
          delay: index * 0.18,
        }
      })
      .filter(Boolean)

    return {
      center,
      outerRadius,
      innerRadius,
      labelRadius,
      arc,
      ribbon,
      packets,
    }
  }, [model])

  const selected = selectedNode
    ? {
        node: selectedNode,
        meta: NODE_META[selectedNode],
        stat: model.byNode.find((item) => item.name === selectedNode),
        interactions: model.visibleInteractions.filter(
          (interaction) => interaction.source === selectedNode || interaction.target === selectedNode
        ),
      }
    : null

  const handleNodeKeyDown = (event: KeyboardEvent<SVGGElement>, name: string) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    setSelectedNode(name)
  }

  const toggleCollapsed = (name: string) => {
    setCollapsedNodes((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    if (selectedNode === name) setSelectedNode(null)
  }

  const showAllNodes = () => {
    setCollapsedNodes(new Set())
  }

  return (
    <section
      className={cn(
        "myca-chord-shell relative overflow-hidden rounded-[8px] border border-white/20 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)]",
        className
      )}
      style={{ minHeight: height }}
      data-testid="myca-chord-diagram"
    >
      <style>{`
        .myca-chord-shell {
          background:
            radial-gradient(circle at 22% 12%, rgba(94, 234, 212, 0.14), transparent 28%),
            radial-gradient(circle at 78% 78%, rgba(56, 189, 248, 0.12), transparent 30%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.018) 48%, rgba(255, 255, 255, 0.006)),
            rgba(2, 12, 10, 0.82);
          backdrop-filter: blur(18px) saturate(1.16);
          -webkit-backdrop-filter: blur(18px) saturate(1.16);
        }

        .myca-chord-glass {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.018) 48%, rgba(255, 255, 255, 0.006)),
            rgba(255, 255, 255, 0.025);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 16px 38px rgba(0, 0, 0, 0.14);
          backdrop-filter: blur(12px) saturate(1.12);
          -webkit-backdrop-filter: blur(12px) saturate(1.12);
        }

        .myca-chord-button {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.07) 46%, rgba(255, 255, 255, 0.02)),
            rgba(255, 255, 255, 0.035);
          color: #fff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            0 10px 24px rgba(0, 0, 0, 0.16);
          backdrop-filter: blur(14px) saturate(1.12);
          -webkit-backdrop-filter: blur(14px) saturate(1.12);
        }

        .myca-chord-button:hover,
        .myca-chord-button[data-active="true"] {
          border-color: rgba(255, 255, 255, 0.54);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.1) 46%, rgba(255, 255, 255, 0.035)),
            rgba(255, 255, 255, 0.05);
        }

        .myca-chord-button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .myca-chord-node-label {
          paint-order: stroke;
          stroke: rgba(0, 0, 0, 0.58);
          stroke-width: 4px;
          stroke-linejoin: round;
        }

        .myca-chord-group {
          cursor: pointer;
          outline: none;
        }

        .myca-chord-group:focus-visible path {
          stroke: rgba(255, 255, 255, 0.95);
          stroke-width: 3px;
        }

        .myca-chord-packet {
          filter: drop-shadow(0 0 10px currentColor);
        }

        @keyframes mycaChordPulse {
          0%, 100% { opacity: 0.42; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
        }

        .myca-chord-live-dot {
          animation: mycaChordPulse 1.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .myca-chord-packet {
            display: none;
          }
          .myca-chord-live-dot {
            animation: none;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.1),transparent_32%,rgba(255,255,255,0.035)_62%,transparent)] opacity-70 pointer-events-none" />
      <div className="relative z-10 grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-5">
        <div className="myca-chord-glass min-h-[560px] overflow-hidden rounded-[8px] p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200/85">
                <Zap className="h-4 w-4" />
                Live Activity Chord
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
                MYCA interaction flow
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/18 px-3 py-2 text-xs text-white/78 backdrop-blur-md">
              <span className="myca-chord-live-dot h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.86)]" />
              {model.nodeNames.length} nodes
              <span className="h-1 w-1 rounded-full bg-white/36" />
              {model.visibleInteractions.length} interactions
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[720px]">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="-80 -16 840 712"
              role="img"
              aria-label="MYCA live activity chord diagram"
            >
              <defs>
                <radialGradient id={`${instanceId}-core`} cx="50%" cy="50%" r="48%">
                  <stop offset="0%" stopColor="rgba(94, 234, 212, 0.24)" />
                  <stop offset="52%" stopColor="rgba(56, 189, 248, 0.08)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </radialGradient>
                <filter id={`${instanceId}-soft-glow`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle
                cx={chart.center}
                cy={chart.center}
                r={chart.innerRadius - 28}
                fill={`url(#${instanceId}-core)`}
              />
              <circle
                cx={chart.center}
                cy={chart.center}
                r={chart.innerRadius - 38}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="3 8"
              />
              <circle
                cx={chart.center}
                cy={chart.center}
                r={chart.outerRadius + 10}
                fill="none"
                stroke="rgba(255,255,255,0.11)"
              />

              <g data-testid="myca-chord-paths">
                {chart.packets.map((packet) => {
                  const selectedMatch =
                    selectedNode === null || selectedNode === packet.source || selectedNode === packet.target
                  return (
                    <path
                      key={`${packet.id}-path`}
                      d={packet.path}
                      fill="none"
                      stroke={packet.color}
                      strokeLinecap="round"
                      strokeOpacity={selectedMatch ? 0.3 : 0.08}
                      strokeWidth={selectedMatch ? Math.max(1.4, Math.min(3.2, packet.value * 0.7)) : 0.8}
                      strokeDasharray={packet.status === "active" || packet.status === "busy" ? "7 10" : "2 10"}
                    />
                  )
                })}
              </g>

              <g
                opacity="0.78"
                data-testid="myca-chord-ribbons"
                transform={`translate(${chart.center} ${chart.center})`}
              >
                {model.chords.map((chord, index) => {
                  const sourceName = model.nodeNames[chord.source.index]
                  const targetName = model.nodeNames[chord.target.index]
                  const sourceMeta = NODE_META[sourceName]
                  const targetMeta = NODE_META[targetName]
                  const selectedMatch =
                    selectedNode === null || selectedNode === sourceName || selectedNode === targetName
                  const fill = sourceMeta?.color ?? KIND_COLORS.route
                  return (
                    <path
                      key={`${sourceName}-${targetName}-${index}`}
                      d={chart.ribbon(chord) ?? undefined}
                      fill={fill}
                      fillOpacity={selectedMatch ? 0.27 : 0.06}
                      stroke={targetMeta?.color ?? "rgba(255,255,255,0.28)"}
                      strokeOpacity={selectedMatch ? 0.32 : 0.08}
                      strokeWidth={selectedMatch ? 1.25 : 0.6}
                      data-source={sourceName}
                      data-target={targetName}
                    />
                  )
                })}
              </g>

              {live &&
                chart.packets.map((packet, index) => (
                  <circle
                    key={packet.id}
                    r={Math.max(3.5, Math.min(6, packet.value * 0.62))}
                    fill={packet.color}
                    className="myca-chord-packet"
                    style={{ color: packet.color }}
                    opacity={selectedNode && packet.source !== selectedNode && packet.target !== selectedNode ? 0.26 : 0.92}
                    data-kind={packet.kind}
                  >
                    <animateMotion
                      dur={`${packet.duration}s`}
                      begin={`${packet.delay}s`}
                      repeatCount="indefinite"
                      path={packet.path}
                    />
                  </circle>
                ))}

              <g data-testid="myca-chord-nodes">
                {model.chords.groups.map((group) => {
                  const name = model.nodeNames[group.index]
                  const meta = NODE_META[name]
                  const midAngle = (group.startAngle + group.endAngle) / 2
                  const label = polarPoint(midAngle, chart.labelRadius, chart.center)
                  const selectedMatch = selectedNode === name
                  const dim = selectedNode !== null && !selectedMatch

                  return (
                    <g
                      key={name}
                      className="myca-chord-group"
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${name}`}
                      onClick={() => setSelectedNode(name)}
                      onKeyDown={(event) => handleNodeKeyDown(event, name)}
                      data-myca-node={name}
                    >
                      <path
                        transform={`translate(${chart.center} ${chart.center})`}
                        d={chart.arc(group) ?? undefined}
                        fill={meta?.color ?? KIND_COLORS.route}
                        fillOpacity={selectedMatch ? 0.92 : dim ? 0.38 : 0.72}
                        stroke="rgba(255,255,255,0.62)"
                        strokeWidth={selectedMatch ? 2.5 : 1.1}
                        filter={selectedMatch ? `url(#${instanceId}-soft-glow)` : undefined}
                      />
                      <circle
                        cx={polarPoint(midAngle, chart.outerRadius + 2, chart.center).x}
                        cy={polarPoint(midAngle, chart.outerRadius + 2, chart.center).y}
                        r={selectedMatch ? 5 : 3.5}
                        fill={meta?.color ?? KIND_COLORS.route}
                        opacity={dim ? 0.38 : 1}
                      />
                      <text
                        x={label.x}
                        y={label.y}
                        className="myca-chord-node-label select-none text-[13px] font-semibold"
                        fill="#fff"
                        textAnchor={label.x < chart.center ? "end" : "start"}
                        dominantBaseline="middle"
                        opacity={dim ? 0.52 : 0.94}
                      >
                        {meta?.label ?? name}
                      </text>
                    </g>
                  )
                })}
              </g>

              {model.visibleInteractions.length === 0 ? (
                <g transform={`translate(${chart.center} ${chart.center})`} textAnchor="middle">
                  <circle r="112" fill="rgba(0, 18, 14, 0.34)" stroke="rgba(255,255,255,0.14)" />
                  <text y="-10" fill="#fff" className="text-[15px] font-semibold">
                    Awaiting MYCA activity
                  </text>
                  <text y="18" fill="rgba(255,255,255,0.62)" className="text-[11px]">
                    Send a real MYCA message to generate live connections.
                  </text>
                </g>
              ) : null}

              <g transform={`translate(${chart.center} ${chart.center})`} textAnchor="middle">
                <circle r="74" fill="rgba(0, 18, 14, 0.44)" stroke="rgba(255,255,255,0.18)" />
                <text y="-12" fill="#fff" className="text-[15px] font-semibold">
                  {model.totalValue}
                </text>
                <text y="11" fill="rgba(255,255,255,0.68)" className="text-[11px] uppercase tracking-[0.22em]">
                  events
                </text>
              </g>
            </svg>
          </div>
        </div>

        <aside className="flex min-h-[560px] flex-col gap-3">
          <div className="myca-chord-glass rounded-[8px] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Network className="h-4 w-4 text-teal-200" />
                Nodes
              </div>
              <button
                type="button"
                className="myca-chord-button inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium"
                onClick={showAllNodes}
                disabled={collapsedNodes.size === 0}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
            <div className="grid gap-2" data-testid="myca-chord-node-controls">
              {NODE_ORDER.map((name) => {
                const meta = NODE_META[name]
                const stat = model.byNode.find((item) => item.name === name)
                const collapsed = collapsedNodes.has(name)
                const Icon = meta.icon
                return (
                  <div
                    key={name}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2"
                  >
                    <button
                      type="button"
                      className="myca-chord-button grid min-h-[46px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm"
                      data-active={selectedNode === name}
                      data-testid={`myca-chord-node-button-${name}`}
                      onClick={() => setSelectedNode(name)}
                    >
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{meta.label}</span>
                        <span className="block truncate text-xs text-white/58">{meta.role}</span>
                      </span>
                      <span className="rounded-full border border-white/18 bg-black/18 px-2 py-0.5 text-xs text-white/70">
                        {stat?.total ?? 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={collapsed ? `Show ${name}` : `Hide ${name}`}
                      className="myca-chord-button inline-flex min-h-[46px] w-12 items-center justify-center rounded-[8px]"
                      onClick={() => toggleCollapsed(name)}
                      data-testid={`myca-chord-toggle-${name}`}
                    >
                      {collapsed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="myca-chord-glass flex-1 rounded-[8px] p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setDetailsOpen((open) => !open)}
              aria-expanded={detailsOpen}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4 text-cyan-200" />
                Detail
              </span>
              {detailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {detailsOpen ? (
              selected ? (
                <div className="mt-3 space-y-3" data-testid="myca-chord-detail">
                  <div className="rounded-[8px] border border-white/16 bg-black/18 p-3">
                    <div className="flex items-center gap-2">
                      {selected.meta ? (
                        <selected.meta.icon
                          className="h-4 w-4"
                          style={{ color: selected.meta.color }}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{selected.meta?.label ?? selected.node}</div>
                        <div className="truncate text-xs text-white/58">{selected.meta?.role}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-[6px] border border-white/12 bg-white/[0.035] p-2">
                        <div className="text-lg font-semibold">{selected.stat?.outbound ?? 0}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">out</div>
                      </div>
                      <div className="rounded-[6px] border border-white/12 bg-white/[0.035] p-2">
                        <div className="text-lg font-semibold">{selected.stat?.inbound ?? 0}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">in</div>
                      </div>
                      <div className="rounded-[6px] border border-white/12 bg-white/[0.035] p-2">
                        <div className="text-lg font-semibold">{selected.stat?.count ?? 0}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">links</div>
                      </div>
                    </div>
                  </div>

                  {selected.interactions.length > 0 ? (
                    <div className="space-y-2">
                      {selected.interactions.map((interaction) => (
                        <div
                          key={interaction.id}
                          className="rounded-[8px] border border-white/14 bg-black/16 p-3"
                          data-testid="myca-chord-detail-row"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span
                              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-2.5 py-1 text-xs font-medium"
                              style={{ color: KIND_COLORS[interaction.kind] }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: KIND_COLORS[interaction.kind] }}
                              />
                              {KIND_LABELS[interaction.kind]}
                            </span>
                            <span className="text-xs text-white/56">
                              {describeStatus(interaction.status)}
                              {interaction.latencyMs ? ` / ${interaction.latencyMs}ms` : ""}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-white">
                            {interaction.source}
                            {" -> "}
                            {interaction.target}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-white/62">{interaction.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[8px] border border-dashed border-white/16 bg-black/12 p-4 text-sm leading-6 text-white/58">
                      No live events for this node yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-[8px] border border-dashed border-white/18 text-center text-sm text-white/56">
                  <CircleOff className="mb-2 h-5 w-5" />
                  Select a node to inspect activity.
                </div>
              )
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  )
}

export default MYCALiveActivityChordDiagram
