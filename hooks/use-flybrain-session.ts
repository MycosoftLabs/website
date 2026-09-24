"use client"

/**
 * useFlyBrainSession — browser-side state for one FlyBrain (FlyWire whole-brain LIF) session.
 *
 * Talks ONLY to the same-origin BFF (`/api/fusarium/flybrain/...`); the MAS address never reaches the
 * browser. Health is polled every 10 s, paused while the tab is hidden, and the in-flight request
 * is aborted on unmount. Exactly ONE setState per response so the panel never thrashes React.
 *
 * Honesty: `health`, `session`, `lastTick` are whatever MAS returned or `null`. A 503 "no
 * connectome" is surfaced as `error`, never smoothed into a fake ready state. Website sessions
 * are always `dry_run: true` — there is no actuation switch on this side, by design.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  FLYBRAIN_BFF_BASE,
  type FlyBrainHealth,
  type Observation,
  type PlugName,
  type SessionConfig,
  type SessionInfo,
  type TickRequest,
  type TickResult,
} from "@/lib/flybrain/contract"

export const FLYBRAIN_HEALTH_POLL_MS = 10_000
export const FLYBRAIN_AUTOPILOT_PERIOD_S = 1.0

export interface FlyBrainSessionState {
  health: FlyBrainHealth | null
  /** HTTP status of the newest health probe; 0 = network failure; null = not probed yet. */
  healthStatus: number | null
  session: SessionInfo | null
  lastTick: TickResult | null
  busy: boolean
  error: string
}

export interface FlyBrainSessionApi extends FlyBrainSessionState {
  createSession: (plug: PlugName, opts?: Omit<SessionConfig, "plug" | "dry_run">) => Promise<SessionInfo | null>
  tick: (observations?: Observation[], extra?: Omit<TickRequest, "observations">) => Promise<TickResult | null>
  toggleAutopilot: (periodS?: number) => Promise<SessionInfo | null>
  stop: () => Promise<void>
  refreshHealth: () => Promise<void>
}

type ErrorBody = { error?: string; detail?: unknown; reason?: string }

function describe(status: number, payload: ErrorBody | null, fallback: string) {
  const detail =
    typeof payload?.detail === "string"
      ? payload.detail
      : payload?.detail && typeof payload.detail === "object" && "reason" in (payload.detail as Record<string, unknown>)
        ? String((payload.detail as Record<string, unknown>).reason)
        : null
  const base = payload?.error || detail || fallback
  return status ? `${base} (HTTP ${status})` : base
}

async function bffJson<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | ErrorBody | null }> {
  try {
    const response = await fetch(FLYBRAIN_BFF_BASE + path, { cache: "no-store", ...init })
    const text = await response.text()
    let data: T | ErrorBody | null = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      data = { error: "non_json_response" }
    }
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return { ok: false, status: 0, data: { error: "aborted" } }
    return { ok: false, status: 0, data: { error: error instanceof Error ? error.message : "fetch_failed" } }
  }
}

function postInit(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
}

export function useFlyBrainSession(): FlyBrainSessionApi {
  const [state, setState] = useState<FlyBrainSessionState>({
    health: null,
    healthStatus: null,
    session: null,
    lastTick: null,
    busy: false,
    error: "",
  })
  const sessionRef = useRef<SessionInfo | null>(null)
  sessionRef.current = state.session
  const mountedRef = useRef(true)

  const refreshHealth = useCallback(async (signal?: AbortSignal) => {
    const result = await bffJson<FlyBrainHealth>("/health", { signal })
    if (!mountedRef.current || signal?.aborted) return
    if (result.ok && result.data && "status" in result.data) {
      setState((prev) => ({ ...prev, health: result.data as FlyBrainHealth, healthStatus: result.status }))
    } else {
      setState((prev) => ({ ...prev, health: null, healthStatus: result.status }))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let stop = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const ac = new AbortController()
    const loop = async () => {
      if (stop) return
      if (typeof document === "undefined" || !document.hidden) {
        await refreshHealth(ac.signal)
      }
      if (!stop) timer = setTimeout(loop, FLYBRAIN_HEALTH_POLL_MS)
    }
    void loop()
    return () => {
      stop = true
      mountedRef.current = false
      ac.abort()
      if (timer) clearTimeout(timer)
    }
  }, [refreshHealth])

  const createSession = useCallback(async (plug: PlugName, opts?: Omit<SessionConfig, "plug" | "dry_run">) => {
    setState((prev) => ({ ...prev, busy: true, error: "" }))
    // dry_run is pinned true here: the website never requests actuation.
    const cfg: SessionConfig = { ...(opts || {}), plug, dry_run: true }
    const result = await bffJson<SessionInfo>("/sessions", postInit(cfg))
    if (!mountedRef.current) return null
    if (result.ok && result.data && "session_id" in result.data) {
      const info = result.data as SessionInfo
      setState((prev) => ({ ...prev, session: info, lastTick: null, busy: false, error: "" }))
      return info
    }
    setState((prev) => ({
      ...prev,
      busy: false,
      error: describe(result.status, result.data as ErrorBody | null, "Session not created"),
    }))
    return null
  }, [])

  const tick = useCallback(async (observations?: Observation[], extra?: Omit<TickRequest, "observations">) => {
    const current = sessionRef.current
    if (!current) {
      setState((prev) => ({ ...prev, error: "No session — start one first" }))
      return null
    }
    setState((prev) => ({ ...prev, busy: true, error: "" }))
    const req: TickRequest = { observations: observations || [], act: true, ...(extra || {}) }
    const result = await bffJson<TickResult>(`/sessions/${encodeURIComponent(current.session_id)}/tick`, postInit(req))
    if (!mountedRef.current) return null
    if (result.ok && result.data && "brain" in result.data) {
      const tickResult = result.data as TickResult
      setState((prev) => ({
        ...prev,
        lastTick: tickResult,
        session: prev.session ? { ...prev.session, ticks: tickResult.tick, t_ms: tickResult.t_ms } : prev.session,
        busy: false,
        error: "",
      }))
      return tickResult
    }
    setState((prev) => ({ ...prev, busy: false, error: describe(result.status, result.data as ErrorBody | null, "Tick failed") }))
    return null
  }, [])

  const toggleAutopilot = useCallback(async (periodS?: number) => {
    const current = sessionRef.current
    if (!current) {
      setState((prev) => ({ ...prev, error: "No session — start one first" }))
      return null
    }
    setState((prev) => ({ ...prev, busy: true, error: "" }))
    const body = { enabled: !current.autopilot, period_s: periodS ?? FLYBRAIN_AUTOPILOT_PERIOD_S }
    const result = await bffJson<SessionInfo>(`/sessions/${encodeURIComponent(current.session_id)}/autopilot`, postInit(body))
    if (!mountedRef.current) return null
    if (result.ok && result.data && "session_id" in result.data) {
      const info = result.data as SessionInfo
      setState((prev) => ({ ...prev, session: info, busy: false, error: "" }))
      return info
    }
    setState((prev) => ({ ...prev, busy: false, error: describe(result.status, result.data as ErrorBody | null, "Autopilot change failed") }))
    return null
  }, [])

  const stop = useCallback(async () => {
    const current = sessionRef.current
    if (!current) return
    setState((prev) => ({ ...prev, busy: true, error: "" }))
    const result = await bffJson<SessionInfo>(`/sessions/${encodeURIComponent(current.session_id)}`, { method: "DELETE" })
    if (!mountedRef.current) return
    // A 404 means MAS already forgot the session (restart); either way it is gone on our side.
    if (result.ok || result.status === 404) {
      setState((prev) => ({ ...prev, session: null, lastTick: null, busy: false, error: "" }))
      return
    }
    setState((prev) => ({ ...prev, busy: false, error: describe(result.status, result.data as ErrorBody | null, "Stop failed") }))
  }, [])

  return {
    ...state,
    createSession,
    tick,
    toggleAutopilot,
    stop,
    refreshHealth: () => refreshHealth(),
  }
}
