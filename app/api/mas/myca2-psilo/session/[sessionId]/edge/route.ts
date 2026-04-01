import { NextRequest, NextResponse } from "next/server"

const MAS = process.env.MAS_API_URL || "http://localhost:8001"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  try {
    const body = await req.json()
    const r = await fetch(
      `${MAS}/api/plasticity/psilo/session/${encodeURIComponent(sessionId)}/edge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    )
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
