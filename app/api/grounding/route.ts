/**
 * Grounding API Route
 *
 * Proxies grounding data from MAS and MINDEX for the grounding dashboard.
 * Fetches status from MAS, experience packets and thought objects from MINDEX.
 * Created: March 5, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY

interface GroundingStatus {
  enabled: boolean
  timestamp: string
  thought_count: number
  last_ep_id: string | null
}

interface ExperiencePacket {
  id: string
  session_id: string | null
  user_id: string | null
  ground_truth: Record<string, unknown>
  self_state: Record<string, unknown> | null
  world_state: Record<string, unknown> | null
  observation: Record<string, unknown> | null
  uncertainty: Record<string, unknown> | null
  provenance: Record<string, unknown> | null
  created_at: string | null
}

interface ThoughtObject {
  id: string
  ep_id: string | null
  session_id: string | null
  claim: string
  type: string
  evidence_links: unknown[] | null
  confidence: number | null
  predicted_outcomes: Record<string, unknown> | null
  risks: Record<string, unknown> | null
  created_at: string | null
}

interface GroundingResponse {
  status: GroundingStatus
  experiencePackets: ExperiencePacket[]
  thoughtObjects: ThoughtObject[]
  error?: string
}

function getMindexHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (MINDEX_API_KEY) {
    headers["X-API-Key"] = MINDEX_API_KEY
  }
  return headers
}

/**
 * GET /api/grounding
 *
 * Returns combined grounding status, experience packets, and thought objects
 * for the grounding dashboard. Proxies to MAS and MINDEX.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id") || undefined
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)

  const response: GroundingResponse = {
    status: {
      enabled: false,
      timestamp: new Date().toISOString(),
      thought_count: 0,
      last_ep_id: null,
    },
    experiencePackets: [],
    thoughtObjects: [],
  }

  try {
    const epsParams = new URLSearchParams()
    if (sessionId) epsParams.set("session_id", sessionId)
    epsParams.set("limit", String(limit))
    const epsUrl = `${MINDEX_API_URL}/api/mindex/grounding/experience-packets?${epsParams}`

    const thoughtsParams = new URLSearchParams()
    if (sessionId) thoughtsParams.set("session_id", sessionId)
    thoughtsParams.set("limit", String(limit))
    const thoughtsUrl = `${MINDEX_API_URL}/api/mindex/grounding/thought-objects?${thoughtsParams}`

    const [statusRes, epsRes, thoughtsRes] = await Promise.allSettled([
      fetch(`${MAS_API_URL}/api/myca/grounding/status`, { next: { revalidate: 10 } }),
      fetch(epsUrl, {
        headers: getMindexHeaders(),
        next: { revalidate: 5 },
      }),
      fetch(thoughtsUrl, {
        headers: getMindexHeaders(),
        next: { revalidate: 5 },
      }),
    ])

    if (statusRes.status === "fulfilled" && statusRes.value.ok) {
      const data = await statusRes.value.json()
      response.status = {
        enabled: data.enabled ?? false,
        timestamp: data.timestamp ?? response.status.timestamp,
        thought_count: data.thought_count ?? 0,
        last_ep_id: data.last_ep_id ?? null,
      }
    }

    if (epsRes.status === "fulfilled" && epsRes.value.ok) {
      response.experiencePackets = (await epsRes.value.json()) as ExperiencePacket[]
    }

    if (thoughtsRes.status === "fulfilled" && thoughtsRes.value.ok) {
      response.thoughtObjects = (await thoughtsRes.value.json()) as ThoughtObject[]
    }

    return NextResponse.json(response)
  } catch (err) {
    response.error = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(response, { status: 200 })
  }
}
