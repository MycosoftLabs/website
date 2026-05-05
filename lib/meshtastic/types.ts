/** Meshtastic mesh types — aligned with MAS `/api/meshtastic/*` + MINDEX internal list shapes. */

export interface MeshtasticNodeRow {
  node_id: string
  long_name?: string | null
  short_name?: string | null
  hw_model?: string | null
  role?: string | null
  lat?: number | null
  lon?: number | null
  last_heard_at?: string | null
  region?: string | null
  battery_pct?: number | null
  voltage?: number | null
  channel_util?: number | null
  air_util_tx?: number | null
  firmware?: string | null
  modem_preset?: string | null
  is_licensed?: boolean | null
  is_observer?: boolean | null
  metadata?: Record<string, unknown> | null
  updated_at?: string | null
}

export interface MeshtasticObserverRow {
  observer_id: string
  node_id?: string | null
  lat?: number | null
  lon?: number | null
  region?: string | null
  gateway_kind?: string | null
  online?: boolean | null
  pkts_per_min?: number | null
}

export interface MeshtasticStreamPacket {
  topic?: string
  packet_uid?: string
  from_node_id?: string | null
  to_node_id?: string | null
  gateway_node_id?: string | null
  channel?: string | null
  region?: string | null
  port_num?: string | null
  rx_rssi?: number | null
  rx_snr?: number | null
  rx_time?: string | null
  from_lat?: number | null
  from_lon?: number | null
  decode_error?: boolean
  /** Decoded mesh text (e.g. TEXT_MESSAGE_APP), when bridge extracted it. */
  payload_text?: string | null
  want_ack?: boolean | null
  hop_limit?: number | null
  hop_start?: number | null
}

export interface MeshtasticNodesResponse {
  items: MeshtasticNodeRow[]
  limit?: number
  offset?: number
}

export interface MeshtasticObserversResponse {
  items: MeshtasticObserverRow[]
}

export interface MeshtasticStatsResponse {
  node_count: number
  packets_last_1m: number
  packets_last_60m: number
  observers_online: number
}

export interface MeshtasticPacketRow {
  id?: string
  packet_uid?: string | null
  from_node_id?: string | null
  to_node_id?: string | null
  gateway_node_id?: string | null
  channel?: string | null
  port_num?: string | null
  rx_time?: string | null
  rx_rssi?: number | null
  rx_snr?: number | null
  hop_limit?: number | null
  hop_start?: number | null
  want_ack?: boolean | null
  payload_text?: string | null
  payload?: Record<string, unknown> | null
  topic?: string | null
  via_mqtt?: boolean | null
}

export interface MeshtasticPacketsResponse {
  items: MeshtasticPacketRow[]
  limit?: number
  offset?: number
}

export interface MeshtasticRouteRow {
  from_node_id?: string | null
  to_node_id?: string | null
  hops?: number | null
  last_seen_at?: string | null
  packet_count?: number | null
  avg_snr?: number | null
}

export interface MeshtasticRoutesResponse {
  items: MeshtasticRouteRow[]
}
