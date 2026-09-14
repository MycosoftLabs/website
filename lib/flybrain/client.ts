/**
 * Server-only FlyBrain client for the MAS orchestrator (`/api/flybrain/*` on MAS 188).
 *
 * Import ONLY from route handlers / server code — never from a client component: the MAS base
 * URL is LAN-internal and the browser must go through `/api/fusarium/flybrain/...`.
 *
 * Every helper resolves to `{ ok, status, data, path }` and never throws. A network failure or
 * timeout is `{ ok: false, status: 0, data: { error } }`. Nothing is retried with a fallback
 * value — an unreachable MAS is reported as unreachable.
 */

import {
  FLYBRAIN_MAS_PREFIX,
  type AtlasSummary,
  type AutopilotRequest,
  type BrainState,
  type FlyBrainHealth,
  type ITDXChannelsRequest,
  type ITDXChannelsResponse,
  type SessionConfig,
  type SessionInfo,
  type TickRequest,
  type TickResult,
  type VisionHealth,
} from "./contract"

const MAS_DEFAULT = "http://192.168.0.188:8001"

/** Timeouts (ms). Health-class calls are short; tick/session calls may load the connectome. */
export const FLYBRAIN_TIMEOUTS = {
  health: 6_000,
  atlas: 10_000,
  session: 30_000,
  tick: 30_000,
  state: 6_000,
  delete: 10_000,
  autopilot: 10_000,
  itdx: 30_000,
} as const

export interface FlyBrainResult<T> {
  ok: boolean
  status: number
  data: T | { error: string; [key: string]: unknown } | null
  path: string
}

/** Same resolution as lib/itdx/task8-client.mjs. Never returned to the browser. */
export function masBase(): string {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || MAS_DEFAULT).replace(/\/$/, "")
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.name === "TimeoutError" ? "timeout" : error.message || error.name
  return String(error)
}

async function call<T>(path: string, timeoutMs: number, init?: RequestInit): Promise<FlyBrainResult<T>> {
  const url = masBase() + FLYBRAIN_MAS_PREFIX + path
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      ...init,
      headers: { Accept: "application/json", ...(init?.headers || {}) },
    })
    const text = await response.text()
    let data: FlyBrainResult<T>["data"] = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      data = { error: "flybrain_non_json", raw: text.slice(0, 240) }
    }
    return { ok: response.ok, status: response.status, data, path }
  } catch (error) {
    return { ok: false, status: 0, data: { error: errorMessage(error) }, path }
  }
}

function jsonInit(method: "POST" | "DELETE", body?: unknown): RequestInit {
  return body === undefined
    ? { method }
    : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
}

export function flybrainHealth() {
  return call<FlyBrainHealth>("/health", FLYBRAIN_TIMEOUTS.health)
}

export function flybrainAtlas() {
  return call<AtlasSummary>("/atlas", FLYBRAIN_TIMEOUTS.atlas)
}

export function createSession(cfg: SessionConfig) {
  return call<SessionInfo>("/sessions", FLYBRAIN_TIMEOUTS.session, jsonInit("POST", cfg))
}

export function tickSession(id: string, req: TickRequest) {
  return call<TickResult>(`/sessions/${encodeURIComponent(id)}/tick`, FLYBRAIN_TIMEOUTS.tick, jsonInit("POST", req))
}

export function sessionState(id: string) {
  return call<BrainState>(`/sessions/${encodeURIComponent(id)}/state`, FLYBRAIN_TIMEOUTS.state)
}

export function deleteSession(id: string) {
  return call<SessionInfo>(`/sessions/${encodeURIComponent(id)}`, FLYBRAIN_TIMEOUTS.delete, jsonInit("DELETE"))
}

export function setAutopilot(id: string, enabled: boolean, periodS?: number) {
  const body: AutopilotRequest = periodS === undefined ? { enabled } : { enabled, period_s: periodS }
  return call<SessionInfo>(`/sessions/${encodeURIComponent(id)}/autopilot`, FLYBRAIN_TIMEOUTS.autopilot, jsonInit("POST", body))
}

export function itdxChannels(body: ITDXChannelsRequest) {
  return call<ITDXChannelsResponse>("/itdx/channels", FLYBRAIN_TIMEOUTS.itdx, jsonInit("POST", body))
}

export function visionHealth() {
  return call<VisionHealth>("/vision/health", FLYBRAIN_TIMEOUTS.health)
}
