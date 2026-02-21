export type ActivitySeverity = "info" | "low" | "medium" | "high" | "critical"
export type ActivityStatus = "success" | "warning" | "error" | "info"

export interface NatureOSActivityEvent {
  id: string
  timestamp: string
  action: string
  toolId?: string
  toolName?: string
  severity: ActivitySeverity
  status: ActivityStatus
  message: string
  actor?: {
    id?: string
    name?: string
    type?: "user" | "agent" | "system"
  }
  context?: {
    sessionId?: string
    requestId?: string
    deviceId?: string
    environment?: "local" | "sandbox" | "production"
    source?: string
  }
  metadata?: Record<string, unknown>
}

export interface ActivityLogResult {
  ok: boolean
  endpoint?: string
  error?: string
}

const ACTIVITY_TIMEOUT_MS = 4000

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function buildNatureOSActivityEvent(
  input: Omit<NatureOSActivityEvent, "id" | "timestamp">,
): NatureOSActivityEvent {
  return {
    ...input,
    id: createId(),
    timestamp: new Date().toISOString(),
  }
}

function getActivityEndpoints() {
  const endpoints: string[] = ["/api/natureos/activity/log"]
  const masUrl =
    (typeof window === "undefined" ? process.env.MAS_API_URL : process.env.NEXT_PUBLIC_MAS_API_URL) ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    process.env.MAS_API_URL

  if (masUrl) {
    endpoints.push(`${masUrl.replace(/\/$/, "")}/api/activity/log`)
  }

  return endpoints
}

export async function logNatureOSActivity(
  event: NatureOSActivityEvent,
): Promise<ActivityLogResult> {
  const endpoints = getActivityEndpoints()

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ACTIVITY_TIMEOUT_MS)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        signal: controller.signal,
        keepalive: true,
      })
      clearTimeout(timeoutId)

      if (response.ok) return { ok: true, endpoint }
      const errorText = await response.text().catch(() => "")
      return {
        ok: false,
        endpoint,
        error: errorText || `Activity log failed (${response.status})`,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      const message = error instanceof Error ? error.message : "Unknown error"
      return { ok: false, endpoint, error: message }
    }
  }

  return { ok: false, error: "No activity endpoints configured" }
}
