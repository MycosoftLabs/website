import { NextRequest, NextResponse } from "next/server"
import { formspaceDemoPayload } from "@/lib/formspace/demo-catalog"
import {
  proxyFormSpace,
  resolveFormSpaceUser,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/formspace/atlas — demo + user charts (auth-aware).
 * POST /api/formspace/atlas — save chart (requires auth).
 */
export async function GET() {
  const user = await resolveFormSpaceUser()
  const demo = formspaceDemoPayload()
  try {
    const res = await proxyFormSpace("/api/formspace/atlas", {
      userId: user?.id,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !Array.isArray(data?.charts) || data.charts.length === 0) {
      return NextResponse.json({
        schema: "formspace.atlas/v1",
        charts: demo.charts,
        chart_count: demo.charts.length,
        auth: user ? "logged_in" : "logged_out",
        user: user ? { id: user.id, email: user.email } : null,
        mas_source: false,
        note: demo.note,
      })
    }
    return NextResponse.json({
      ...data,
      user: user ? { id: user.id, email: user.email } : null,
      mas_source: true,
    })
  } catch {
    return NextResponse.json({
      schema: "formspace.atlas/v1",
      charts: demo.charts,
      chart_count: demo.charts.length,
      auth: user ? "logged_in" : "logged_out",
      user: user ? { id: user.id, email: user.email } : null,
      mas_source: false,
      note: demo.note,
    })
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveFormSpaceUser()
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "auth_required",
        message: "Sign in to save FormSpace charts.",
      },
      { status: 401 },
    )
  }
  const body = await request.json().catch(() => ({}))
  try {
    const res = await proxyFormSpace("/api/formspace/atlas", {
      method: "POST",
      body: JSON.stringify(body),
      userId: user.id,
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 404) {
      return NextResponse.json(
        {
          ok: false,
          error: "engine_unavailable",
          message:
            "FormSpace engine not deployed on MAS yet. Charts cannot be persisted until /api/formspace is live on 188:8001.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unreachable",
      },
      { status: 502 },
    )
  }
}
