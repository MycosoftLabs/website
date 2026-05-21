import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SourceResult<T = any> = {
  key: string
  label: string
  endpoint: string
  ok: boolean
  status: number | "skipped" | "error"
  latencyMs: number
  data?: T
  error?: string
}

function getOrigin(request: NextRequest) {
  try {
    return new URL(request.url).origin
  } catch {
    return process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3010"
  }
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

async function fetchJson<T extends Record<string, unknown> = Record<string, unknown>>(
  request: NextRequest,
  key: string,
  label: string,
  endpoint: string,
  timeoutMs = 4500
): Promise<SourceResult<T>> {
  const started = Date.now()
  const origin = getOrigin(request)
  try {
    const response = await fetch(`${origin}${endpoint}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const data = (await response.json().catch(() => undefined)) as T | undefined
    return {
      key,
      label,
      endpoint,
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      data,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      key,
      label,
      endpoint,
      ok: false,
      status: "error",
      latencyMs: Date.now() - started,
      error: normalizeError(error),
    }
  }
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function getAgents(data: any): any[] {
  if (Array.isArray(data?.agents)) return data.agents
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getDevices(data: any): any[] {
  if (Array.isArray(data?.devices)) return data.devices
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getTelemetry(data: any): any[] {
  if (Array.isArray(data?.devices)) return data.devices
  if (Array.isArray(data?.telemetry)) return data.telemetry
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getEvents(data: any): any[] {
  if (Array.isArray(data?.events)) return data.events
  if (Array.isArray(data?.data)) return data.data
  return []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id") || ""
  const userId = searchParams.get("user_id") || ""
  const conversationId = searchParams.get("conversation_id") || ""
  const consciousnessQuery = new URLSearchParams()
  if (sessionId) consciousnessQuery.set("session_id", sessionId)
  if (conversationId) consciousnessQuery.set("conversation_id", conversationId)
  if (userId) consciousnessQuery.set("user_id", userId)

  const memorySource: Promise<SourceResult<Record<string, unknown>>> = userId
    ? fetchJson(
        request,
        "memory",
        "MYCA Memory",
        `/api/mas/memory?${new URLSearchParams({
          user_id: userId,
          session_id: sessionId,
          limit: "5",
        }).toString()}`,
        4500
      )
    : Promise.resolve({
        key: "memory",
        label: "MYCA Memory",
        endpoint: "/api/mas/memory",
        ok: true,
        status: "skipped",
        latencyMs: 0,
        data: {
          persistence_allowed: false,
          reason: "anonymous_session_memory_disabled",
        },
      })

  const [
    router,
    connectivity,
    consciousness,
    grounding,
    memory,
    agents,
    coordination,
    services,
    devices,
    telemetry,
    world,
    globalEvents,
  ] = await Promise.all([
    fetchJson(request, "router", "MYCA Router", "/api/mas/voice/orchestrator", 3000),
    fetchJson(request, "connectivity", "MYCA Connectivity", "/api/myca/connectivity", 6500),
    fetchJson(
      request,
      "consciousness",
      "MYCA Consciousness",
      `/api/myca/consciousness/status?${consciousnessQuery.toString()}`,
      6500
    ),
    fetchJson(request, "grounding", "MYCA Grounding", "/api/myca/grounding/status", 5000),
    memorySource,
    fetchJson(request, "agents", "MAS Agents", "/api/mas/agents", 6500),
    fetchJson(request, "coordination", "Agent Coordination", "/api/agent/coordination?limit=60", 3500),
    fetchJson(request, "services", "Service Status", "/api/services/status", 3500),
    fetchJson(request, "devices", "Device Registry", "/api/devices/network?include_offline=true", 3500),
    fetchJson(request, "telemetry", "Device Telemetry", "/api/natureos/devices/telemetry", 3500),
    fetchJson(request, "world", "MYCA World Model", "/api/myca/world", 3500),
    fetchJson(request, "global-events", "Global Events", "/api/natureos/global-events", 3500),
  ])

  const agentRows = getAgents(agents.data)
  const coordinationMessages = countArray(coordination.data?.messages)
  const serviceRows = Array.isArray(services.data?.services) ? services.data.services : []
  const deviceRows = getDevices(devices.data)
  const telemetryRows = getTelemetry(telemetry.data)
  const eventRows = getEvents(globalEvents.data)
  const activeAgents = agentRows.filter((agent) => ["active", "busy"].includes(String(agent.status))).length
  const busyAgents = agentRows.filter((agent) => String(agent.status) === "busy").length
  const onlineDevices = deviceRows.filter((device) => ["online", "active", "connected"].includes(String(device.status))).length
  const activeTelemetry = telemetryRows.filter((item) => ["active", "online", "connected"].includes(String(item.status))).length
  const criticalEvents = eventRows.filter((event) => ["critical", "extreme"].includes(String(event.severity))).length

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    session: {
      sessionIdProvided: Boolean(sessionId),
      userIdProvided: Boolean(userId),
      conversationIdProvided: Boolean(conversationId),
    },
    sources: [
      router,
      connectivity,
      consciousness,
      grounding,
      memory,
      agents,
      coordination,
      services,
      devices,
      telemetry,
      world,
      globalEvents,
    ].map(({ data: _data, ...source }) => source),
    systems: {
      user: {
        sessionIdProvided: Boolean(sessionId),
        userIdProvided: Boolean(userId),
        conversationIdProvided: Boolean(conversationId),
      },
      router: {
        ok: router.ok,
        status: router.data?.status || (router.ok ? "online" : "unreachable"),
        service: router.data?.service,
        identity: router.data?.identity,
        latencyMs: router.latencyMs,
        endpoint: router.endpoint,
      },
      connectivity: {
        ok: connectivity.data?.ok ?? connectivity.ok,
        summary: connectivity.data?.summary,
        chatRoute: connectivity.data?.chat_route,
        llmKeys: connectivity.data?.llm_keys,
        mas: connectivity.data?.mas,
        masConsciousness: connectivity.data?.mas_consciousness,
        endpoint: connectivity.endpoint,
      },
      consciousness: {
        ok: consciousness.ok,
        isConscious: Boolean(consciousness.data?.is_conscious),
        state: consciousness.data?.state || "unknown",
        worldUpdates: consciousness.data?.world_updates,
        error: consciousness.data?.error || consciousness.error,
        latencyMs: consciousness.latencyMs,
        endpoint: consciousness.endpoint,
      },
      memory: {
        ok: memory.ok,
        persistenceAllowed: Boolean(userId),
        source: memory.data?.source,
        conversations: countArray(memory.data?.conversations),
        reason: memory.data?.reason,
        error: memory.data?.error || memory.error,
        latencyMs: memory.latencyMs,
        endpoint: memory.endpoint,
      },
      grounding: {
        ok: grounding.ok,
        enabled: Boolean(grounding.data?.enabled),
        thoughtCount: Number(grounding.data?.thought_count ?? 0),
        lastEpId: grounding.data?.last_ep_id || null,
        error: grounding.data?.error || grounding.error,
        latencyMs: grounding.latencyMs,
        endpoint: grounding.endpoint,
      },
      agents: {
        ok: agents.ok,
        total: agentRows.length || Number(agents.data?.total ?? agents.data?.count ?? 0),
        active: activeAgents,
        busy: busyAgents,
        categories: countArray(agents.data?.categories),
        coordinationMessages,
        latencyMs: agents.latencyMs,
        endpoint: agents.endpoint,
        coordinationEndpoint: coordination.endpoint,
      },
      services: {
        ok: services.ok,
        total: serviceRows.length,
        online: serviceRows.filter((service: any) => service.status === "online").length,
        names: serviceRows.map((service: any) => service.name || service.id).filter(Boolean).slice(0, 8),
        latencyMs: services.latencyMs,
        endpoint: services.endpoint,
      },
      devices: {
        registryOk: devices.ok,
        telemetryOk: telemetry.ok,
        registered: deviceRows.length || Number(devices.data?.count ?? 0),
        online: onlineDevices,
        telemetry: telemetryRows.length,
        activeTelemetry,
        registryEndpoint: devices.endpoint,
        telemetryEndpoint: telemetry.endpoint,
      },
      worldModel: {
        worldOk: world.ok,
        worldStatus: world.data?.status || (world.ok ? "online" : "unavailable"),
        globalEventsOk: globalEvents.ok,
        globalEvents: eventRows.length,
        criticalEvents,
        latestEvent: eventRows[0]
          ? {
              title: eventRows[0].title,
              type: eventRows[0].type,
              severity: eventRows[0].severity,
              timestamp: eventRows[0].timestamp,
              source: eventRows[0].source,
            }
          : null,
        worldEndpoint: world.endpoint,
        globalEventsEndpoint: globalEvents.endpoint,
      },
      guardrails: {
        source: "orchestrator_response_actions",
        endpoint: "/api/mas/voice/orchestrator",
        observedOnResponse: true,
      },
      responses: {
        source: "myca_context_messages",
        endpoint: "/api/mas/voice/orchestrator",
      },
    },
  })
}
