/**
 * Full-orbit ground track for satellites – Feb 18, 2026
 *
 * Computes a closed ground-track path (wraps around the planet) from
 * orbital period, inclination, and current position. Used for satellite
 * trajectory lines so the line is the full orbit, not a short segment.
 */

const TWO_PI = 2 * Math.PI;
const DEG2RAD = Math.PI / 180;

/** Number of points for one full orbit (balance smoothness vs perf). */
const ORBIT_POINTS = 80;

/**
 * Build ground-track path for one full orbit: [lng, lat][].
 * Uses simplified circular-orbit model:
 *   lat(phase) = inclination * sin(phase)
 *   lng(phase) = lng0 + (phase - phase0)/(2π) * (360 - period*0.25)
 * Earth rotation 0.25°/min; period in minutes → westward shift per orbit.
 *
 * @param periodMin Orbital period in minutes
 * @param inclinationDeg Inclination in degrees
 * @param lng0 Current longitude (degrees)
 * @param lat0 Current latitude (degrees)
 * @returns Array of [lng, lat] for one orbit, or null if invalid
 */
export function getOrbitPath(
  periodMin: number,
  inclinationDeg: number,
  lng0: number,
  lat0: number
): [number, number][] | null {
  if (
    !Number.isFinite(periodMin) ||
    periodMin <= 0 ||
    !Number.isFinite(inclinationDeg) ||
    !Number.isFinite(lng0) ||
    !Number.isFinite(lat0)
  ) {
    return null;
  }

  const inclination = Math.abs(inclinationDeg) * DEG2RAD;
  const lat0Rad = Math.max(-90, Math.min(90, lat0)) * DEG2RAD;

  // Phase at current position: lat0 = inclination * sin(phase0)
  let phase0: number;
  if (inclination < 1e-6) {
    phase0 = 0;
  } else {
    const sinPhase0 = lat0Rad / Math.sin(inclination);
    if (sinPhase0 < -1 || sinPhase0 > 1) {
      phase0 = lat0Rad >= 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      phase0 = Math.asin(sinPhase0);
    }
  }

  // Longitude advance per full orbit (westward): 360° - Earth rotation during one period
  const lngAdvancePerOrbit = 360 - periodMin * 0.25;

  const points: [number, number][] = [];
  for (let i = 0; i <= ORBIT_POINTS; i++) {
    const phase = phase0 + (i / ORBIT_POINTS) * TWO_PI;
    const lat = inclinationDeg * Math.sin(phase);
    const lngDelta = ((phase - phase0) / TWO_PI) * lngAdvancePerOrbit;
    let lng = lng0 + lngDelta;
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    points.push([lng, Math.max(-90, Math.min(90, lat))]);
  }

  return points;
}
