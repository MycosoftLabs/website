/** Default map coordinates for dev PC USB bench units (COM4) without GPS. */

export const DEV_BENCH_DEFAULT_LOCATION = {
  lat: parseFloat(process.env.MYCOBRAIN_DEV_LAT || "32.715736"),
  lon: parseFloat(process.env.MYCOBRAIN_DEV_LON || "-117.161087"),
}

export const DEV_BENCH_LOCATION_LABEL =
  process.env.MYCOBRAIN_DEV_LOCATION_LABEL || "Mycosoft Lab (dev PC USB bench)"

export function isDevBenchRegistryId(deviceId: string): boolean {
  return /^mycobrain-COM/i.test(deviceId)
}

export function isDevBenchHost(host: string | null | undefined): boolean {
  if (!host) return false
  return host === "192.168.0.241" || host === "localhost" || host === "127.0.0.1"
}

export function resolveDevBenchLocation(
  deviceId: string,
  host?: string | null
): { lat: number; lon: number } | null {
  if (isDevBenchRegistryId(deviceId) || isDevBenchHost(host)) {
    return DEV_BENCH_DEFAULT_LOCATION
  }
  return null
}
