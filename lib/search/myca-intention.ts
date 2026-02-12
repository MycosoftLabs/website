/**
 * MYCA Intention Client - Send interaction events to MAS intention API
 * Created: Feb 12, 2026
 */

export type IntentionEventType =
  | "search"
  | "click"
  | "focus"
  | "note"
  | "voice"
  | "navigate"
  | "hover"

export interface IntentionContext {
  current_query?: string
  focused_widget?: string
  recent_interactions?: string[]
  [key: string]: unknown
}

export interface IntentionEvent {
  session_id: string
  event_type: IntentionEventType
  data: Record<string, unknown>
  context?: IntentionContext
  timestamp?: string
}

export interface IntentionResponse {
  success: boolean
  session_id: string
  event_count: number
  suggested_widgets: string[]
  suggested_queries: string[]
  insights: Record<string, unknown>
}

/**
 * Send an intention event to the MAS intention API via the website proxy.
 */
export async function sendIntentionEvent(event: IntentionEvent): Promise<IntentionResponse | null> {
  try {
    const res = await fetch("/api/myca/intention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
