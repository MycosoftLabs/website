/**
 * Derive sonification inputs from real packet fields only (no invented message text).
 * When `payload_text` is absent, bytes come from `packet_uid` hex — still observational, not mock chat.
 */

import type { MeshtasticStreamPacket } from "@/lib/meshtastic/types"

/** UTF-8 bytes of decoded text, or hex-derived bytes from packet_uid (deterministic). */
export function packetBytesForSonify(pkt: MeshtasticStreamPacket): number[] {
  const text = pkt.payload_text?.trim()
  if (text) {
    return [...new TextEncoder().encode(text)]
  }
  const uid = (pkt.packet_uid ?? "").replace(/[^0-9a-fA-F]/g, "")
  const out: number[] = []
  for (let i = 0; i + 1 < uid.length && out.length < 64; i += 2) {
    out.push(parseInt(uid.slice(i, i + 2), 16))
  }
  if (out.length === 0) {
    const seed = `${pkt.from_node_id ?? ""}|${pkt.port_num ?? ""}|${pkt.rx_time ?? ""}`
    for (let i = 0; i < Math.min(seed.length, 32); i++) out.push(seed.charCodeAt(i) & 0xff)
  }
  return out
}

/** Map bytes to MIDI note numbers in a pentatonic-ish set around baseMidi. */
export function bytesToMidiNotes(bytes: number[], baseMidi: number, maxNotes: number): number[] {
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
  const out: number[] = []
  for (let i = 0; i < bytes.length && out.length < maxNotes; i++) {
    const b = bytes[i] ?? 0
    const step = scale[b % scale.length] ?? 0
    const note = Math.round(baseMidi) + step + ((b >> 4) % 3) * 12
    out.push(Math.max(36, Math.min(96, note)))
  }
  return out.length ? out : [Math.round(baseMidi)]
}

export function noteDurationsForBytes(count: number, wantAck: boolean | null | undefined): string[] {
  const base = ["32n", "32n", "16n", "16n", "16n.", "8n"]
  const out: string[] = []
  for (let i = 0; i < count; i++) out.push(base[i % base.length] ?? "16n")
  if (wantAck === true) {
    out.push("32n", "32n")
  }
  return out
}
