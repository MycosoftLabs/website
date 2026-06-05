import { type NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

async function fetchHumanTarget(blobId: string, suffix: "human-identifications" | "human-identification") {
  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = `${base}/api/mindex/library/blobs/${encodeURIComponent(blobId)}/${suffix}`
  return fetchMindexWithAuthRetry(target, {
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  })
}

export async function GET(request: NextRequest) {
  const blobId = request.nextUrl.searchParams.get("id")?.trim() || ""

  if (!blobId) {
    return NextResponse.json({ error: "Missing acoustic file id." }, { status: 400 })
  }

  let upstream = await fetchHumanTarget(blobId, "human-identifications").catch((error) => {
    console.error("[mindex-library] human identification read failed", error)
    return null
  })

  if (upstream?.status === 404) {
    await upstream.body?.cancel().catch(() => undefined)
    upstream = await fetchHumanTarget(blobId, "human-identification").catch((error) => {
      console.error("[mindex-library] human identification read fallback failed", error)
      return null
    })
  }

  if (!upstream) {
    return NextResponse.json({ error: "Human identifications could not be loaded yet." }, { status: 502 })
  }

  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  })
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>
  try {
    const body = await request.json()
    payload = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  } catch {
    return NextResponse.json({ error: "Invalid human identification payload." }, { status: 400 })
  }

  const blobId = stringField(payload, "blob_id") || request.nextUrl.searchParams.get("id")?.trim() || ""
  const humanLabel = stringField(payload, "human_label")

  if (!blobId) {
    return NextResponse.json({ error: "Missing acoustic file id." }, { status: 400 })
  }

  if (!humanLabel) {
    return NextResponse.json({ error: "Missing human sound label." }, { status: 400 })
  }

  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = `${base}/api/mindex/library/blobs/${encodeURIComponent(blobId)}/human-identification`

  const upstream = await fetchMindexWithAuthRetry(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, blob_id: blobId, human_label: humanLabel }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  }).catch((error) => {
    console.error("[mindex-library] human identification save failed", error)
    return null
  })

  if (!upstream) {
    return NextResponse.json({ error: "Human identification save could not be reached." }, { status: 502 })
  }

  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  })
}
