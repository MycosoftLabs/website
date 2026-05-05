import type { Feature, FeatureCollection } from "geojson"

import type { MeshtasticNodeRow, MeshtasticStreamPacket } from "@/lib/meshtastic/types"

/** Build point features for map overlay from packets that carry approximate TX coordinates. */
export function streamPacketsToSignalGeoJson(packets: MeshtasticStreamPacket[]): FeatureCollection {
  const features: Feature[] = []
  for (const p of packets) {
    if (p.from_lat == null || p.from_lon == null) continue
    if (Number.isNaN(p.from_lat) || Number.isNaN(p.from_lon)) continue
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.from_lon, p.from_lat] },
      properties: { packet_uid: p.packet_uid ?? "" },
    })
  }
  return { type: "FeatureCollection", features }
}

/** LineString from packet RX position toward resolved `to_node` position (when MINDEX has coords). */
export function packetsToLinkGeoJson(
  packets: MeshtasticStreamPacket[],
  nodes: MeshtasticNodeRow[]
): FeatureCollection {
  const pos = new Map<string, [number, number]>()
  for (const n of nodes) {
    if (n.lat == null || n.lon == null || Number.isNaN(n.lat) || Number.isNaN(n.lon)) continue
    pos.set(n.node_id, [n.lon, n.lat])
  }
  const features: Feature[] = []
  for (const p of packets) {
    if (p.from_lat == null || p.from_lon == null || Number.isNaN(p.from_lat) || Number.isNaN(p.from_lon)) continue
    const toId = p.to_node_id
    if (!toId) continue
    const end = pos.get(toId)
    if (!end) continue
    const a: [number, number] = [p.from_lon, p.from_lat]
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [a, end] },
      properties: {
        port: p.port_num ?? "",
        uid: p.packet_uid ?? "",
      },
    })
  }
  return { type: "FeatureCollection", features }
}

export function filterPacketsByScopeHours(
  packets: MeshtasticStreamPacket[],
  hours: number
): MeshtasticStreamPacket[] {
  if (hours <= 0) return packets
  const cutoff = Date.now() - hours * 3600 * 1000
  return packets.filter((p) => {
    if (!p.rx_time) return true
    const t = Date.parse(p.rx_time)
    if (Number.isNaN(t)) return true
    return t >= cutoff
  })
}
