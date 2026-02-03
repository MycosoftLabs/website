/**
 * PersonaPlex WebSocket Protocol v1.0.0
 * 
 * This module defines the versioned WebSocket protocol for PersonaPlex communication.
 * All clients and servers MUST implement protocol handshake and version validation.
 * 
 * Created: February 3, 2026
 * 
 * ARCHITECTURE PRINCIPLE:
 * - Version mismatch = hard disconnect (no silent degradation)
 * - All messages are typed and validated
 * - Protocol version logged in telemetry for debugging
 */

// ============================================================================
// Protocol Version
// ============================================================================

export const PROTOCOL_VERSION = "1.0.0"
export const PROTOCOL_NAME = "personaplex-ws"

// Minimum compatible version (for future backward compatibility)
export const MIN_COMPATIBLE_VERSION = "1.0.0"

// ============================================================================
// Handshake Types
// ============================================================================

/**
 * Client → Server: Initial handshake
 * Sent immediately after WebSocket connection opens
 */
export interface ProtocolHandshake {
  type: "hello"
  protocol: typeof PROTOCOL_NAME
  version: string
  capabilities: {
    audio_in: boolean      // Client can send audio
    audio_out: boolean     // Client can receive audio
    text_stream: boolean   // Client supports text streaming
    stats: boolean         // Client wants stats updates
  }
  session: {
    conversation_id: string
    persona_id: string
    voice_prompt_hash: string   // SHA-256 hash for security
    user_id?: string            // Optional user identification
  }
  client_info?: {
    platform: string           // "web" | "mobile" | "desktop"
    user_agent?: string
    timestamp: string
  }
}

/**
 * Server → Client: Handshake acknowledgment
 * Sent in response to client hello
 */
export interface ProtocolAck {
  type: "ack"
  protocol: typeof PROTOCOL_NAME
  version: string
  audio: {
    codec: "opus" | "pcm"
    sample_rate: number        // e.g., 24000
    channels: number           // 1 = mono, 2 = stereo
    frame_duration_ms: number  // e.g., 20, 40, 60
  }
  limits: {
    max_chunk_ms: number       // Maximum audio chunk duration
    target_rtf: number         // Target Real-Time Factor (e.g., 0.7)
    max_message_size: number   // Max bytes per message
  }
  session: {
    session_id: string
    started_at: string
  }
}

/**
 * Server → Client: Version mismatch error
 * Connection should be closed after this
 */
export interface ProtocolVersionError {
  type: "version_error"
  client_version: string
  server_version: string
  min_supported: string
  message: string
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Audio input from user microphone
 * Binary format: 0x01 + opus/pcm data
 */
export interface AudioInMessage {
  type: "audio_in"
  seq: number                  // Sequence number for ordering
  timestamp_ms: number         // Client timestamp
  duration_ms: number          // Audio duration
  format: "opus" | "pcm"
  data_base64: string          // Base64-encoded audio
}

/**
 * Audio output from agent
 * Binary format: 0x01 + opus/pcm data
 */
export interface AudioOutMessage {
  type: "audio_out"
  seq: number
  timestamp_ms: number
  duration_ms: number
  format: "opus"
  data_base64: string
  generation_ms?: number       // Time to generate (for RTF calculation)
}

/**
 * Partial agent text (streaming)
 */
export interface AgentTextPartial {
  type: "agent_text_partial"
  text: string
  seq: number
}

/**
 * Final agent text (complete utterance)
 */
export interface AgentTextFinal {
  type: "agent_text_final"
  text: string
  seq: number
  duration_ms: number          // Total processing time
}

/**
 * User transcript (from STT)
 */
export interface UserTranscript {
  type: "user_transcript"
  text: string
  is_final: boolean
  confidence?: number
  seq: number
}

/**
 * Stats update from server
 */
export interface StatsMessage {
  type: "stats"
  latency_ms: number
  buffer_ms: number
  rtf: number                  // Real-Time Factor
  rtf_avg_5s: number           // 5-second rolling average
  dropped_frames: number
  status: "healthy" | "warning" | "critical"
  timestamp: string
}

/**
 * Error message
 */
export interface ErrorMessage {
  type: "error"
  code: string
  message: string
  recoverable: boolean
}

/**
 * Session ended
 */
export interface SessionEndMessage {
  type: "session_end"
  reason: "user_disconnect" | "timeout" | "error" | "server_shutdown"
  duration_ms: number
  stats_summary: {
    total_audio_in_ms: number
    total_audio_out_ms: number
    total_messages: number
    avg_rtf: number
  }
}

// ============================================================================
// Union Types
// ============================================================================

export type ClientMessage = 
  | ProtocolHandshake
  | AudioInMessage
  | { type: "ping" }
  | { type: "disconnect" }

export type ServerMessage =
  | ProtocolAck
  | ProtocolVersionError
  | AudioOutMessage
  | AgentTextPartial
  | AgentTextFinal
  | UserTranscript
  | StatsMessage
  | ErrorMessage
  | SessionEndMessage
  | { type: "pong" }

export type ProtocolMessage = ClientMessage | ServerMessage

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a version is compatible with the current protocol
 */
export function isVersionCompatible(version: string): boolean {
  const [major, minor] = version.split(".").map(Number)
  const [minMajor, minMinor] = MIN_COMPATIBLE_VERSION.split(".").map(Number)
  
  if (major > minMajor) return true
  if (major < minMajor) return false
  return minor >= minMinor
}

/**
 * Create a client handshake message
 */
export function createHandshake(options: {
  conversationId: string
  personaId: string
  voicePromptHash: string
  userId?: string
  capabilities?: Partial<ProtocolHandshake["capabilities"]>
}): ProtocolHandshake {
  return {
    type: "hello",
    protocol: PROTOCOL_NAME,
    version: PROTOCOL_VERSION,
    capabilities: {
      audio_in: true,
      audio_out: true,
      text_stream: true,
      stats: true,
      ...options.capabilities,
    },
    session: {
      conversation_id: options.conversationId,
      persona_id: options.personaId,
      voice_prompt_hash: options.voicePromptHash,
      user_id: options.userId,
    },
    client_info: {
      platform: typeof window !== "undefined" ? "web" : "server",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Validate a server acknowledgment
 */
export function validateAck(ack: unknown): ack is ProtocolAck {
  if (!ack || typeof ack !== "object") return false
  const a = ack as Record<string, unknown>
  
  return (
    a.type === "ack" &&
    a.protocol === PROTOCOL_NAME &&
    typeof a.version === "string" &&
    isVersionCompatible(a.version as string)
  )
}

/**
 * Check if a message is a version error
 */
export function isVersionError(msg: unknown): msg is ProtocolVersionError {
  if (!msg || typeof msg !== "object") return false
  return (msg as Record<string, unknown>).type === "version_error"
}

/**
 * Serialize a message for WebSocket transmission
 */
export function serializeMessage(msg: ClientMessage): string {
  return JSON.stringify(msg)
}

/**
 * Parse a message from WebSocket
 */
export function parseMessage(data: string | ArrayBuffer): ServerMessage | null {
  try {
    if (typeof data === "string") {
      return JSON.parse(data) as ServerMessage
    }
    // Binary data - check first byte for type
    const view = new Uint8Array(data as ArrayBuffer)
    if (view[0] === 0x01) {
      // Audio data - would need to decode based on protocol
      return null // Handle binary audio separately
    }
    // Try to parse as JSON
    const text = new TextDecoder().decode(view)
    return JSON.parse(text) as ServerMessage
  } catch {
    return null
  }
}

// ============================================================================
// Binary Message Helpers
// ============================================================================

/**
 * Audio message binary prefix
 */
export const AUDIO_PREFIX = 0x01

/**
 * Text injection prefix (for Moshi)
 */
export const TEXT_INJECT_PREFIX = 0x02

/**
 * Create binary audio message
 */
export function createAudioMessage(audioData: Uint8Array): Uint8Array {
  const result = new Uint8Array(1 + audioData.length)
  result[0] = AUDIO_PREFIX
  result.set(audioData, 1)
  return result
}

/**
 * Create text injection message
 */
export function createTextInjectMessage(text: string): Uint8Array {
  const encoder = new TextEncoder()
  const textBytes = encoder.encode(text)
  const result = new Uint8Array(1 + textBytes.length)
  result[0] = TEXT_INJECT_PREFIX
  result.set(textBytes, 1)
  return result
}

/**
 * Parse binary message type
 */
export function parseBinaryMessageType(data: ArrayBuffer): "audio" | "text" | "unknown" {
  const view = new Uint8Array(data)
  if (view.length === 0) return "unknown"
  
  switch (view[0]) {
    case AUDIO_PREFIX: return "audio"
    case TEXT_INJECT_PREFIX: return "text"
    default: return "unknown"
  }
}
