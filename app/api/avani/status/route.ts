import { NextResponse } from "next/server"
import { getGovernanceState, getConstitutionalRules } from "@/lib/services/avani-governance"

/**
 * GET /api/avani/status
 *
 * Returns current Avani governance state — active rules, evaluation counts,
 * backend connectivity, and last verdict. Polled by AvaniProvider every 30s.
 */
export async function GET() {
  const state = getGovernanceState()
  const rules = getConstitutionalRules()
  const mas = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001").replace(/\/$/, "")
  let masHealth: Record<string, unknown> | null = null
  let masStatusCode = 0
  let masPath = "/api/avani/health"
  for (const path of ["/api/avani/status", "/api/avani/health"]) {
    try {
      const response = await fetch(`${mas}${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) })
      masStatusCode = response.status
      masPath = path
      if (response.ok) {
        masHealth = (await response.json()) as Record<string, unknown>
        break
      }
      masHealth = { error: `HTTP ${response.status}`, path }
    } catch (error) {
      masHealth = { error: error instanceof Error ? error.message : "unreachable", path }
    }
  }

  return NextResponse.json({
    active: state.active,
    mode: state.mode,
    constitution_version: state.constitution_version,
    rules_loaded: state.rules_loaded,
    rules_by_category: {
      safety: rules.filter((r) => r.category === "safety").length,
      policy: rules.filter((r) => r.category === "policy").length,
      ecological: rules.filter((r) => r.category === "ecological").length,
      human_override: rules.filter((r) => r.category === "human_override").length,
      audit: rules.filter((r) => r.category === "audit").length,
      reversibility: rules.filter((r) => r.category === "reversibility").length,
    },
    evaluations_total: state.evaluations_total,
    denials_total: state.denials_total,
    approvals_requiring_audit: state.approvals_requiring_audit,
    backend_connected: Boolean(masHealth && masStatusCode === 200),
    last_verdict: state.last_evaluation?.verdict ?? null,
    last_risk_tier: state.last_evaluation?.risk_tier ?? null,
    uptime_ms: state.uptime_ms,
    timestamp: new Date().toISOString(),
    service: "avani-governance",
    version: "0.1.0-embedded",
    canonical_mas_path: masPath,
    mas_status_path: "/api/avani/status",
    mas_status_exists: masPath === "/api/avani/status" && masStatusCode === 200,
    mas: masHealth,
    seven_role_task8: {
      status: "UNQUALIFIED",
      missing_artifact: "MAS /api/avani/status is 404. Use /api/avani/health and /api/fusarium/itdx/task8. No seven-role badges unless Task 8 returns bound roles.",
    },
    note: "Website alias. MAS canonical health is /api/avani/health on 188:8001. Embedded rules remain local; they are not Army approval.",
  })
}
