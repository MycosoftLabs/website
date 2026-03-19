import { NextResponse } from "next/server"

const MAS = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  try {
    const r = await fetch(
      `${MAS}/api/plasticity/psilo/session/${encodeURIComponent(sessionId)}/kill`,
      { method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000) }
    )
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
