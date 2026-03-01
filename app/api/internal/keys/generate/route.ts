/**
 * Internal keys API – generate keys for an environment.
 * POST body: { "env": "dev" | "test" | "sandbox" }. Creates new keys and persists.
 * Requires INTERNAL_KEYS_ADMIN_SECRET.
 * NO MOCK DATA – generates and stores real keys only.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateAndSaveKeysForEnv, type EnvironmentName } from "@/lib/internal-keys/store"

export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_KEYS_ADMIN_SECRET
  if (!secret) {
    return process.env.NODE_ENV === "development"
  }
  const header = request.headers.get("X-Internal-Keys-Secret") ?? request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
  return header === secret
}

const VALID_ENVS: EnvironmentName[] = ["dev", "test", "sandbox"]

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: { env?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 })
  }
  const env = (body.env ?? "dev").toLowerCase()
  if (!VALID_ENVS.includes(env as EnvironmentName)) {
    return NextResponse.json({ error: `env must be one of: ${VALID_ENVS.join(", ")}` }, { status: 400 })
  }
  try {
    const keys = await generateAndSaveKeysForEnv(env as EnvironmentName)
    return NextResponse.json({
      env,
      keys: {
        MINDEX_API_KEY: keys.MINDEX_API_KEY,
        MYCORRHIZAE_PUBLISH_KEY: keys.MYCORRHIZAE_PUBLISH_KEY,
        MYCORRHIZAE_ADMIN_KEY: keys.MYCORRHIZAE_ADMIN_KEY,
      },
      updatedAt: keys.updatedAt,
      envSnippet: [
        `MINDEX_API_KEY=${keys.MINDEX_API_KEY}`,
        `MYCORRHIZAE_PUBLISH_KEY=${keys.MYCORRHIZAE_PUBLISH_KEY}`,
        `MYCORRHIZAE_ADMIN_KEY=${keys.MYCORRHIZAE_ADMIN_KEY}`,
      ].join("\n"),
    })
  } catch (e) {
    console.error("[internal/keys/generate]", e)
    return NextResponse.json({ error: "Failed to generate keys" }, { status: 500 })
  }
}
