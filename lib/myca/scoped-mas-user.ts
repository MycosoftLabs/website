import { NextRequest, NextResponse } from "next/server"
import {
  masServiceHeaders,
  resolveScopedUserId,
  resolveVerifiedIdentity,
  type VerifiedIdentity,
} from "@/lib/auth/verified-identity"

export function masHttpBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_MAS_API_URL || process.env.MAS_API_URL || "http://localhost:8001").replace(/\/$/, "")
}

export function masOrchestratorBaseUrl(): string {
  return (process.env.MAS_ORCHESTRATOR_URL || process.env.MAS_API_URL || "http://localhost:8001").replace(/\/$/, "")
}

export function masJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...masServiceHeaders(),
  }
}

/**
 * Resolves a caller-supplied or path-derived user id against verified Supabase identity.
 * Cross-tenant access requires owner or superuser (see resolveScopedUserId).
 */
export async function assertScopedMasUserId(requestedUserId?: string | null): Promise<
  | { denied: NextResponse }
  | { identity: VerifiedIdentity; scopedUserId: string }
> {
  const identity = await resolveVerifiedIdentity()
  const scoped = resolveScopedUserId(identity, requestedUserId ?? undefined)
  if (scoped.denied) return { denied: scoped.denied }
  return { identity, scopedUserId: scoped.userId }
}

/**
 * Builds a MAS MYCA consciousness GET URL with server-scoped user_id and optional session params.
 */
export async function buildConsciousnessMasGetUrl(
  request: NextRequest,
  masPath: string
): Promise<{ denied: NextResponse } | { url: string; headers: HeadersInit }> {
  const { searchParams } = new URL(request.url)
  const requested = searchParams.get("user_id")
  const scoped = await assertScopedMasUserId(requested)
  if ("denied" in scoped) return { denied: scoped.denied }

  const url = new URL(`${masHttpBaseUrl()}${masPath.startsWith("/") ? masPath : `/${masPath}`}`)
  url.searchParams.set("user_id", scoped.scopedUserId)
  for (const key of ["session_id", "conversation_id"] as const) {
    const v = searchParams.get(key)
    if (v) url.searchParams.set(key, v)
  }
  return { url: url.toString(), headers: masJsonHeaders() }
}
