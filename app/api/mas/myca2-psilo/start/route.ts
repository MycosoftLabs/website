import { NextRequest, NextResponse } from "next/server"

const MAS = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const r = await fetch(`${MAS}/api/plasticity/psilo/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch (e) {
    return NextResponse.json(
      { error: "MAS unreachable", detail: String(e) },
      { status: 502 }
    )
  }
}
