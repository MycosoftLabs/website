import { NextRequest, NextResponse } from "next/server"
import {
  masServiceHeaders,
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from "@/lib/auth/verified-identity"

const MAS_API_URL = process.env.MAS_API_URL || process.env.MAS_ORCHESTRATOR_URL || "http://localhost:8001"

function sanitizePath(path: string): string | null {
  if (!path.startsWith("/api/memory/") && !path.startsWith("/api/security/audit/query")) {
    return null
  }
  if (path.includes("://") || path.includes("..")) return null
  return path
}

async function requirePrivilegedProxy() {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  return { identity, authError }
}

export async function GET(request: NextRequest) {
  const { authError } = await requirePrivilegedProxy()
  if (authError) return authError

  const path = sanitizePath(request.nextUrl.searchParams.get("path") || "")
  if (!path) return NextResponse.json({ error: "Unsupported MAS memory path" }, { status: 400 })

  const response = await fetch(`${MAS_API_URL}${path}`, {
    method: "GET",
    headers: masServiceHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })

  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
  })
}

export async function POST(request: NextRequest) {
  const { identity, authError } = await requirePrivilegedProxy()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const path = sanitizePath(String(body.path || ""))
  if (!path) return NextResponse.json({ error: "Unsupported MAS memory path" }, { status: 400 })

  const response = await fetch(`${MAS_API_URL}${path}`, {
    method: "POST",
    headers: masServiceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ...(body.payload || {}),
      authorized_by: identity.userId,
      auth_trust_level: identity.authTrustLevel,
    }),
    signal: AbortSignal.timeout(10000),
  })

  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
  })
}
