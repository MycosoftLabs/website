/**
 * Worldview v1 client SDK — Apr 23, 2026
 *
 * Zero-dep TypeScript client that any Mycosoft codebase (PersonaPlex,
 * MYCA workflows, internal dashboards, external partner apps) can
 * import to call the Worldview API with type-safe envelopes, automatic
 * bearer-auth, and graceful error handling.
 *
 * Usage:
 *
 *   import { WorldviewClient } from "@/lib/worldview-client"
 *
 *   const wv = new WorldviewClient({ apiKey: process.env.WORLDVIEW_API_KEY })
 *
 *   // Single dataset
 *   const aircraft = await wv.query("crep.live.aviation.flightradar24", { bbox: "-118,32,-116,34" })
 *   console.log(aircraft.data.aircraft.length, "planes")
 *
 *   // Bundle
 *   const tj = await wv.bundle("situational.tijuana")
 *   console.log("cost:", tj.cost_debited, "balance:", tj.balance_remaining)
 *
 *   // SSE stream
 *   const es = wv.stream("live.aircraft", { bbox: "-118,32,-116,34" })
 *   es.on("data", (ev) => console.log(ev.ts, ev.payload))
 *   es.on("error", (e) => console.error(e))
 *   es.close()
 *
 *   // Discovery
 *   const catalog = await wv.catalog()
 *   const bundles = await wv.listBundles()
 *   const usage = await wv.usage()
 *
 * Works in Node 20+ (globalThis.fetch, EventSource via eventsource pkg
 * if needed) and in modern browsers natively.
 */

export interface WorldviewClientOpts {
  /** mk_... API key. Falls back to WORLDVIEW_API_KEY env. */
  apiKey?: string
  /** Base URL (default https://mycosoft.com). */
  baseUrl?: string
  /** Timeout per request (ms). Default 20000. */
  timeoutMs?: number
  /** Abort signal forwarded into fetch() and SSE. */
  signal?: AbortSignal
}

export interface RateLimitState {
  limit_per_minute: number
  remaining_per_minute: number
  reset_at: string
}

export interface SuccessEnvelope<T = any> {
  ok: true
  request_id: string
  dataset?: string
  bundle?: string
  cost_debited: number
  balance_remaining: number | null
  rate_limit: RateLimitState | null
  cache: "hit" | "miss" | "stale" | "bypass"
  generated_at: string
  ttl_s: number
  data: T
  meta?: Record<string, any>
}

export interface ErrorEnvelope {
  ok: false
  request_id: string
  dataset?: string
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
  rate_limit?: RateLimitState | null
  balance_remaining?: number | null
}

export type Envelope<T = any> = SuccessEnvelope<T> | ErrorEnvelope

export class WorldviewError extends Error {
  code: string
  details?: Record<string, any>
  envelope: ErrorEnvelope
  status?: number
  constructor(envelope: ErrorEnvelope, status?: number) {
    super(envelope.error?.message || "worldview error")
    this.code = envelope.error?.code || "INTERNAL"
    this.details = envelope.error?.details
    this.envelope = envelope
    this.status = status
  }
}

export class WorldviewClient {
  private apiKey?: string
  private baseUrl: string
  private timeoutMs: number
  private signal?: AbortSignal

  constructor(opts: WorldviewClientOpts = {}) {
    this.apiKey = opts.apiKey ?? (typeof process !== "undefined" ? process.env?.WORLDVIEW_API_KEY : undefined)
    this.baseUrl = (opts.baseUrl ?? "https://mycosoft.com").replace(/\/$/, "")
    this.timeoutMs = opts.timeoutMs ?? 20_000
    this.signal = opts.signal
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" }
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`
    return h
  }

  private async json<T>(path: string, opts: RequestInit = {}): Promise<SuccessEnvelope<T>> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    const abortHandler = () => controller.abort()
    if (this.signal) this.signal.addEventListener("abort", abortHandler)

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...opts,
        headers: { ...this.authHeaders(), ...(opts.headers as Record<string, string> | undefined) },
        signal: controller.signal,
        cache: "no-store",
      })
      const envelope = (await res.json()) as Envelope<T>
      if (!envelope.ok) throw new WorldviewError(envelope, res.status)
      return envelope
    } finally {
      clearTimeout(timer)
      if (this.signal) this.signal.removeEventListener("abort", abortHandler)
    }
  }

  /** GET /v1/health — free, no auth. */
  health(): Promise<any> {
    return fetch(`${this.baseUrl}/api/worldview/v1/health`).then((r) => r.json())
  }

  /** GET /v1/catalog — list every dataset. */
  catalog(opts: { scope?: string; category?: string } = {}): Promise<any> {
    const p = new URLSearchParams()
    if (opts.scope) p.set("scope", opts.scope)
    if (opts.category) p.set("category", opts.category)
    return fetch(`${this.baseUrl}/api/worldview/v1/catalog${p.toString() ? `?${p}` : ""}`).then((r) => r.json())
  }

  /** GET /v1/bundles — list every bundle. */
  listBundles(): Promise<any> {
    return fetch(`${this.baseUrl}/api/worldview/v1/bundles`).then((r) => r.json())
  }

  /** GET /v1/openapi.json — full OpenAPI spec. */
  openapi(): Promise<any> {
    return fetch(`${this.baseUrl}/api/worldview/v1/openapi.json`).then((r) => r.json())
  }

  /** GET /v1/usage — caller balance + rate-limit bucket. */
  async usage(): Promise<any> {
    const r = await fetch(`${this.baseUrl}/api/worldview/v1/usage`, { headers: this.authHeaders() })
    return r.json()
  }

  /** GET /v1/snapshot — world-state aggregate. */
  snapshot(opts: { project?: "global" | "oyster" | "goffs" } = {}): Promise<SuccessEnvelope<any>> {
    const p = new URLSearchParams()
    if (opts.project) p.set("project", opts.project)
    return this.json<any>(`/api/worldview/v1/snapshot${p.toString() ? `?${p}` : ""}`)
  }

  /**
   * GET /v1/query?type=<dataset_id>&<params>
   *
   * Pass any dataset id from /catalog plus dataset-specific params.
   */
  query<T = any>(datasetId: string, params: Record<string, string | number | boolean> = {}): Promise<SuccessEnvelope<T>> {
    const p = new URLSearchParams({ type: datasetId })
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue
      p.set(k, String(v))
    }
    return this.json<T>(`/api/worldview/v1/query?${p}`)
  }

  /** GET /v1/bundle/{bundle_id}?<params> */
  bundle<T = any>(bundleId: string, params: Record<string, string | number | boolean> = {}): Promise<SuccessEnvelope<T>> {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue
      p.set(k, String(v))
    }
    return this.json<T>(`/api/worldview/v1/bundle/${encodeURIComponent(bundleId)}${p.toString() ? `?${p}` : ""}`)
  }

  /**
   * GET /v1/tile/{z}/{x}/{y} — returns raw image/tile bytes.
   */
  async tile(z: number, x: number, y: number, opts: { source?: string } = {}): Promise<ArrayBuffer> {
    const p = new URLSearchParams()
    if (opts.source) p.set("source", opts.source)
    const r = await fetch(`${this.baseUrl}/api/worldview/v1/tile/${z}/${x}/${y}${p.toString() ? `?${p}` : ""}`, {
      headers: this.authHeaders(),
    })
    if (!r.ok) throw new Error(`tile ${z}/${x}/${y} -> ${r.status}`)
    return r.arrayBuffer()
  }

  /**
   * Open an SSE stream. Returns an EventSource-like handle with .on()
   * shorthand + .close().
   *
   * Browser usage: uses native EventSource (bearer auth not supported
   * natively — pass the key as a query param fallback if needed).
   * Node usage: falls back to fetch + reader loop so bearer auth works.
   */
  stream(channel: string, params: Record<string, string> = {}): WorldviewStreamHandle {
    const p = new URLSearchParams(params)
    const url = `${this.baseUrl}/api/worldview/v1/stream/${encodeURIComponent(channel)}${p.toString() ? `?${p}` : ""}`
    return new WorldviewStreamHandle(url, this.apiKey)
  }
}

// ─── SSE handle ──────────────────────────────────────────────────────

type StreamEventName = "hello" | "data" | "heartbeat" | "entity" | "error"

export class WorldviewStreamHandle {
  private url: string
  private apiKey?: string
  private listeners: Map<StreamEventName, Array<(ev: any) => void>> = new Map()
  private abort = new AbortController()
  private closed = false

  constructor(url: string, apiKey?: string) {
    this.url = url
    this.apiKey = apiKey
    this.open()
  }

  on(event: StreamEventName, handler: (ev: any) => void): this {
    const list = this.listeners.get(event) ?? []
    list.push(handler)
    this.listeners.set(event, list)
    return this
  }

  close(): void {
    this.closed = true
    try { this.abort.abort() } catch { /* */ }
  }

  private emit(event: StreamEventName, payload: any) {
    const list = this.listeners.get(event)
    if (!list) return
    for (const fn of list) { try { fn(payload) } catch { /* */ } }
  }

  private async open() {
    try {
      const headers: Record<string, string> = { Accept: "text/event-stream" }
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`
      const res = await fetch(this.url, { headers, signal: this.abort.signal, cache: "no-store" })
      if (!res.ok || !res.body) {
        this.emit("error", { code: "UPSTREAM_UNREACHABLE", status: res.status })
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ""
      while (!this.closed) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue
        buf += dec.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          let eventName: StreamEventName = "data"
          let data: any = null
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim() as StreamEventName
            else if (line.startsWith("data:")) {
              const body = line.slice(5).trim()
              try { data = JSON.parse(body) } catch { data = body }
            }
          }
          this.emit(eventName, data)
        }
      }
    } catch (e: any) {
      if (!this.closed) this.emit("error", { code: "STREAM_ERROR", message: e?.message })
    }
  }
}

// ─── Convenience factory ─────────────────────────────────────────────

/**
 * Create a client bound to an API key from env vars. Convenience for
 * scripts and server-side code that just need the singleton.
 */
export function worldview(opts: WorldviewClientOpts = {}): WorldviewClient {
  return new WorldviewClient(opts)
}

// Default export — the class itself.
export default WorldviewClient
