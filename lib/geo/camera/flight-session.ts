/**
 * RECONSTRUCTED faithful shim (see lib/geo/crep-map-fly-to.ts header). The camera "flight
 * session" state Cursor extracted from CREPDashboardClient. On the legacy globe this is a benign
 * no-op session: live work is NEVER paused (shouldPauseLiveWork → false, the pre-refactor
 * behavior), runAfterEnd runs its callback immediately (no in-flight deferral), and there are no
 * v3 photoreal-flight sat layers to hide. Cursor's real version supersedes on sync.
 */
type Listener = (active: boolean) => void

class FlightSession {
  private active = false
  private listeners = new Set<Listener>()

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  /** legacy never pauses live work for camera moves (pre-refactor behavior). */
  shouldPauseLiveWork(): boolean { return this.active }

  /** run cb after the current flight ends; legacy has no in-flight deferral → run now. */
  runAfterEnd(cb: () => void): void { try { cb() } catch { /* */ } }

  isActive(): boolean { return this.active }
}

export const flightSession = new FlightSession()

/** v3-only: sat layers hidden during a photoreal flight. None on the legacy globe. */
export const V3_FLIGHT_HIDDEN_SAT_LAYERS: string[] = []
