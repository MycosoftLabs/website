"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
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
  provenance?: {
    source: string
    endpoint?: string
    timestamp?: string
  }
}

interface MYCALiveActivityChordDiagramProps {
  interactions?: MYCAChordInteraction[]
  className?: string
  height?: number
  live?: boolean
}

type MYCALiveActivitySnapshot = {
  timestamp?: string
  session?: Record<string, unknown>
  sources?: Array<{
    key: string
    label: string
    endpoint: string
    ok: boolean
    status: number | "skipped" | "error"
    latencyMs: number
    error?: string
  }>
  systems?: Record<string, any>
}

type MYCAChordSignalKind =
  | "heartbeat"
  | "request"
  | "response"
  | "status"
  | "tool"
  | "agent"
  | "device"
  | "world"
  | "guardrail"

type MYCAChordSignalPacket = {
  id: string
  source: string
  target: string
  kind: MYCAChordInteractionKind
  signalKind: MYCAChordSignalKind
  status?: MYCAChordInteractionStatus
  detail: string
  timestamp: number
  ttlMs: number
  latencyMs?: number
  provenance?: MYCAChordInteraction["provenance"]
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

function spreadLabels<T extends { y: number }>(labels: T[], minY: number, maxY: number, gap: number) {
  const sorted = [...labels].sort((a, b) => a.y - b.y)
  let previous = minY - gap
  sorted.forEach((label) => {
    label.y = Math.max(minY, Math.min(maxY, Math.max(label.y, previous + gap)))
    previous = label.y
  })

  let next = maxY + gap
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const label = sorted[index]
    label.y = Math.max(minY, Math.min(label.y, next - gap))
    next = label.y
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

function visualWeightFromCount(count: unknown, minimum = 1) {
  const value = Number(count)
  if (!Number.isFinite(value) || value <= 0) return minimum
  return minimum
}

function statusFromOk(ok: boolean, active = false): MYCAChordInteractionStatus {
  if (!ok) return "error"
  return active ? "active" : "complete"
}

const SOURCE_SIGNAL_EDGES: Record<
  string,
  {
    source: string
    target: string
    kind: MYCAChordInteractionKind
    signalKind: MYCAChordSignalKind
  }
> = {
  router: {
    source: "MYCA Router",
    target: "Tool Router",
    kind: "route",
    signalKind: "heartbeat",
  },
  connectivity: {
    source: "MYCA Router",
    target: "Services",
    kind: "service",
    signalKind: "heartbeat",
  },
  consciousness: {
    source: "MYCA Router",
    target: "Consciousness",
    kind: "consciousness",
    signalKind: "heartbeat",
  },
  grounding: {
    source: "MYCA Router",
    target: "Grounding",
    kind: "world",
    signalKind: "heartbeat",
  },
  memory: {
    source: "MYCA Router",
    target: "Memory",
    kind: "memory",
    signalKind: "heartbeat",
  },
  agents: {
    source: "MYCA Router",
    target: "Agents",
    kind: "agent",
    signalKind: "heartbeat",
  },
  coordination: {
    source: "Agents",
    target: "Services",
    kind: "agent",
    signalKind: "heartbeat",
  },
  services: {
    source: "Tool Router",
    target: "Services",
    kind: "service",
    signalKind: "heartbeat",
  },
  devices: {
    source: "Services",
    target: "Devices",
    kind: "device",
    signalKind: "device",
  },
  telemetry: {
    source: "Devices",
    target: "World Model",
    kind: "device",
    signalKind: "device",
  },
  world: {
    source: "World Model",
    target: "Response",
    kind: "world",
    signalKind: "world",
  },
  "global-events": {
    source: "World Model",
    target: "Response",
    kind: "world",
    signalKind: "world",
  },
}

function statusFromSource(source: NonNullable<MYCALiveActivitySnapshot["sources"]>[number]) {
  if (source.status === "skipped") return "idle"
  if (!source.ok) return "error"
  if (source.latencyMs > 1800) return "busy"
  return "complete"
}

function buildSignalPacketsFromSnapshot(snapshot: MYCALiveActivitySnapshot): MYCAChordSignalPacket[] {
  const timestamp = Date.parse(snapshot.timestamp || "")
  const observedAt = Number.isFinite(timestamp) ? timestamp : Date.now()

  return (snapshot.sources || [])
    .map((source): MYCAChordSignalPacket | null => {
      const edge = SOURCE_SIGNAL_EDGES[source.key]
      if (!edge) return null
      const status = statusFromSource(source)
      const health = source.status === "skipped" ? "policy skipped" : source.ok ? "ok" : "error"
      return {
        id: `source-${snapshot.timestamp || observedAt}-${source.key}-${source.status}-${source.latencyMs}`,
        ...edge,
        status,
        detail: `${source.label} ${edge.signalKind} ${health} in ${source.latencyMs}ms.`,
        timestamp: observedAt,
        ttlMs: 16000,
        latencyMs: source.latencyMs,
        provenance: {
          source: source.label,
          endpoint: source.endpoint,
          timestamp: snapshot.timestamp,
        },
      } satisfies MYCAChordSignalPacket
    })
    .filter((packet): packet is MYCAChordSignalPacket => Boolean(packet))
}

function signalKindFromInteraction(interaction: MYCAChordInteraction): MYCAChordSignalKind {
  if (interaction.id.startsWith("draft-") || interaction.id.includes("-input-router")) return "request"
  if (interaction.kind === "response") return "response"
  if (interaction.kind === "guardrail") return "guardrail"
  if (interaction.kind === "agent") return "agent"
  if (interaction.kind === "tool" || interaction.kind === "service") return "tool"
  if (interaction.kind === "device") return "device"
  if (interaction.kind === "world") return "world"
  return "status"
}

function timestampFromInteraction(interaction: MYCAChordInteraction) {
  const timestamp = Date.parse(interaction.provenance?.timestamp || "")
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

function buildSignalPacketsFromInteractions(
  interactions: MYCAChordInteraction[],
  origin: "provided" | "myca"
): MYCAChordSignalPacket[] {
  return interactions.map((interaction) => ({
    id: `${origin}-${interaction.id}-${interaction.status || "idle"}`,
    source: interaction.source,
    target: interaction.target,
    kind: interaction.kind,
    signalKind: signalKindFromInteraction(interaction),
    status: interaction.status,
    detail: interaction.detail,
    timestamp: timestampFromInteraction(interaction),
    ttlMs: interaction.id.startsWith("draft-") ? 3600 : 14000,
    latencyMs: interaction.latencyMs,
    provenance: interaction.provenance,
  }))
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function metadataText(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return undefined
}

function summarizeRecord(record: Record<string, unknown> | null, limit = 5) {
  if (!record) return ""
  return Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, limit)
    .map(([key, value]) => {
      const text = metadataText(value)
      return text ? `${key}: ${text}` : key
    })
    .join(", ")
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

function buildInteractionsFromSystems(snapshot: MYCALiveActivitySnapshot | null): MYCAChordInteraction[] {
  const systems = snapshot?.systems
  if (!systems) return []

  const timestamp = snapshot?.timestamp
  const interactions: MYCAChordInteraction[] = []
  const addSystemInteraction = (
    interaction: Omit<MYCAChordInteraction, "value"> & { value?: number },
    sourceName: string,
    endpoint?: string
  ) => {
    addInteraction(interactions, {
      ...interaction,
      provenance: {
        source: sourceName,
        endpoint,
        timestamp,
      },
    })
  }

  const user = systems.user || {}
  if (user.sessionIdProvided) {
    addSystemInteraction(
      {
        id: "system-user-session-router",
        source: "User",
        target: "MYCA Router",
        kind: "route",
        status: "active",
        detail: `Browser MYCA session is initialized${user.userIdProvided ? " with an authenticated user" : " as an anonymous isolated session"}.`,
      },
      "MYCAProvider session",
      "contexts/myca-context.tsx"
    )
  }

  const router = systems.router || {}
  addSystemInteraction(
    {
      id: "system-router-tool-router",
      source: "MYCA Router",
      target: "Tool Router",
      kind: "route",
      status: statusFromOk(Boolean(router.ok), Boolean(router.ok)),
      latencyMs: router.latencyMs,
      detail: router.ok
        ? `${router.service || "MYCA voice orchestrator"} is online${router.identity ? ` as ${router.identity}` : ""}.`
        : `MYCA router is unreachable${router.status ? `: ${router.status}` : ""}.`,
    },
    "MYCA router health",
    router.endpoint
  )

  const consciousness = systems.consciousness || {}
  addSystemInteraction(
    {
      id: "system-router-consciousness",
      source: "MYCA Router",
      target: "Consciousness",
      kind: "consciousness",
      status: statusFromOk(Boolean(consciousness.ok), Boolean(consciousness.isConscious)),
      latencyMs: consciousness.latencyMs,
      detail: consciousness.ok
        ? `Consciousness state is ${consciousness.state || "unknown"}${typeof consciousness.worldUpdates === "number" ? ` with ${consciousness.worldUpdates} world updates` : ""}.`
        : `Consciousness endpoint returned ${consciousness.error || "an unavailable state"}.`,
    },
    "MYCA consciousness status",
    consciousness.endpoint
  )

  const memory = systems.memory || {}
  addSystemInteraction(
    {
      id: "system-router-memory",
      source: "MYCA Router",
      target: "Memory",
      kind: "memory",
      status: memory.persistenceAllowed ? statusFromOk(Boolean(memory.ok)) : "idle",
      value: memory.persistenceAllowed ? visualWeightFromCount(memory.conversations) : 1,
      latencyMs: memory.latencyMs,
      detail: memory.persistenceAllowed
        ? `Memory route checked ${memory.conversations ?? 0} persisted conversation records from ${memory.source || "configured memory store"}.`
        : `Anonymous session memory is disabled by policy; no non-logged-in conversation is persisted.`,
    },
    "MYCA memory policy",
    memory.endpoint
  )

  const grounding = systems.grounding || {}
  addSystemInteraction(
    {
      id: "system-router-grounding",
      source: "MYCA Router",
      target: "Grounding",
      kind: "world",
      status: statusFromOk(Boolean(grounding.ok), Boolean(grounding.enabled)),
      value: grounding.enabled ? visualWeightFromCount(grounding.thoughtCount) : 1,
      latencyMs: grounding.latencyMs,
      detail: grounding.ok
        ? `Grounding is ${grounding.enabled ? "enabled" : "disabled"} with ${grounding.thoughtCount ?? 0} thoughts${grounding.lastEpId ? ` on ${grounding.lastEpId}` : ""}.`
        : `Grounding endpoint returned ${grounding.error || "an unavailable state"}.`,
    },
    "MYCA grounding status",
    grounding.endpoint
  )

  const agents = systems.agents || {}
  addSystemInteraction(
    {
      id: "system-router-agents",
      source: "MYCA Router",
      target: "Agents",
      kind: "agent",
      status: statusFromOk(Boolean(agents.ok), Number(agents.active) > 0),
      value: visualWeightFromCount(agents.total),
      latencyMs: agents.latencyMs,
      detail: `MAS agent registry returned ${agents.total ?? 0} agents, ${agents.active ?? 0} active, ${agents.busy ?? 0} busy, across ${agents.categories ?? 0} categories.`,
    },
    "MAS agent registry",
    agents.endpoint
  )

  if (Number(agents.coordinationMessages) > 0) {
    addSystemInteraction(
      {
        id: "system-agents-services-coordination",
        source: "Agents",
        target: "Services",
        kind: "agent",
        status: "active",
        value: visualWeightFromCount(agents.coordinationMessages),
        detail: `Agent coordination ledger exposed ${agents.coordinationMessages} recent coordination messages.`,
      },
      "Agent coordination ledger",
      agents.coordinationEndpoint
    )
  }

  const services = systems.services || {}
  addSystemInteraction(
    {
      id: "system-tool-router-services",
      source: "Tool Router",
      target: "Services",
      kind: "service",
      status: statusFromOk(Boolean(services.ok), Number(services.online) > 0),
      value: visualWeightFromCount(services.total),
      latencyMs: services.latencyMs,
      detail: `Service status returned ${services.online ?? 0}/${services.total ?? 0} online services${Array.isArray(services.names) && services.names.length ? `: ${services.names.join(", ")}` : ""}.`,
    },
    "Service status",
    services.endpoint
  )

  const devices = systems.devices || {}
  addSystemInteraction(
    {
      id: "system-services-devices",
      source: "Services",
      target: "Devices",
      kind: "device",
      status: statusFromOk(Boolean(devices.registryOk || devices.telemetryOk), Number(devices.online || devices.activeTelemetry) > 0),
      value: visualWeightFromCount(Number(devices.registered || 0) + Number(devices.telemetry || 0)),
      detail: `Device registry returned ${devices.registered ?? 0} devices (${devices.online ?? 0} online); telemetry returned ${devices.telemetry ?? 0} records (${devices.activeTelemetry ?? 0} active).`,
    },
    "Device registry and telemetry",
    `${devices.registryEndpoint || ""}${devices.telemetryEndpoint ? ` + ${devices.telemetryEndpoint}` : ""}`
  )

  const world = systems.worldModel || {}
  addSystemInteraction(
    {
      id: "system-devices-world",
      source: "Devices",
      target: "World Model",
      kind: "world",
      status: statusFromOk(Boolean(world.worldOk || world.globalEventsOk), Number(world.globalEvents) > 0),
      value: visualWeightFromCount(world.globalEvents),
      detail: `World model status is ${world.worldStatus || "unknown"}; global events returned ${world.globalEvents ?? 0} events with ${world.criticalEvents ?? 0} critical or extreme.`,
    },
    "MYCA world model and global events",
    `${world.worldEndpoint || ""}${world.globalEventsEndpoint ? ` + ${world.globalEventsEndpoint}` : ""}`
  )

  if (world.latestEvent) {
    addSystemInteraction(
      {
        id: "system-world-response-latest-event",
        source: "World Model",
        target: "Response",
        kind: "world",
        status: "complete",
        detail: `Latest world event: ${world.latestEvent.title} (${world.latestEvent.severity || "unknown"} from ${world.latestEvent.source || "unknown source"}).`,
      },
      "Global event stream",
      world.globalEventsEndpoint
    )
  }

  const guardrails = systems.guardrails || {}
  addSystemInteraction(
    {
      id: "system-router-guardrails",
      source: "MYCA Router",
      target: "Guardrails",
      kind: "guardrail",
      status: "idle",
      detail: `Guardrail outcomes are wired from orchestrator response actions; they activate when a real response returns AVANI verdicts, risk tiers, denials, or confirmation requirements.`,
    },
    guardrails.source || "orchestrator_response_actions",
    guardrails.endpoint
  )

  return interactions
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
    const metadata = asRecord(message.metadata)
    const provider = metadataText(metadata?.provider)
    const fallbackReason = metadataText(metadata?.fallback_reason)
    const providerTimings = asRecord(metadata?.provider_timings)
    const providerTimingSummary = summarizeRecord(providerTimings)
    const actions = asRecord(metadata?.actions)
    const memorySaved = actions?.memory_saved === true || actions?.memory === "saved"
    const guardrailSummary = summarizeRecord(
      actions
        ? Object.fromEntries(
            Object.entries(actions).filter(([key]) =>
              /avani|risk|guard|policy|deny|denied|confirm|safety/i.test(key)
            )
          )
        : null
    )

    addInteraction(interactions, {
      id: `${message.id}-router-agent`,
      source: "MYCA Router",
      target: "Agents",
      kind: "agent",
      status: activeResponse ? "active" : "complete",
      detail: `Response event was routed through ${agentLabel} at ${timestamp}.`,
      latencyMs,
    })

    if (provider || providerTimingSummary || fallbackReason) {
      addInteraction(interactions, {
        id: `${message.id}-orchestrator-provider`,
        source: "MYCA Router",
        target: "Tool Router",
        kind: "tool",
        status: fallbackReason ? "busy" : "complete",
        detail: [
          provider ? `Provider path: ${provider}.` : "",
          providerTimingSummary ? `Provider timings: ${providerTimingSummary}.` : "",
          fallbackReason ? `Fallback reason: ${fallbackReason}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        latencyMs,
      })
    }

    if (memorySaved) {
      addInteraction(interactions, {
        id: `${message.id}-orchestrator-memory`,
        source: "MYCA Router",
        target: "Memory",
        kind: "memory",
        status: "complete",
        detail: "The orchestrator response reported a successful authenticated memory write.",
        latencyMs,
      })
    }

    if (guardrailSummary || message.requires_confirmation) {
      addInteraction(interactions, {
        id: `${message.id}-orchestrator-guardrails`,
        source: "MYCA Router",
        target: "Guardrails",
        kind: "guardrail",
        status: message.requires_confirmation ? "active" : "complete",
        detail: guardrailSummary
          ? `Orchestrator guardrail metadata: ${guardrailSummary}.`
          : "The orchestrator marked this response for confirmation handling.",
        latencyMs,
      })
    }

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
  const snapshotRequestVersion = useRef(0)
  const [systemSnapshot, setSystemSnapshot] = useState<MYCALiveActivitySnapshot | null>(null)
  const [systemSnapshotError, setSystemSnapshotError] = useState<string | null>(null)
  const systemInteractions = useMemo(
    () => (interactions ? [] : buildInteractionsFromSystems(systemSnapshot)),
    [interactions, systemSnapshot]
  )
  const mycaInteractions = useMemo(() => buildInteractionsFromMYCA(myca), [myca])
  const liveInteractions = useMemo(
    () => interactions ?? [...systemInteractions, ...mycaInteractions],
    [interactions, systemInteractions, mycaInteractions]
  )
  const [selectedNode, setSelectedNode] = useState<string | null>("MYCA Router")
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [signalPackets, setSignalPackets] = useState<MYCAChordSignalPacket[]>([])
  const signalPacketKeys = useRef<Set<string>>(new Set())

  const addSignalPackets = useCallback((packets: MYCAChordSignalPacket[]) => {
    if (packets.length === 0) return
    setSignalPackets((current) => {
      const next = [...current]
      let changed = false
      packets.forEach((packet) => {
        if (signalPacketKeys.current.has(packet.id)) return
        signalPacketKeys.current.add(packet.id)
        next.push(packet)
        changed = true
      })
      if (!changed) return current

      const cutoff = Date.now() - 60000
      const trimmed = next.filter((packet) => packet.timestamp >= cutoff).slice(-120)
      if (signalPacketKeys.current.size > 360) {
        signalPacketKeys.current = new Set(trimmed.map((packet) => packet.id))
      }
      return trimmed
    })
  }, [])

  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(ticker)
  }, [])

  useEffect(() => {
    const packetSource = interactions ? interactions : mycaInteractions
    addSignalPackets(buildSignalPacketsFromInteractions(packetSource, interactions ? "provided" : "myca"))
  }, [addSignalPackets, interactions, mycaInteractions])

  useEffect(() => {
    if (interactions || !systemSnapshot) return
    addSignalPackets(buildSignalPacketsFromSnapshot(systemSnapshot))
  }, [addSignalPackets, interactions, systemSnapshot])

  useEffect(() => {
    if (interactions) return

    let cancelled = false
    let nextRefresh: number | undefined
    let activeController: AbortController | undefined

    const loadSnapshot = async () => {
      const requestVersion = snapshotRequestVersion.current + 1
      snapshotRequestVersion.current = requestVersion
      const params = new URLSearchParams()
      if (myca?.sessionId) params.set("session_id", myca.sessionId)
      if (myca?.userId) params.set("user_id", myca.userId)
      if (myca?.conversationId) params.set("conversation_id", myca.conversationId)

      const controller = new AbortController()
      activeController = controller
      const timeout = window.setTimeout(() => controller.abort(), 20000)

      try {
        const query = params.toString()
        const response = await fetch(`/api/myca/live-activity${query ? `?${query}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const data = await response.json().catch(() => null)
        if (cancelled || requestVersion !== snapshotRequestVersion.current) return
        if (!response.ok || !data) {
          setSystemSnapshotError(data?.error || `Live system audit returned HTTP ${response.status}`)
          return
        }
        setSystemSnapshot(data)
        addSignalPackets(buildSignalPacketsFromSnapshot(data))
        setSystemSnapshotError(null)
      } catch (error) {
        if (!cancelled && requestVersion === snapshotRequestVersion.current) {
          setSystemSnapshotError(error instanceof Error ? error.message : String(error))
        }
      } finally {
        window.clearTimeout(timeout)
        if (activeController === controller) activeController = undefined
        if (!cancelled) {
          nextRefresh = window.setTimeout(loadSnapshot, 10000)
        }
      }
    }

    loadSnapshot()

    return () => {
      cancelled = true
      activeController?.abort()
      if (nextRefresh) window.clearTimeout(nextRefresh)
    }
  }, [addSignalPackets, interactions, myca?.conversationId, myca?.sessionId, myca?.userId])

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

    const totalValue = visibleInteractions.length
    const byNode = nodeNames.map((name) => {
      const inbound = visibleInteractions
        .filter((interaction) => interaction.target === name)
        .length
      const outbound = visibleInteractions
        .filter((interaction) => interaction.source === name)
        .length
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

    const pathForEdge = (sourceName: string, targetName: string, index: number) => {
      const sourceGroup = model.groupByName.get(sourceName)
      const targetGroup = model.groupByName.get(targetName)
      if (!sourceGroup || !targetGroup) return null
      const sourceAngle = (sourceGroup.startAngle + sourceGroup.endAngle) / 2
      const targetAngle = (targetGroup.startAngle + targetGroup.endAngle) / 2
      const source = polarPoint(sourceAngle, innerRadius - 24, center)
      const target = polarPoint(targetAngle, innerRadius - 24, center)
      const middle = polarPoint((sourceAngle + targetAngle) / 2, 64 + (index % 3) * 18, center)
      return `M ${source.x.toFixed(2)} ${source.y.toFixed(2)} Q ${middle.x.toFixed(2)} ${middle.y.toFixed(2)} ${target.x.toFixed(2)} ${target.y.toFixed(2)}`
    }

    const edgePaths = model.visibleInteractions
      .map((interaction, index) => {
        const path = pathForEdge(interaction.source, interaction.target, index)
        if (!path) return null
        return {
          ...interaction,
          color: KIND_COLORS[interaction.kind],
          path,
        }
      })
      .filter(Boolean)

    const activeSignalPackets = signalPackets
      .filter((packet) => {
        const age = Math.max(0, now - packet.timestamp)
        return age <= packet.ttlMs
      })
      .map((packet, index) => {
        const path = pathForEdge(packet.source, packet.target, index)
        if (!path) return null
        const latency = Number.isFinite(packet.latencyMs) ? Number(packet.latencyMs) : 240
        return {
          ...packet,
          color: KIND_COLORS[packet.kind],
          path,
          duration: Math.max(1.35, Math.min(4.8, 1.35 + latency / 950)),
          delay: packet.signalKind === "heartbeat" ? Math.max(0, Math.min(2.8, latency / 1400)) : 0,
        }
      })
      .filter(Boolean)
    type SvgTextAnchor = "start" | "end" | "middle" | "inherit"
    const labelRows = model.chords.groups.map((group) => {
      const name = model.nodeNames[group.index]
      const midAngle = (group.startAngle + group.endAngle) / 2
      const label = polarPoint(midAngle, labelRadius, center)
      const side = label.x < center ? "left" : "right"
      const textAnchor: SvgTextAnchor = side === "left" ? "end" : "start"
      return {
        name,
        x: side === "left" ? Math.min(label.x, center - 104) : Math.max(label.x, center + 104),
        y: label.y,
        textAnchor,
      }
    })

    spreadLabels(labelRows.filter((label) => label.textAnchor === "start"), 34, center * 2 - 34, 20)
    spreadLabels(labelRows.filter((label) => label.textAnchor === "end"), 34, center * 2 - 34, 20)
    const labelByName = new Map(labelRows.map((label) => [label.name, label]))

    return {
      center,
      outerRadius,
      innerRadius,
      labelRadius,
      arc,
      ribbon,
      edgePaths,
      signalPackets: activeSignalPackets,
      labelByName,
    }
  }, [model, now, signalPackets])

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
      <div className="relative z-10 grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_360px] lg:p-5">
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
              <span className="h-1 w-1 rounded-full bg-white/36" />
              {chart.signalPackets.length} real signals
              {systemSnapshotError ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/36" />
                  audit degraded
                </>
              ) : null}
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
                {chart.edgePaths.map((packet) => {
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
                chart.signalPackets.map((packet) => (
                  <circle
                    key={packet.id}
                    r={packet.signalKind === "heartbeat" ? 4.2 : 5.2}
                    fill={packet.color}
                    className="myca-chord-packet"
                    style={{ color: packet.color }}
                    opacity={selectedNode && packet.source !== selectedNode && packet.target !== selectedNode ? 0.26 : 0.92}
                    data-kind={packet.kind}
                    data-real-signal="true"
                    data-signal-kind={packet.signalKind}
                    data-signal-latency-ms={String(packet.latencyMs ?? "")}
                    data-signal-source={packet.provenance?.source || packet.source}
                    data-signal-endpoint={packet.provenance?.endpoint || ""}
                    data-testid="myca-chord-signal-packet"
                  >
                    <animateMotion
                      dur={`${packet.duration}s`}
                      begin={`${packet.delay}s`}
                      repeatCount="1"
                      fill="freeze"
                      path={packet.path}
                    />
                    <animate
                      attributeName="opacity"
                      dur={`${packet.duration}s`}
                      begin={`${packet.delay}s`}
                      values="0;0.96;0.96;0"
                      keyTimes="0;0.16;0.84;1"
                      fill="freeze"
                    />
                  </circle>
                ))}

              <g data-testid="myca-chord-nodes">
                {model.chords.groups.map((group) => {
                  const name = model.nodeNames[group.index]
                  const meta = NODE_META[name]
                  const midAngle = (group.startAngle + group.endAngle) / 2
                  const label = chart.labelByName.get(name) ?? {
                    ...polarPoint(midAngle, chart.labelRadius, chart.center),
                    textAnchor: "start",
                  }
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
                        className="myca-chord-node-label select-none text-[12px] font-semibold"
                        fill="#fff"
                        textAnchor={label.textAnchor}
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
                  live edges
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
                          {interaction.provenance ? (
                            <div className="mt-2 rounded-[6px] border border-white/10 bg-white/[0.025] px-2 py-1.5 text-[11px] leading-5 text-white/48">
                              {interaction.provenance.source}
                              {interaction.provenance.endpoint ? ` / ${interaction.provenance.endpoint}` : ""}
                            </div>
                          ) : null}
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
