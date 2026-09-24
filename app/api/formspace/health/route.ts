import { NextResponse } from "next/server"
import { localEngineHealth } from "@/lib/formspace/engine"
import { proxyFormSpace } from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/formspace/health
 */
export async function GET() {
  const local = localEngineHealth()
  try {
    const res = await proxyFormSpace("/api/formspace/health")
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.engine) {
      return NextResponse.json({
        ...data,
        mas_reachable: true,
        local_engine: local,
      })
    }
  } catch {
    // local only
  }
  return NextResponse.json({
    ...local,
    mas_reachable: false,
    status: "healthy",
  })
}
