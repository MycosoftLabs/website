/**
 * Voice v9 API client - March 2, 2026.
 * REST base URL and fetch helpers. Uses website proxy /api/test-voice/mas/voice-v9.
 */

const V9_BASE = "/api/test-voice/mas/voice-v9"

function masWsUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_MAS_API_URL || "http://localhost:8001"
  const wsBase = base.replace(/^http/, "ws")
  return `${wsBase.replace(/\/$/, "")}/ws/voice/v9`
}

export function getV9WsUrl(): string {
  return masWsUrl()
}

export function getV9RestBase(): string {
  return V9_BASE
}

export async function v9Fetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${V9_BASE}/${path.replace(/^\//, "")}`
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`v9 API error ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

export async function createV9Session(userId = "morgan", conversationId?: string) {
  return v9Fetch<{ session_id: string; conversation_id: string | null }>(
    "sessions",
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId, conversation_id: conversationId ?? null }),
    }
  )
}

export async function endV9Session(sessionId: string) {
  return v9Fetch<{ status: string }>(`sessions/${sessionId}/end`, {
    method: "POST",
  })
}

export async function getV9Transcripts(sessionId: string, limit = 100) {
  return v9Fetch<unknown[]>(`sessions/${sessionId}/transcripts?limit=${limit}`)
}

export async function getV9Events(sessionId: string, limit = 50) {
  return v9Fetch<unknown[]>(`sessions/${sessionId}/events?limit=${limit}`)
}

export async function getV9Latency(sessionId: string) {
  return v9Fetch<{ traces: unknown[] }>(`sessions/${sessionId}/latency`)
}

export async function getV9Persona(sessionId: string) {
  return v9Fetch<{ rewrite_count: number; last_applied_at: string | null }>(
    `sessions/${sessionId}/persona`
  )
}
