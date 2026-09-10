/**
 * Public-OSINT mover failover helpers (Sep 10, 2026).
 *
 * Sequential primary → backup for aircraft (ADS-B / AGS) and vessels (AIS).
 * No invented tracks. Empty + failed_upstreams when every live source fails.
 */

export interface MoverBbox {
  south: number
  north: number
  west: number
  east: number
}

export interface MoverQuery {
  bbox?: MoverBbox
  limit?: number
}

export interface UpstreamAttempt {
  name: string
  ok: boolean
  count: number
  ms: number
  error?: string
  status?: number
  used?: boolean
}

export const AIRCRAFT_MAX_FEATURES = 2500
export const VESSEL_MAX_FEATURES = 2500
export const ADSB_POINT_MAX_NM = 150
export const CREP_OSINT_UA = "Mycosoft-CREP/1.0 (+https://mycosoft.com)"

export function clampMoverLimit(requested: number | undefined, cap: number): number {
  if (!Number.isFinite(requested) || !requested || requested <= 0) return cap
  return Math.min(Math.floor(requested), cap)
}

export function bboxIsFinite(bbox?: MoverBbox | null): bbox is MoverBbox {
  if (!bbox) return false
  return [bbox.south, bbox.north, bbox.west, bbox.east].every((n) => Number.isFinite(n))
}

export function bboxCenter(bbox: MoverBbox): { lat: number; lon: number } {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lon: (bbox.west + bbox.east) / 2,
  }
}

/** Approximate bbox half-diagonal in nautical miles (good enough for ADS-B point APIs). */
export function bboxRadiusNm(bbox: MoverBbox): number {
  const latSpan = Math.abs(bbox.north - bbox.south)
  const lonSpan = Math.abs(bbox.east - bbox.west)
  const midLat = Math.abs((bbox.north + bbox.south) / 2)
  const latNm = latSpan * 60
  const lonNm = lonSpan * 60 * Math.cos((midLat * Math.PI) / 180)
  const halfDiag = Math.sqrt(latNm * latNm + lonNm * lonNm) / 2
  return Math.max(25, Math.min(ADSB_POINT_MAX_NM, Math.ceil(halfDiag)))
}

/** Point backups only help regional views. CONUS/world spans skip them. */
export function bboxFitsPointBackup(bbox?: MoverBbox | null): boolean {
  if (!bboxIsFinite(bbox)) return false
  const latSpan = Math.abs(bbox.north - bbox.south)
  const lonSpan = Math.abs(bbox.east - bbox.west)
  return latSpan <= 8 && lonSpan <= 12
}

export function inBbox(lat: number, lng: number, bbox?: MoverBbox | null): boolean {
  if (!bboxIsFinite(bbox)) return true
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east
}

export function capRows<T>(rows: T[], limit: number): T[] {
  if (rows.length <= limit) return rows
  return rows.slice(0, limit)
}

export async function timeAttempt<T>(
  name: string,
  fn: () => Promise<T[]>,
): Promise<{ rows: T[]; attempt: UpstreamAttempt }> {
  const start = Date.now()
  try {
    const rows = await fn()
    const list = Array.isArray(rows) ? rows : []
    return {
      rows: list,
      attempt: {
        name,
        ok: list.length > 0,
        count: list.length,
        ms: Date.now() - start,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusMatch = message.match(/\b(40\d|41\d|42\d|43\d|50\d|51\d)\b/)
    return {
      rows: [],
      attempt: {
        name,
        ok: false,
        count: 0,
        ms: Date.now() - start,
        error: message,
        status: statusMatch ? Number(statusMatch[1]) : undefined,
      },
    }
  }
}

/**
 * Try sources in order. First source that returns rows wins.
 * Later sources are not called. Failed/empty sources are recorded.
 */
export async function firstNonEmpty<T>(
  steps: Array<{ name: string; fn: () => Promise<T[]> }>,
): Promise<{ rows: T[]; used: string | null; attempts: UpstreamAttempt[] }> {
  const attempts: UpstreamAttempt[] = []
  for (const step of steps) {
    const { rows, attempt } = await timeAttempt(step.name, step.fn)
    if (rows.length > 0) {
      attempts.push({ ...attempt, used: true })
      return { rows, used: step.name, attempts }
    }
    attempts.push({ ...attempt, used: false })
  }
  return { rows: [], used: null, attempts }
}

export function failedUpstreamNames(attempts: UpstreamAttempt[]): string[] {
  return attempts.filter((a) => !a.ok).map((a) => (a.error ? `${a.name}:${a.error}` : a.name))
}
