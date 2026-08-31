/**
 * RECONSTRUCTED faithful shim. Cursor's real lib/geo/* refactor files went missing from this
 * worktree (uncommitted, lost in a file-deletion incident; present in no branch and no other
 * worktree). These restore compilation with LEGACY-globe behavior identical to the pre-refactor
 * inline code (a thin map.flyTo passthrough). Cursor's authoritative versions supersede this on
 * sync. — Claude, Jun 25 2026.
 *
 * Camera fly-to helpers extracted from CREPDashboardClient. The optional engine arg lets the v3
 * path special-case the move; legacy ignores it and flies exactly as the inline code did.
 */
import type { Map as MapLibreMap } from "maplibre-gl"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined
type FlyOpts = Record<string, unknown> & {
  center?: [number, number]
  zoom?: number
  pitch?: number
  bearing?: number
  duration?: number
  essential?: boolean
}
type Engine = "legacy" | "v3"

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null
  if (typeof (m as MapLibreMap).flyTo === "function") return m as MapLibreMap
  return (m as { current?: MapLibreMap | null }).current ?? null
}

export function crepMapFlyTo(map: MapLike, opts: FlyOpts, _engine: Engine = "legacy"): void {
  const m = resolveMap(map)
  if (!m) return
  try { m.flyTo(opts as never) } catch { /* */ }
}

export function crepMapJumpOrFly(map: MapLike, opts: FlyOpts, _engine: Engine = "legacy"): void {
  const m = resolveMap(map)
  if (!m) return
  try {
    if (opts && opts.duration === 0) m.jumpTo(opts as never)
    else m.flyTo(opts as never)
  } catch { /* */ }
}

export function crepMapTiltFlyTo(map: MapLike, opts: FlyOpts, _engine: Engine = "legacy"): void {
  const m = resolveMap(map)
  if (!m) return
  try { m.flyTo(opts as never) } catch { /* */ }
}
