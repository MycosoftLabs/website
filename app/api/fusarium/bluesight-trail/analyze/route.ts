import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const SIDECAR = process.env.TRAIL_AR_SIDECAR_URL || "http://127.0.0.1:8767"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(`${SIDECAR}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        {
          live: false,
          detector: { status: "SIDECAR_UNBOUND", detections: [], model_name: null },
          error: json.error || res.statusText,
          forecast_p: null,
        },
        { status: 200 },
      )
    }
    return NextResponse.json({
      live: false,
      forecast_p: null,
      detector: {
        status: "INFERRED",
        model_name: json.model_name ?? "YOLO26",
        tiles: json.tiles ?? null,
        threshold: json.threshold ?? null,
        detections: json.detections ?? [],
      },
    })
  } catch {
    return NextResponse.json({
      live: false,
      forecast_p: null,
      detector: {
        status: "SIDECAR_UNBOUND",
        detections: [],
        model_name: null,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}
