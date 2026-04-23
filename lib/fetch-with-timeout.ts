/**
 * fetchWithTimeout — shared wrapper around `fetch` with a mandatory deadline.
 * Apr 23, 2026.
 *
 * Audit finding (Apr 23, Morgan): 21+ `fetch()` calls in CREP / MYCA code
 * paths lacked `AbortSignal.timeout()`, so any slow/hung upstream (MAS
 * restart, MINDEX overload, 511ny outage, etc.) froze user-facing widgets
 * with "Loading…" forever. The top offenders were the MYCA confirmAction /
 * memory sync / conversation loader, VideoWallWidget stream resolver,
 * flight-history panel, and Eagle Eye TimelineScrubber.
 *
 * This helper enforces a 10 s default deadline and merges any caller-
 * supplied AbortSignal so consumers can still cancel early on unmount.
 * It preserves the exact Response contract of native fetch — callers use
 * it as a drop-in replacement without any response-shape changes.
 *
 * Usage:
 *   import { fetchWithTimeout } from "@/lib/fetch-with-timeout"
 *
 *   const res = await fetchWithTimeout("/api/foo", { timeoutMs: 5_000 })
 *   if (!res.ok) throw new Error(`HTTP ${res.status}`)
 *
 * Passing `timeoutMs: 0` disables the deadline (rare — only use for
 * long-lived SSE / streaming bodies where you're explicitly relying on
 * the server to close the connection).
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Hard deadline in milliseconds. 0 = disabled. Default 10 000. */
  timeoutMs?: number
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutOptions,
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 10_000
  if (timeoutMs <= 0) {
    const { timeoutMs: _drop, ...rest } = init || {}
    return fetch(input, rest)
  }
  // Compose a signal that aborts on (a) the caller's signal, or
  // (b) our timeout — whichever fires first.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)
  const userSignal = init?.signal
  const onUserAbort = () => controller.abort((userSignal as any)?.reason)
  userSignal?.addEventListener("abort", onUserAbort)
  try {
    const { timeoutMs: _drop, signal: _s, ...rest } = init || {}
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    userSignal?.removeEventListener("abort", onUserAbort)
  }
}

/**
 * Same contract but returns `null` on any error (HTTP error, abort,
 * network failure). Use this in components where a failed upstream
 * should just skip the feature silently (e.g. a sidebar tile that
 * degrades to empty rather than breaking the whole page).
 *
 * Logs each failure to the console with a `[fetchOrNull]` tag so the
 * developer can still find what's broken without the audit needing to
 * grep for silent `catch {}` patterns.
 */
export async function fetchOrNull(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutOptions,
): Promise<Response | null> {
  try {
    const res = await fetchWithTimeout(input, init)
    if (!res.ok) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn(`[fetchOrNull] ${typeof input === "string" ? input : input.toString()} → HTTP ${res.status}`)
      }
      return null
    }
    return res
  } catch (err) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(`[fetchOrNull] ${typeof input === "string" ? input : input.toString()} →`, (err as Error)?.message)
    }
    return null
  }
}
