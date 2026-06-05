import { type NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

async function fetchAnnotationTarget(blobId: string, suffix: "wave-annotations" | "wave-annotation") {
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

  let upstream = await fetchAnnotationTarget(blobId, "wave-annotations").catch((error) => {
    console.error("[mindex-library] wave annotation read failed", error)
    return null
  })

  if (upstream?.status === 404) {
    await upstream.body?.cancel().catch(() => undefined)
    upstream = await fetchAnnotationTarget(blobId, "wave-annotation").catch((error) => {
      console.error("[mindex-library] wave annotation read fallback failed", error)
      return null
    })
  }

  if (!upstream) {
    return NextResponse.json({ error: "Wave notes could not be loaded yet." }, { status: 502 })
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
    return NextResponse.json({ error: "Invalid wave annotation payload." }, { status: 400 })
  }

  const blobId = stringField(payload, "blob_id") || request.nextUrl.searchParams.get("id")?.trim() || ""
  const selection = payload.selection
  const markers = payload.markers
  const scope = payload.scope
  const hasSelection = selection && typeof selection === "object" && !Array.isArray(selection)
  const hasMarkers = Array.isArray(markers) && markers.length > 0
  const hasScope = scope && typeof scope === "object" && !Array.isArray(scope)

  if (!blobId) {
    return NextResponse.json({ error: "Missing acoustic file id." }, { status: 400 })
  }

  if (!hasSelection && !hasMarkers && !hasScope) {
    return NextResponse.json({ error: "Select a wave region or add at least one marker before saving." }, { status: 400 })
  }

  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = `${base}/api/mindex/library/blobs/${encodeURIComponent(blobId)}/wave-annotation`

  const upstream = await fetchMindexWithAuthRetry(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, blob_id: blobId }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  }).catch((error) => {
    console.error("[mindex-library] wave annotation save failed", error)
    return null
  })

  if (!upstream) {
    return NextResponse.json({ error: "Wave notes could not be saved yet." }, { status: 502 })
  }

  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  })
}
