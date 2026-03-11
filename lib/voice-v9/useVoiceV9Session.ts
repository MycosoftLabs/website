"use client"

/**
 * Voice v9 session hook - March 2, 2026.
 * Manages v9 WebSocket connection, session lifecycle, and stream state.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { getV9RestBase, getV9WsUrl } from "./voiceV9Client"
import type { TranscriptChunk, SpeechworthyEvent, LatencyTrace, PersonaState } from "./types"

interface InterruptState {
  is_speaking: boolean
  has_interrupted_draft: boolean
  interrupted_draft_text: string | null
  barge_in_count: number
  state: string
}

interface UseVoiceV9SessionOptions {
  userId?: string
  conversationId?: string | null
  onError?: (err: string) => void
}

interface UseVoiceV9SessionReturn {
  connected: boolean
  sessionId: string | null
  transcripts: TranscriptChunk[]
  events: SpeechworthyEvent[]
  latencyTraces: LatencyTrace[]
  personaState: PersonaState | null
  interruptState: InterruptState | null
  createSession: () => Promise<void>
  endSession: () => Promise<void>
  sendTranscript: (text: string, isFinal?: boolean) => void
  requestBargeIn: (userInput?: string) => void
  refreshInterrupt: () => void
  refreshPersona: () => void
}

export function useVoiceV9Session(
  options: UseVoiceV9SessionOptions = {}
): UseVoiceV9SessionReturn {
  const { userId = "morgan", conversationId, onError } = options
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([])
  const [events, setEvents] = useState<SpeechworthyEvent[]>([])
  const [latencyTraces, setLatencyTraces] = useState<LatencyTrace[]>([])
  const [personaState, setPersonaState] = useState<PersonaState | null>(null)
  const [interruptState, setInterruptState] = useState<InterruptState | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const onErrorRef = useRef<typeof onError>(onError)
  onErrorRef.current = onError

  const send = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }, [])

  const createSession = useCallback(async (overrideConversationId?: string) => {
    send({
      type: "create_session",
      user_id: userId,
      conversation_id: overrideConversationId ?? conversationId ?? null,
    })
  }, [send, userId, conversationId])

  const endSession = useCallback(async () => {
    const sid = sessionIdRef.current
    if (sid) {
      send({ type: "end_session", session_id: sid })
      sessionIdRef.current = null
      setSessionId(null)
    }
  }, [send])

  const sendTranscript = useCallback(
    (text: string, isFinal = true) => {
      const sid = sessionIdRef.current
      if (!sid) return
      const nowIso = new Date().toISOString()
      setTranscripts((prev) => [
        ...prev.slice(-199),
        {
          chunk_id: `local-user-${Date.now()}`,
          session_id: sid,
          role: "user",
          text,
          is_final: isFinal,
          source: "browser_stt",
          created_at: nowIso,
        },
      ])
      send({
        type: "transcript",
        session_id: sid,
        text,
        role: "user",
        is_final: isFinal,
        source: "browser_stt",
      })
    },
    [send]
  )

  const requestBargeIn = useCallback(
    (userInput?: string) => {
      send({ type: "barge_in", session_id: sessionIdRef.current, user_input: userInput })
    },
    [send]
  )

  const refreshInterrupt = useCallback(() => {
    send({ type: "get_interrupt", session_id: sessionIdRef.current })
  }, [send])

  const refreshPersona = useCallback(() => {
    send({ type: "get_persona", session_id: sessionIdRef.current })
  }, [send])

  useEffect(() => {
    let cancelled = false
    let ws: WebSocket | null = null

    const connect = async () => {
      try {
        const res = await fetch(`${getV9RestBase()}/health`, {
          method: "GET",
          cache: "no-store",
        })
        if (!res.ok) {
          onErrorRef.current?.("v9 backend unavailable (not deployed on MAS)")
          return
        }
      } catch {
        onErrorRef.current?.("v9 backend unavailable (health probe failed)")
        return
      }

      if (cancelled) return
      ws = new WebSocket(getV9WsUrl())
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        sessionIdRef.current = null
        setSessionId(null)
      }
      ws.onerror = () => onErrorRef.current?.("WebSocket error")

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as Record<string, unknown>
          const type = data.type as string

          if (type === "session_created") {
            const sid = data.session_id as string
            sessionIdRef.current = sid
            setSessionId(sid)
          } else if (type === "transcript_ack") {
            // Optional: could add optimistic transcript to local state
          } else if (type === "assistant_text") {
            const sid = String(data.session_id ?? sessionIdRef.current ?? "")
            const text = String(data.text ?? "")
            if (sid && text) {
              setTranscripts((prev) => [
                ...prev.slice(-199),
                {
                  chunk_id: `remote-assistant-${Date.now()}`,
                  session_id: sid,
                  role: "assistant",
                  text,
                  is_final: true,
                  source: String(data.provider ?? "voice_v9"),
                  created_at: new Date().toISOString(),
                },
              ])
            }
          } else if (type === "session_ended") {
            sessionIdRef.current = null
            setSessionId(null)
          } else if (type === "interrupt_state") {
            setInterruptState({
              is_speaking: !!data.is_speaking,
              has_interrupted_draft: !!data.has_interrupted_draft,
              interrupted_draft_text: (data.interrupted_draft_text as string) ?? null,
              barge_in_count: (data.barge_in_count as number) ?? 0,
              state: (data.state as string) ?? "idle",
            })
          } else if (type === "persona_state") {
            setPersonaState({
              session_id: (data.session_id as string) ?? "",
              rewrite_count: (data.rewrite_count as number) ?? 0,
              last_applied_at: (data.last_applied_at as string) ?? null,
            })
          } else if (type === "error") {
            onErrorRef.current?.(String(data.message ?? "Unknown error"))
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      ws?.close()
      wsRef.current = null
    }
  }, [])

  return {
    connected,
    sessionId,
    transcripts,
    events,
    latencyTraces,
    personaState,
    interruptState,
    createSession,
    endSession,
    sendTranscript,
    requestBargeIn,
    refreshInterrupt,
    refreshPersona,
  }
}
