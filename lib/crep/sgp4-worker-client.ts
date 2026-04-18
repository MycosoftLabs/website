/**
 * SGP4 Web Worker Client (Fix E — Apr 18, 2026)
 *
 * Thin wrapper around a dedicated satellite-propagation worker so the main
 * thread never runs SGP4 math. Main thread stays at 60 FPS even with 15k+
 * satellites propagating at 1 Hz.
 *
 * Worker script is served from /workers/sgp4.worker.js (static asset) so
 * Next.js bundling can't strand it. Satellite.js lives alongside it at
 * /workers/satellite.min.js.
 *
 * Graceful fallback: if the Worker constructor throws (SSR, strict CSP,
 * antique browser), callers should fall back to the main-thread
 * SGP4Propagator class.
 */

export interface WorkerSatInput {
  id: string
  noradId: number
  line1: string
  line2: string
}

export interface WorkerSatPosition {
  id: string
  noradId: number
  lat: number
  lng: number
  altitude_km: number
  velocity_km_s: number
}

type ReadyListener = () => void
type PositionsListener = (positions: WorkerSatPosition[], atIso: string) => void

export class SGP4WorkerClient {
  private worker: Worker | null = null
  private ready = false
  private readyListeners: ReadyListener[] = []
  private positionsListeners: PositionsListener[] = []
  private pendingPropagate: Promise<WorkerSatPosition[]> | null = null
  private pendingResolve: ((p: WorkerSatPosition[]) => void) | null = null

  constructor() {
    if (typeof window === "undefined" || typeof Worker === "undefined") return
    try {
      this.worker = new Worker("/workers/sgp4.worker.js")
      this.worker.onmessage = (e) => this.handleMessage(e.data)
      this.worker.onerror = (e) => {
        console.warn("[SGP4Worker] error:", e.message || e)
      }
    } catch (e: any) {
      console.warn("[SGP4Worker] failed to construct worker:", e?.message)
      this.worker = null
    }
  }

  get isSupported(): boolean {
    return !!this.worker
  }

  get isReady(): boolean {
    return this.ready
  }

  onReady(cb: ReadyListener) {
    if (this.ready) cb()
    else this.readyListeners.push(cb)
  }

  onPositions(cb: PositionsListener) {
    this.positionsListeners.push(cb)
  }

  offPositions(cb: PositionsListener) {
    this.positionsListeners = this.positionsListeners.filter((l) => l !== cb)
  }

  load(satellites: WorkerSatInput[]): void {
    if (!this.worker) return
    // Shallow filter: only send sats with valid TLEs (the worker re-checks)
    const payload = satellites.filter((s) => s && s.line1 && s.line2)
    this.worker.postMessage({ op: "load", satellites: payload })
  }

  /**
   * Request a propagation for the given Date. Returns a promise of positions.
   * If a propagation is already in flight, returns the same pending promise.
   */
  propagate(at: Date = new Date()): Promise<WorkerSatPosition[]> {
    if (!this.worker) return Promise.resolve([])
    if (this.pendingPropagate) return this.pendingPropagate
    this.pendingPropagate = new Promise((resolve) => {
      this.pendingResolve = resolve
    })
    this.worker.postMessage({ op: "propagate", atIso: at.toISOString() })
    return this.pendingPropagate
  }

  clear(): void {
    if (!this.worker) return
    this.worker.postMessage({ op: "clear" })
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.ready = false
    this.readyListeners = []
    this.positionsListeners = []
    this.pendingPropagate = null
    this.pendingResolve = null
  }

  private handleMessage(msg: any): void {
    if (!msg || typeof msg !== "object") return
    switch (msg.op) {
      case "ready":
        this.ready = true
        for (const cb of this.readyListeners) { try { cb() } catch {} }
        this.readyListeners = []
        break
      case "loaded":
        console.log(`[SGP4Worker] loaded ${msg.count} satellites`)
        break
      case "positions":
        if (this.pendingResolve) {
          const r = this.pendingResolve
          this.pendingResolve = null
          this.pendingPropagate = null
          try { r(msg.positions || []) } catch {}
        }
        for (const cb of this.positionsListeners) {
          try { cb(msg.positions || [], msg.at) } catch {}
        }
        break
      case "error":
        console.warn("[SGP4Worker] error:", msg.message)
        if (this.pendingResolve) {
          const r = this.pendingResolve
          this.pendingResolve = null
          this.pendingPropagate = null
          try { r([]) } catch {}
        }
        break
    }
  }
}

// Singleton — one worker per page
let _client: SGP4WorkerClient | null = null
export function getSGP4Worker(): SGP4WorkerClient {
  if (!_client) _client = new SGP4WorkerClient()
  return _client
}
