/**
 * Voice v9 shared types - March 2, 2026.
 * Matches MAS voice_v9 schemas for session, transcript, events, latency, persona.
 */

export type TranscriptRole = "user" | "assistant"

export interface TranscriptChunk {
  chunk_id: string
  session_id: string
  role: TranscriptRole
  text: string
  is_final: boolean
  source: string
  created_at?: string
}

export interface VoiceSession {
  session_id: string
  user_id: string
  conversation_id: string | null
  started_at: string
  ended_at: string | null
  status: "active" | "ended"
}

export type EventSource =
  | "mdp_device"
  | "mas_task"
  | "tool_completion"
  | "crep"
  | "nlm"
  | "mycorrhizae"
  | "system"

export interface SpeechworthyEvent {
  event_id: string
  session_id: string
  source: EventSource
  summary: string
  urgency: number
  speech_worthy: boolean
  created_at?: string
}

export interface LatencyTrace {
  trace_id: string
  session_id: string
  stage: string
  latency_ms: number
  created_at?: string
}

export interface PersonaState {
  session_id: string
  rewrite_count: number
  last_applied_at: string | null
}

export interface V9WsMessage {
  type: string
  session_id?: string
  message?: string
  timestamp?: string
  [key: string]: unknown
}
