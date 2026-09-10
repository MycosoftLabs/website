/**
 * Public kinematic geometry for Fusarium device movement.
 * Haversine / forward azimuth are standard spherical formulas (WGS-84 sphere).
 * Nothing here invents a live track or a classified TTP.
 */

export const WGS84_EARTH_RADIUS_M = 6_371_000
export const FORT_STEWART_AO = Object.freeze({
  lng: -81.6072,
  lat: 31.8697,
  label: "Fort Stewart AO (public map center)",
  source: "Public geographic coordinates; not a live COP.",
})

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

export function haversineMeters(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng
  return 2 * WGS84_EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Forward azimuth from A to B, degrees clockwise from true north. */
export function initialBearingDeg(
  from: readonly [number, number],
  to: readonly [number, number],
): number {
  const [lng1, lat1] = from
  const [lng2, lat2] = to
  const y = Math.sin(toRadians(lng2 - lng1)) * Math.cos(toRadians(lat2))
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lng2 - lng1))
  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

export function destinationPoint(
  from: readonly [number, number],
  bearingDeg: number,
  distanceM: number,
): [number, number] {
  const [lng, lat] = from
  const angular = distanceM / WGS84_EARTH_RADIUS_M
  const bearing = toRadians(bearingDeg)
  const lat1 = toRadians(lat)
  const lng1 = toRadians(lng)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return [((toDegrees(lng2) + 540) % 360) - 180, toDegrees(lat2)]
}

/**
 * Circumcenter of three WGS-84 points via ECEF plane intersection.
 * Returns null when points are collinear or degenerate.
 */
export function triangulateThreePoints(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): { fix: [number, number]; residualM: number } | null {
  const toEcef = (lng: number, lat: number): [number, number, number] => {
    const φ = toRadians(lat)
    const λ = toRadians(lng)
    return [
      WGS84_EARTH_RADIUS_M * Math.cos(φ) * Math.cos(λ),
      WGS84_EARTH_RADIUS_M * Math.cos(φ) * Math.sin(λ),
      WGS84_EARTH_RADIUS_M * Math.sin(φ),
    ]
  }
  const A = toEcef(a[0], a[1])
  const B = toEcef(b[0], b[1])
  const C = toEcef(c[0], c[1])
  const ab: [number, number, number] = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
  const ac: [number, number, number] = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
  const n: [number, number, number] = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]
  const nMag = Math.hypot(n[0], n[1], n[2])
  if (nMag < 1) return null
  const midAB: [number, number, number] = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]
  const midAC: [number, number, number] = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2, (A[2] + C[2]) / 2]
  const dAB = Math.hypot(ab[0], ab[1], ab[2])
  const dAC = Math.hypot(ac[0], ac[1], ac[2])
  if (dAB < 1 || dAC < 1) return null
  const uAB: [number, number, number] = [ab[0] / dAB, ab[1] / dAB, ab[2] / dAB]
  const uAC: [number, number, number] = [ac[0] / dAC, ac[1] / dAC, ac[2] / dAC]
  const pAB: [number, number, number] = [
    n[1] * uAB[2] - n[2] * uAB[1],
    n[2] * uAB[0] - n[0] * uAB[2],
    n[0] * uAB[1] - n[1] * uAB[0],
  ]
  const pAC: [number, number, number] = [
    n[1] * uAC[2] - n[2] * uAC[1],
    n[2] * uAC[0] - n[0] * uAC[2],
    n[0] * uAC[1] - n[1] * uAC[0],
  ]
  const denom = pAB[0] * -pAC[1] + pAB[1] * pAC[0]
  if (Math.abs(denom) < 1e-6) return null
  const t =
    ((midAC[0] - midAB[0]) * -pAC[1] + (midAC[1] - midAB[1]) * pAC[0]) / denom
  const x = midAB[0] + pAB[0] * t
  const y = midAB[1] + pAB[1] * t
  const z = midAB[2] + pAB[2] * t
  const r = Math.hypot(x, y, z)
  if (r < 1) return null
  const lat = toDegrees(Math.asin(z / r))
  const lng = toDegrees(Math.atan2(y, x))
  const fix: [number, number] = [lng, lat]
  const residualM =
    (haversineMeters(fix, a) + haversineMeters(fix, b) + haversineMeters(fix, c)) / 3
  return { fix, residualM }
}

export interface HypothesisBranch {
  id: string
  bearingDeg: number
  distanceM: number
  tip: [number, number]
  label: string
}

/** Simple 3-branch reachability tree. Always hypothesis — never a live COP. */
export function kinematicReachabilityTree(
  origin: readonly [number, number],
  headingDeg: number | null,
  stepM: number,
): HypothesisBranch[] {
  const base = headingDeg == null || !Number.isFinite(headingDeg) ? 0 : headingDeg
  const offsets = [
    { id: "ahead", offset: 0, label: "Ahead (hypothesis)" },
    { id: "left", offset: -45, label: "Left 45 deg (hypothesis)" },
    { id: "right", offset: 45, label: "Right 45 deg (hypothesis)" },
  ]
  return offsets.map((branch) => {
    const bearingDeg = (base + branch.offset + 360) % 360
    return {
      id: branch.id,
      bearingDeg,
      distanceM: stepM,
      tip: destinationPoint(origin, bearingDeg, stepM),
      label: branch.label,
    }
  })
}
