/**
 * Meshtastic packet → Tone.js cues: single hit or multi-note sequence from real bytes / RSSI / port.
 */

import { bytesToMidiNotes, noteDurationsForBytes, packetBytesForSonify } from "@/lib/meshtastic/packet-audio"
import type { MeshtasticStreamPacket } from "@/lib/meshtastic/types"

const STORAGE_MUTE = "mycosoft_meshtastic_audio_mute"

export function isMeshtasticAudioMuted(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(STORAGE_MUTE) === "1"
  } catch {
    return true
  }
}

export function setMeshtasticAudioMuted(muted: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_MUTE, muted ? "1" : "0")
  } catch {
    /* ignore */
  }
}

function rssiToMidi(rssi: number | null | undefined): number {
  if (rssi == null || Number.isNaN(rssi)) return 60
  const clamped = Math.max(-120, Math.min(-40, rssi))
  return 48 + ((clamped + 120) / 80) * 24
}

function portToSynthType(port: string | null | undefined): "sine" | "triangle" | "square" {
  const p = (port || "").toUpperCase()
  if (p.includes("TEXT") || p.includes("NODEINFO")) return "sine"
  if (p.includes("POSITION") || p.includes("GPS")) return "triangle"
  if (p.includes("ROUTING") || p.includes("ACK")) return "triangle"
  return "square"
}

/** Map decoded mesh text to note length (sonification, not speech). */
function textToNoteLength(text: string | null | undefined): string {
  if (!text) return "16n"
  let sum = 0
  for (let i = 0; i < Math.min(text.length, 96); i++) sum += text.charCodeAt(i)
  const opts = ["32n", "32n", "16n", "16n.", "16n.", "8n"]
  return opts[sum % opts.length] ?? "16n"
}

/** ±3 semitone offset from text so messages change pitch class without inventing speech. */
function textToSemitoneOffset(text: string | null | undefined): number {
  if (!text) return 0
  let sum = 0
  for (let i = 0; i < Math.min(text.length, 64); i++) sum += text.charCodeAt(i)
  return (sum % 7) - 3
}

function durationMsFromNotation(d: string): number {
  if (d.startsWith("32")) return 72
  if (d.startsWith("16n.")) return 200
  if (d.startsWith("16")) return 130
  if (d.startsWith("8")) return 260
  return 120
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** A4 = 440 Hz; MIDI note number → Hz (no Tone.Frequency typing drift). */
function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

let started = false

async function ensureTone(): Promise<Record<string, unknown> | null> {
  if (typeof window === "undefined" || isMeshtasticAudioMuted()) return null
  try {
    const mod = await import("tone")
    const Tone: Record<string, unknown> =
      (mod as { default?: Record<string, unknown> }).default ?? (mod as Record<string, unknown>)
    if (!started) {
      await (Tone.start as () => Promise<void>)()
      started = true
    }
    return Tone
  } catch {
    return null
  }
}

/** Multi-note sequence: UTF-8 of `payload_text` or uid-derived bytes → MIDI; extra staccato when `want_ack`. */
export async function playMeshPacketSequence(
  pkt: MeshtasticStreamPacket,
  opts?: { maxNotes?: number }
): Promise<void> {
  const Tone = await ensureTone()
  if (!Tone) return
  const maxNotes = Math.min(48, Math.max(1, opts?.maxNotes ?? 16))
  const bytes = packetBytesForSonify(pkt)
  const baseMidi = rssiToMidi(pkt.rx_rssi ?? null) + textToSemitoneOffset(pkt.payload_text ?? null)
  const mids = bytesToMidiNotes(bytes, baseMidi, maxNotes)
  const durs = noteDurationsForBytes(mids.length, pkt.want_ack)
  const type = portToSynthType(pkt.port_num ?? null)
  const Synth = Tone.Synth as new (opts: object) => {
    toDestination: () => { triggerAttackRelease: (f: number, d: string) => void; dispose: () => void }
  }
  const synth = new Synth({
    oscillator: { type },
    envelope: { attack: 0.008, decay: 0.06, sustain: 0.04, release: 0.1 },
    volume: -26,
  }).toDestination()

  try {
    for (let i = 0; i < mids.length; i++) {
      const midi = mids[i] ?? 60
      const freq = midiToHz(midi)
      const d = durs[i] ?? "16n"
      synth.triggerAttackRelease(freq, d)
      await sleep(durationMsFromNotation(d) + 8)
    }
  } finally {
    try {
      synth.dispose()
    } catch {
      /* noop */
    }
  }
}

export async function playMeshPacketTone(input: {
  rx_rssi?: number | null
  port_num?: string | null
  /** When present (e.g. TEXT_MESSAGE_APP), rhythm / detune follow real characters — not TTS. */
  payload_text?: string | null
}): Promise<void> {
  const Tone = await ensureTone()
  if (!Tone) return
  try {
    const midi = rssiToMidi(input.rx_rssi ?? null) + textToSemitoneOffset(input.payload_text ?? null)
    const freq = midiToHz(midi)
    const type = portToSynthType(input.port_num ?? null)
    const noteLen = textToNoteLength(input.payload_text ?? null)
    const Synth = Tone.Synth as new (opts: object) => {
      toDestination: () => { triggerAttackRelease: (f: number, d: string) => void; dispose: () => void }
    }
    const synth = new Synth({
      oscillator: { type },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.05, release: 0.12 },
      volume: -28,
    }).toDestination()
    synth.triggerAttackRelease(freq, noteLen)
    setTimeout(() => {
      try {
        synth.dispose()
      } catch {
        /* noop */
      }
    }, 500)
  } catch {
    /* Tone unavailable or autoplay blocked */
  }
}
