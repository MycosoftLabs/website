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
    backend_connected: state.backend_connected,
    last_verdict: state.last_evaluation?.verdict ?? null,
    last_risk_tier: state.last_evaluation?.risk_tier ?? null,
    uptime_ms: state.uptime_ms,
    timestamp: new Date().toISOString(),
    service: "avani-governance",
    version: "0.1.0-embedded",
    note: "Embedded governance engine. Full Avani backend (weights, constitution, memory, soul) will run from standalone avani repo.",
  })
}
