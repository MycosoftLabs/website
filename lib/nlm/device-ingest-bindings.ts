/**
 * Pure NLM ingest binding helpers (no network / path aliases).
 */

export function normalizeIngestBindings(
  input: unknown
): Array<{ device_id: string; sensor_id: string }> {
  if (!Array.isArray(input)) return []
  const out: Array<{ device_id: string; sensor_id: string }> = []
  for (const row of input) {
    if (!row || typeof row !== "object") continue
    const device_id = String((row as any).device_id || (row as any).deviceId || "").trim()
    const sensor_id = String((row as any).sensor_id || (row as any).sensorId || "").trim()
    if (device_id && sensor_id) out.push({ device_id, sensor_id })
  }
  return out
}
