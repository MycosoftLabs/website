import type { MeshtasticPacketRow, MeshtasticStreamPacket } from "@/lib/meshtastic/types"

import { extractLatLonFromMeshPacketPayload } from "@/lib/meshtastic/payload-position"

/** Build stream-shaped packets for geo helpers from REST packet rows (payload jsonb → from_lat/lon). */
export function packetRowToStreamPacket(row: MeshtasticPacketRow): MeshtasticStreamPacket {
  const ll = extractLatLonFromMeshPacketPayload(row.payload ?? null)
  return {
    packet_uid: row.packet_uid ?? undefined,
    from_node_id: row.from_node_id,
    to_node_id: row.to_node_id,
    gateway_node_id: row.gateway_node_id,
    channel: row.channel ?? undefined,
    port_num: row.port_num ?? undefined,
    rx_rssi: row.rx_rssi,
    rx_snr: row.rx_snr,
    rx_time: row.rx_time,
    from_lat: ll?.lat ?? null,
    from_lon: ll?.lon ?? null,
    payload_text: row.payload_text,
    want_ack: row.want_ack,
    hop_limit: row.hop_limit,
    hop_start: row.hop_start,
    topic: row.topic ?? undefined,
  }
}

export function packetRowsToStreamPackets(rows: MeshtasticPacketRow[]): MeshtasticStreamPacket[] {
  return rows.map(packetRowToStreamPacket)
}
