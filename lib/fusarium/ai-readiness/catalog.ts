export type AiSurface = "ai-studio" | "nlm-training" | "workflows" | "mas" | "avani"
export type AiState = "source-present" | "unbound" | "locked" | "quarantined"

export interface AiReadinessRecord {
  id: string
  surface: AiSurface
  capability: string
  state: AiState
  source: string
  evidence: string
  requirement: string
}

export const AI_READINESS_CATALOG: readonly AiReadinessRecord[] = [
  { id: "myca-chat-contract", surface: "ai-studio", capability: "MYCA conversation contracts", state: "source-present", source: "apps/twins-host/app/api/myca and app/api/mas/voice", evidence: "Chat, voice orchestration, confirmation, and conversation route sources exist.", requirement: "A source route is not proof of an available model, voice transport, tool execution, or durable conversation." },
  { id: "full-duplex", surface: "ai-studio", capability: "Full-duplex conversation runtime", state: "unbound", source: "docs/MYCA_FULL_DUPLEX_CONVERSATIONAL_CONTROL_ARCHITECTURE_SEP01_2026.md", evidence: "Architecture and P0 gaps are documented; implementation is not accepted.", requirement: "One turn authority, cancellation, interruption, typed tools, evidence, and safe command confirmation." },
  { id: "typed-reads", surface: "ai-studio", capability: "Typed read tools", state: "unbound", source: "MYCA/MAS handoff and local route sources", evidence: "Multiple read seams exist but no one accepted conversational tool registry is proven.", requirement: "Read-only typed schemas, provenance, freshness, identity, bounded output, and audit." },
  { id: "nlm-bridge", surface: "nlm-training", capability: "NLM bridge", state: "source-present", source: "services/runtime/fusarium_runtime/routers/fusarium.py", evidence: "NLMBridge is present and reports no trained or deployed model.", requirement: "A bridge is not a model, deployment, dataset lineage, checkpoint, metric, or inference service." },
  { id: "nlm-engine", surface: "nlm-training", capability: "NLM sensory engine", state: "unbound", source: "apps/twins-host/app/api/natureos/nlm-training", evidence: "Status and training adapters exist, but the runtime/provider is not verified here.", requirement: "Verified engine identity, model/version, dataset provenance, job state, metrics, artifacts, and deployment evidence." },
  { id: "nlm-actions", surface: "nlm-training", capability: "Training and deployment controls", state: "locked", source: "not bound", evidence: "This Fusarium surface exposes no training or deployment action.", requirement: "Dedicated compute budget, artifact store, identity, approval, rollback, and model-risk review." },
  { id: "workflow-inventory", surface: "workflows", capability: "n8n workflow inventory", state: "source-present", source: "apps/twins-host/app/api/natureos/n8n/workflows-list", evidence: "A known-export inventory route exists independently of a running n8n instance.", requirement: "Inventory records are not active workflows or execution evidence." },
  { id: "workflow-runtime", surface: "workflows", capability: "Local and cloud n8n runtime", state: "unbound", source: "apps/twins-host/app/api/myca/workflows", evidence: "Read and mutation adapters exist but no authorized live exchange is proven.", requirement: "Separate reachability, authentication, workflow state, last execution, freshness, and source." },
  { id: "workflow-mutations", surface: "workflows", capability: "Activate, deactivate, run, and update", state: "locked", source: "apps/twins-host/app/api/myca/workflows", evidence: "Mutation code exists but is not exposed by this Fusarium readiness page.", requirement: "Trusted identity, exact workflow revision, impact preview, explicit approval, idempotency, and audit." },
  { id: "mas-topology", surface: "mas", capability: "MAS topology contract", state: "source-present", source: "apps/twins-host/app/api/mas/topology", evidence: "Topology API source exists.", requirement: "Source topology is not a live agent, service, or connection state." },
  { id: "mas-runtime", surface: "mas", capability: "MAS runtime and agents", state: "unbound", source: "MAS handoff", evidence: "No authenticated, schema-verified, fresh, data-bearing exchange is accepted for this app.", requirement: "Runtime identity, node/agent liveness, task evidence, queue state, timestamps, and authorization." },
  { id: "mas-actions", surface: "mas", capability: "Agent dispatch and external effects", state: "locked", source: "MYCA/MAS handoff", evidence: "Current boundary is advisory with externalEffects=false.", requirement: "No publication, dispatch, actuation, self-approval, or canonical write." },
  { id: "avani-rules", surface: "avani", capability: "Embedded constitutional rules", state: "source-present", source: "apps/twins-host/lib/services/avani-governance.ts", evidence: "Twelve embedded rules and local evaluation source exist.", requirement: "Embedded rules are development policy evidence, not accredited authorization." },
  { id: "avani-backend", surface: "avani", capability: "Authoritative AVANI backend", state: "unbound", source: "AVANI_API_URL seam", evidence: "No approved backend identity or live exchange is proven.", requirement: "Signed versioned policy, server identity, decision provenance, availability, audit, and fail-closed behavior." },
  { id: "avani-failover", surface: "avani", capability: "Backend-unavailable fallback", state: "quarantined", source: "apps/twins-host/lib/services/avani-governance.ts", evidence: "Current source can return allow_with_audit when the configured backend is unreachable.", requirement: "High-impact authorization must fail closed; this fallback cannot authorize an action." },
]

export function aiReadiness(surface: AiSurface, query: string): AiReadinessRecord[] {
  const needle = query.trim().toLowerCase()
  return AI_READINESS_CATALOG.filter((record) => record.surface === surface && (!needle || `${record.capability} ${record.state} ${record.source} ${record.evidence} ${record.requirement}`.toLowerCase().includes(needle)))
}
