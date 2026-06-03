/** Default map coordinates for local MycoBrain units without onboard GPS. */

export const DEV_BENCH_DEFAULT_LOCATION = {
  lat: parseFloat(process.env.MYCOBRAIN_DEV_LAT || "32.715736"),
  lon: parseFloat(process.env.MYCOBRAIN_DEV_LON || "-117.161087"),
}

export const DEV_BENCH_LOCATION_LABEL =
  process.env.MYCOBRAIN_DEV_LOCATION_LABEL || "Mycosoft Lab"

export const PSATHYRELLA_COM4_LOCATION = {
  lat: parseFloat(process.env.PSATHYRELLA_COM4_LAT || "32.56289"),
  lon: parseFloat(process.env.PSATHYRELLA_COM4_LON || "-117.13570"),
}

export const PSATHYRELLA_COM4_LOCATION_LABEL =
  process.env.PSATHYRELLA_COM4_LOCATION_LABEL ||
  "Project Oyster - North Reef buoy position"

export function isDevBenchRegistryId(deviceId: string): boolean {
  return /^mycobrain-COM/i.test(deviceId)
}

export function isDevBenchHost(host: string | null | undefined): boolean {
  if (!host) return false
  return host === "192.168.0.241" || host === "localhost" || host === "127.0.0.1"
}

export function resolveDevBenchLocation(
  deviceId: string,
  host?: string | null,
  role?: string | null
): { lat: number; lon: number } | null {
  if (/^mycobrain-COM4$/i.test(deviceId) || (role || "").toLowerCase() === "psathyrella") {
    return PSATHYRELLA_COM4_LOCATION
  }
  if (isDevBenchRegistryId(deviceId) || isDevBenchHost(host)) {
    return DEV_BENCH_DEFAULT_LOCATION
  }
  return null
}
