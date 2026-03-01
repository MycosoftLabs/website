/**
 * Internal keys API – list available env keys (names only; no secret values).
 * GET: returns { envs: ["dev", "test", "sandbox"], hasKeys: { dev: true, ... } }.
 * Requires INTERNAL_KEYS_ADMIN_SECRET.
 */

import { NextRequest, NextResponse } from "next/server"
import { readStoredKeys } from "@/lib/internal-keys/store"

export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_KEYS_ADMIN_SECRET
  if (!secret) {
    return process.env.NODE_ENV === "development"
  }
  const header = request.headers.get("X-Internal-Keys-Secret") ?? request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
  return header === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const stored = await readStoredKeys()
    const envs = ["dev", "test", "sandbox"] as const
    const hasKeys = Object.fromEntries(envs.map((e) => [e, !!stored[e]]))
    return NextResponse.json({
      envs,
      hasKeys,
      usage: {
        getDev: "GET /api/internal/keys/dev",
        generate: "POST /api/internal/keys/generate with body { \"env\": \"dev\" | \"test\" | \"sandbox\" }",
      },
    })
  } catch (e) {
    console.error("[internal/keys]", e)
    return NextResponse.json({ error: "Failed to read keys store" }, { status: 500 })
  }
}
