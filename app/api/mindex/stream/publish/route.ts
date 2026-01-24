import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { publishToChannel, type SSEPublishEvent } from "@/lib/mindex/streaming/sse-manager"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const configured = process.env.MYCORRHIZAE_PUBLISH_KEY
  if (!configured) return false
  const provided = request.headers.get("x-mycorrhizae-key")
  return Boolean(provided && provided === configured)
}

export async function POST(request: Request) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED", requiredHeader: "x-mycorrhizae-key" },
      { status: 401 },
    )
  }

  let body: SSEPublishEvent
  try {
    body = (await request.json()) as SSEPublishEvent
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  if (!body?.channel || !body?.event) {
    return NextResponse.json({ error: "Missing required fields: channel, event", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const result = publishToChannel(body)
  return NextResponse.json({ ok: true, ...result })
}

