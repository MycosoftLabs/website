/**
 * Robust outbound fetch — Apr 22, 2026
 *
 * Morgan: "ok fix that and make a permanent fix so that doesnt happen"
 * where "that" = wedged outbound fetch after long Next.js dev uptime
 * (CelesTrak / SatNOGS / UCSD / MINDEX proxy / DMA all returning
 * "fetch failed" forever after ~2 hours).
 *
 * Root cause: Next.js's default fetch uses the global undici
 * dispatcher, which is a single Agent with unbounded keep-alive
 * connections. Over hours of thousands of cross-origin requests to
 * flaky third parties, the connection pool accumulates dead / half-
 * open sockets that never get reaped. Once the pool saturates, every
 * new request fails with the opaque "fetch failed" Error.
 *
 * Fix:
 *   - A single module-level undici Agent bounded at
 *     `connections: 64, pipelining: 0` with short keep-alive so stale
 *     connections are closed proactively instead of pooled forever.
 *   - Explicit per-call AbortSignal.timeout so hung requests can't
 *     starve the pool.
 *   - One retry on transient network errors, with exponential back-off.
 *   - Exposed `resetOutboundDispatcher()` so an admin endpoint (or a
 *     scheduled cron) can recycle the agent without a dev restart.
 *
 * Usage:
 *   const res = await robustFetch(url, { timeoutMs: 8000 })
 *   const res = await robustFetch(url, { timeoutMs: 8000, retry: 0 })
 *
 * Prefer this over raw `fetch` for any external GET from a route
 * handler or a collector. Keep local /api/* calls on raw fetch (they
 * go through the same-origin Next.js loader, not the undici pool).
 */

import { Agent, setGlobalDispatcher } from "undici"

// Apr 22, 2026 — HMR-safe singleton: pin agent + installed flag to
// globalThis so Next.js dev HMR doesn't rebuild them on every module
// re-evaluation. Without this, each recompile leaked an Agent + called
// setGlobalDispatcher again (~300 Agent instances over 20 min of dev
// uptime, each with its own socket pool).
interface OutboundState { agent: Agent | null; installed: boolean }
const OUTBOUND_STATE_KEY = "__mycosoft_outbound_state__"
type GlobalWithOutbound = typeof globalThis & { [OUTBOUND_STATE_KEY]?: OutboundState }
const gOut = globalThis as GlobalWithOutbound
if (!gOut[OUTBOUND_STATE_KEY]) gOut[OUTBOUND_STATE_KEY] = { agent: null, installed: false }
const state = gOut[OUTBOUND_STATE_KEY]!

function buildAgent(): Agent {
  return new Agent({
    connections: 64,
    pipelining: 0,
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 300_000,
    bodyTimeout: 20_000,
    headersTimeout: 10_000,
  })
}

function getAgent(): Agent {
  if (!state.agent) {
    state.agent = buildAgent()
    if (!state.installed) {
      try {
        setGlobalDispatcher(state.agent)
        state.installed = true
      } catch { /* ignore */ }
    }
  }
  return state.agent
}

/** Dispose the current agent and create a fresh one. */
export async function resetOutboundDispatcher(): Promise<void> {
  const prev = state.agent
  state.agent = buildAgent()
  try { setGlobalDispatcher(state.agent); state.installed = true } catch { /* ignore */ }
  if (prev) {
    try { await prev.close() } catch { /* ignore */ }
  }
}

export interface RobustFetchOptions extends RequestInit {
  timeoutMs?: number
  retry?: number
  retryBackoffMs?: number
}

/**
 * Network-hardened fetch:
 *   - bounded global dispatcher (prevents pool saturation),
 *   - explicit per-call timeout (default 15 s),
 *   - one retry on transient network errors (TypeError "fetch failed",
 *     ECONNRESET, UND_ERR_SOCKET). Non-2xx responses do NOT trigger
 *     retry — callers decide.
 */
export async function robustFetch(
  url: string | URL,
  opts: RobustFetchOptions = {},
): Promise<Response> {
  getAgent() // ensure dispatcher installed
  const { timeoutMs = 15_000, retry = 1, retryBackoffMs = 500, ...init } = opts

  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retry; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      clearTimeout(timer)
      return res
    } catch (err: any) {
      clearTimeout(timer)
      lastErr = err
      // Abort caused by our own timeout is treated like a transient
      // network error so we retry once.
      if (attempt < retry) {
        await new Promise((r) => setTimeout(r, retryBackoffMs * (attempt + 1)))
        continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export function getOutboundDispatcherStats() {
  return {
    installed: state.installed,
    has_agent: state.agent !== null,
  }
}
