/**
 * Internal keys API – dev environment.
 * GET: return or create dev keys. Requires INTERNAL_KEYS_ADMIN_SECRET.
 * NO MOCK DATA – returns or generates real keys only.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getOrCreateKeysForEnv,
  generateAndSaveKeysForEnv,
  type EnvironmentName,
} from "@/lib/internal-keys/store"

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
    const keys = await getOrCreateKeysForEnv("dev")
    return NextResponse.json({
      env: "dev",
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
    console.error("[internal/keys/dev]", e)
    return NextResponse.json({ error: "Failed to get or create dev keys" }, { status: 500 })
  }
}
