import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { nlmVarFromStatus } from "@/lib/fusarium/scenario-sim/nlm-from-status"
import { buildFrame } from "@/lib/fusarium/scenario-sim/packet"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  const mas = (
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"
  ).replace(/\/$/, "")

  async function read(path: string) {
    try {
      const response = await fetch(`${mas}${path}`, { cache: "no-store", signal: AbortSignal.timeout(8000) })
      const data = await response.json().catch(() => null)
      return { ok: response.ok, data }
    } catch {
      return { ok: false, data: null }
    }
  }

  const health = await read("/api/nlm/health")
  const runtime = await read("/api/nlm/runtime")
  const weights = await read("/api/nlm/weights")
  const nlmStatus = {
    nlm: {
      model_loaded: health.ok ? Boolean(health.data?.model_loaded) : null,
      forecast_qualified: false,
      bound_to_ollama: false,
      model_name: health.data?.model_name,
      model_id: runtime.data?.model_id,
      model_dir: runtime.data?.model_dir || health.data?.model_dir,
      weights_sha256: health.data?.weights_sha256 || runtime.data?.weights_sha256 || null,
      p: null,
      qualification_status: health.data?.qualification_status || "UNQUALIFIED",
    },
    runtime: runtime.ok
      ? {
          model_id: runtime.data?.model_id,
          model_dir: runtime.data?.model_dir,
          tensor_count: runtime.data?.tensor_count,
          parameter_count: runtime.data?.parameter_count,
          weights_sha256: runtime.data?.weights_sha256,
        }
      : null,
    weights: {
      count: typeof weights.data?.count === "number" ? weights.data.count : 0,
      items: Array.isArray(weights.data?.weights) ? weights.data.weights : [],
    },
  }
  const ok = health.ok || runtime.ok || weights.ok

  const frame = buildFrame({
    index: 0,
    running: false,
    nlm: nlmVarFromStatus(nlmStatus, ok),
  })

  return NextResponse.json(frame, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  })
}
