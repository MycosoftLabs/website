import { NextResponse } from "next/server"
import { formspaceDemoPayload } from "@/lib/formspace/demo-catalog"
import {
  proxyFormSpace,
  resolveFormSpaceUser,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/formspace/demo — logged-out demo catalog (registry rows).
 * Falls back to website canonical catalog when MAS FormSpace is not yet deployed.
 */
export async function GET() {
  const user = await resolveFormSpaceUser()
  const fallback = {
    ...formspaceDemoPayload(),
    auth: { logged_in: !!user, user_id: user?.id ?? null },
  }
  try {
    const res = await proxyFormSpace("/api/formspace/demo")
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !Array.isArray(data?.charts) || data.charts.length === 0) {
      return NextResponse.json({
        ...fallback,
        mas_source: false,
        mas_status: res.status,
      })
    }
    return NextResponse.json({
      ...data,
      auth: { logged_in: !!user, user_id: user?.id ?? null },
      mas_source: true,
    })
  } catch {
    return NextResponse.json({
      ...fallback,
      mas_source: false,
    })
  }
}
