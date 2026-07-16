/**
 * DocuSign BFF — proxies to MAS /api/docusign/* (server-side only).
 * Never exposes DOCUSIGN_INTEGRATION_KEY or RSA material to the browser.
 *
 * GET  /api/docusign/health
 * GET  /api/docusign/packs
 * GET  /api/docusign/envelopes/:id
 * POST /api/docusign/envelopes
 * POST /api/docusign/envelopes/cmmc
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function masBase(): string {
  return (
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"
  ).replace(/\/$/, "")
}

async function proxyToMas(
  path: string,
  init?: RequestInit
): Promise<NextResponse> {
  const url = `${masBase()}${path}`
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    })
    const text = await res.text()
    let body: unknown = text
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      body = { raw: text.slice(0, 500) }
    }
    return NextResponse.json(body, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "MAS unreachable"
    return NextResponse.json(
      { status: "error", error: "mas_proxy_failed", message },
      { status: 502 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action") || "health"
  const envelopeId = searchParams.get("envelopeId")

  if (action === "packs") {
    return proxyToMas("/api/docusign/packs")
  }
  if (action === "envelope" && envelopeId) {
    return proxyToMas(`/api/docusign/envelopes/${encodeURIComponent(envelopeId)}`)
  }
  return proxyToMas("/api/docusign/health")
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action") || "envelopes"
  const bodyText = await request.text()

  if (action === "cmmc") {
    return proxyToMas("/api/docusign/envelopes/cmmc", {
      method: "POST",
      body: bodyText || "{}",
    })
  }
  return proxyToMas("/api/docusign/envelopes", {
    method: "POST",
    body: bodyText || "{}",
  })
}
