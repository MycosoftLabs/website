import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface AgentTaskBody {
  message: string
  task_type?: string
  params?: Record<string, unknown>
  user_subject?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { deviceId } = await params
  let body: AgentTaskBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${MAS_API_URL}/api/devices/${encodeURIComponent(deviceId)}/agent/task`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: body.message,
          task_type: body.task_type || "chat",
          params: body.params || {},
          user_subject: body.user_subject || auth.user?.email || "website-console",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      }
    )
    const text = await res.text()
    let result: unknown = text
    try {
      result = text ? JSON.parse(text) : {}
    } catch {
      result = { raw: text }
    }
    if (!res.ok) {
      return NextResponse.json(
        { success: false, device_id: deviceId, error: result },
        { status: res.status }
      )
    }
    return NextResponse.json({ success: true, device_id: deviceId, ...(result as object) })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        device_id: deviceId,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    )
  }
}
