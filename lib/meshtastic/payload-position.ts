/**
 * Lat/lon from stored mesh_packet JSON (MINDEX `payload` column).
 * Mirrors Python `mqtt_meshtastic_bridge._extract_lat_lon(mesh_packet_dict)`.
 */
export function extractLatLonFromMeshPacketPayload(
  payload: Record<string, unknown> | null | undefined
): { lat: number; lon: number } | null {
  if (!payload || typeof payload !== "object") return null
  if (payload.decode_error === true) return null

  const decoded = (payload.decoded as Record<string, unknown> | undefined) ?? {}
  const pos =
    (decoded.position as Record<string, unknown> | undefined) ??
    (decoded.Position as Record<string, unknown> | undefined) ??
    {}
  const latRaw = pos.latitude ?? pos.latitudeI
  const lonRaw = pos.longitude ?? pos.longitudeI
  if (latRaw == null || lonRaw == null) return null

  try {
    let la = Number(latRaw)
    let lo = Number(lonRaw)
    if (Number.isNaN(la) || Number.isNaN(lo)) return null
    if (Math.abs(la) > 90 || Math.abs(lo) > 180) {
      la /= 1e7
      lo /= 1e7
    }
    if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null
    return { lat: la, lon: lo }
  } catch {
    return null
  }
}
