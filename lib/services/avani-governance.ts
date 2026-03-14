/**
 * AVANI Governance Service
 *
 * Avani is the stewardship, governance, and safeguard layer that works
 * alongside MYCA. She evaluates what should happen before intelligence
 * acts at full power — providing policy, restraint, auditability,
 * reversibility, and stewardship.
 *
 * Yin (AVANI) to Yang (MYCA) — governance to capability.
 *
 * This service runs in the background on every MYCA interaction,
 * applying constitutional constraints and safety gating without
 * blocking the user experience.
 *
 * Ready for backend integration when the standalone `avani` repo
 * is deployed with full weights, constitution, memory, and soul.
 */

// When the standalone Avani service is deployed, point here
const AVANI_API_URL = process.env.AVANI_API_URL || ""

export type AvaniRiskTier = "low" | "moderate" | "elevated" | "high" | "critical"

export type AvaniVerdict = "allow" | "allow_with_audit" | "require_approval" | "deny" | "pause"

export interface AvaniConstitutionalRule {
  id: string
  name: string
  category: "safety" | "policy" | "ecological" | "human_override" | "audit" | "reversibility"
  description: string
  weight: number
  active: boolean
}

export interface AvaniEvaluation {
  verdict: AvaniVerdict
  risk_tier: AvaniRiskTier
  confidence: number
  rules_triggered: string[]
  audit_trail_id: string
  reasoning: string
  requires_human_review: boolean
  reversible: boolean
  timestamp: string
}

export interface AvaniGovernanceState {
  active: boolean
  mode: "background" | "interactive" | "strict"
  constitution_version: string
  rules_loaded: number
  last_evaluation: AvaniEvaluation | null
  evaluations_total: number
  denials_total: number
  approvals_requiring_audit: number
  uptime_ms: number
  backend_connected: boolean
}

/**
 * AVANI's Constitutional Rules — the core governance framework.
 * These will eventually live in the standalone `avani` repo with full
 * weights, training structures, and soul configuration.
 */
const CONSTITUTIONAL_RULES: AvaniConstitutionalRule[] = [
  {
    id: "safety-001",
    name: "No harmful content generation",
    category: "safety",
    description: "Prevent generation of content that could cause physical, psychological, or financial harm",
    weight: 1.0,
    active: true,
  },
  {
    id: "safety-002",
    name: "Parameter mutation protection",
    category: "safety",
    description: "Prevent unauthorized changes to MYCA's core parameters, system prompt, or governance rules",
    weight: 1.0,
    active: true,
  },
  {
    id: "safety-003",
    name: "Identity integrity",
    category: "safety",
    description: "Protect MYCA's identity from being overridden or hijacked via prompt injection",
    weight: 0.95,
    active: true,
  },
  {
    id: "policy-001",
    name: "Authorization tier enforcement",
    category: "policy",
    description: "Enforce role-based access control for sensitive operations (admin, superuser, owner)",
    weight: 0.9,
    active: true,
  },
  {
    id: "policy-002",
    name: "Rate and resource governance",
    category: "policy",
    description: "Prevent abuse through excessive requests, resource consumption, or cost escalation",
    weight: 0.8,
    active: true,
  },
  {
    id: "policy-003",
    name: "Data boundary enforcement",
    category: "policy",
    description: "Ensure MYCA does not leak internal system details, API keys, or infrastructure information",
    weight: 0.95,
    active: true,
  },
  {
    id: "ecological-001",
    name: "Ecological awareness",
    category: "ecological",
    description: "Ensure MINDEX data and research outputs respect ecological sensitivity and biodiversity",
    weight: 0.7,
    active: true,
  },
  {
    id: "ecological-002",
    name: "Sustainable compute",
    category: "ecological",
    description: "Flag unnecessary compute waste and encourage efficient resource usage",
    weight: 0.5,
    active: true,
  },
  {
    id: "human-001",
    name: "Kill-switch / pause support",
    category: "human_override",
    description: "Always honor human override commands — pause, stop, cancel, kill",
    weight: 1.0,
    active: true,
  },
  {
    id: "human-002",
    name: "Confirmation for high-impact actions",
    category: "human_override",
    description: "Require explicit human confirmation before executing destructive or irreversible operations",
    weight: 0.95,
    active: true,
  },
  {
    id: "audit-001",
    name: "Full audit trail",
    category: "audit",
    description: "Every evaluation, decision, and override must be logged with timestamp and reasoning",
    weight: 0.85,
    active: true,
  },
  {
    id: "reversibility-001",
    name: "Reversibility check",
    category: "reversibility",
    description: "Flag actions that cannot be undone and require explicit acknowledgment",
    weight: 0.9,
    active: true,
  },
]

// In-memory governance state (will be replaced by persistent backend)
let governanceState: AvaniGovernanceState = {
  active: true,
  mode: "background",
  constitution_version: "0.1.0-embedded",
  rules_loaded: CONSTITUTIONAL_RULES.filter((r) => r.active).length,
  last_evaluation: null,
  evaluations_total: 0,
  denials_total: 0,
  approvals_requiring_audit: 0,
  uptime_ms: 0,
  backend_connected: false,
}

const startTime = Date.now()

/**
 * Evaluate a message/action against Avani's constitutional rules.
 * This runs in the background on every MYCA interaction.
 */
export async function evaluateGovernance(params: {
  message: string
  user_id: string
  user_role: string
  is_superuser: boolean
  action_type: "chat" | "agent_dispatch" | "workflow" | "device_control" | "data_access" | "system_config"
  response_text?: string
  context?: Record<string, unknown>
}): Promise<AvaniEvaluation> {
  const { message, user_id, user_role, is_superuser, action_type, response_text, context } = params

  // If standalone Avani backend is available, delegate to it
  if (AVANI_API_URL) {
    try {
      const backendResult = await callAvaniBackend(params)
      if (backendResult) {
        governanceState.backend_connected = true
        governanceState.last_evaluation = backendResult
        governanceState.evaluations_total++
        if (backendResult.verdict === "deny") governanceState.denials_total++
        if (backendResult.verdict === "allow_with_audit") governanceState.approvals_requiring_audit++
        return backendResult
      }
    } catch {
      governanceState.backend_connected = false
    }
  }

  // Embedded evaluation (runs locally until Avani backend is deployed)
  const triggeredRules: string[] = []
  let riskTier: AvaniRiskTier = "low"
  let verdict: AvaniVerdict = "allow"
  let requiresHumanReview = false
  let reversible = true
  const reasoning: string[] = []

  const lowerMessage = message.toLowerCase()
  const lowerResponse = (response_text || "").toLowerCase()

  // Safety checks
  if (isParameterMutationAttempt(lowerMessage)) {
    if (!is_superuser) {
      triggeredRules.push("safety-002")
      riskTier = "high"
      verdict = "deny"
      reasoning.push("Parameter mutation attempted by non-superuser")
    } else {
      triggeredRules.push("safety-002")
      riskTier = "elevated"
      verdict = "allow_with_audit"
      reasoning.push("Parameter mutation by superuser — audited")
    }
  }

  if (isPromptInjectionAttempt(lowerMessage)) {
    triggeredRules.push("safety-003")
    riskTier = "high"
    verdict = "deny"
    reasoning.push("Potential prompt injection detected")
  }

  // Policy checks
  if (isDataLeakageRisk(lowerResponse)) {
    triggeredRules.push("policy-003")
    riskTier = "elevated"
    verdict = verdict === "deny" ? "deny" : "allow_with_audit"
    reasoning.push("Response may contain internal system information")
  }

  if (action_type === "system_config" && !is_superuser) {
    triggeredRules.push("policy-001")
    riskTier = "high"
    verdict = "deny"
    reasoning.push("System configuration requires superuser role")
  }

  // High-impact action checks
  if (action_type === "device_control" || action_type === "workflow") {
    triggeredRules.push("human-002")
    if (riskTier === "low") riskTier = "moderate"
    if (verdict === "allow") verdict = "allow_with_audit"
    requiresHumanReview = !is_superuser
    reasoning.push(`${action_type} action logged for audit`)
  }

  // Reversibility check for destructive operations
  if (isDestructiveAction(lowerMessage)) {
    triggeredRules.push("reversibility-001")
    reversible = false
    if (riskTier === "low") riskTier = "moderate"
    requiresHumanReview = true
    reasoning.push("Action may be irreversible")
  }

  // Human override commands always pass
  if (isHumanOverrideCommand(lowerMessage)) {
    triggeredRules.push("human-001")
    verdict = "allow"
    riskTier = "low"
    reasoning.push("Human override command honored")
  }

  // Audit trail
  triggeredRules.push("audit-001")

  if (triggeredRules.length === 1 && triggeredRules[0] === "audit-001") {
    reasoning.push("Standard interaction — no governance concerns")
  }

  const evaluation: AvaniEvaluation = {
    verdict,
    risk_tier: riskTier,
    confidence: calculateConfidence(triggeredRules),
    rules_triggered: triggeredRules,
    audit_trail_id: `avani-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reasoning: reasoning.join("; "),
    requires_human_review: requiresHumanReview,
    reversible,
    timestamp: new Date().toISOString(),
  }

  // Update state
  governanceState.last_evaluation = evaluation
  governanceState.evaluations_total++
  governanceState.uptime_ms = Date.now() - startTime
  if (verdict === "deny") governanceState.denials_total++
  if (verdict === "allow_with_audit") governanceState.approvals_requiring_audit++

  return evaluation
}

/**
 * Get current Avani governance state
 */
export function getGovernanceState(): AvaniGovernanceState {
  return {
    ...governanceState,
    uptime_ms: Date.now() - startTime,
  }
}

/**
 * Get constitutional rules (for UI display)
 */
export function getConstitutionalRules(): AvaniConstitutionalRule[] {
  return CONSTITUTIONAL_RULES.filter((r) => r.active)
}

/**
 * Call the standalone Avani backend service (when deployed)
 */
async function callAvaniBackend(
  params: Record<string, unknown>
): Promise<AvaniEvaluation | null> {
  if (!AVANI_API_URL) return null
  try {
    const response = await fetch(`${AVANI_API_URL}/api/avani/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000),
    })
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch {
    return null
  }
}

// --- Detection Helpers ---

function isParameterMutationAttempt(message: string): boolean {
  return /(change\s+your\s+parameters|update\s+your\s+parameters|system\s+prompt|override\s+guardrails|disable\s+safety|change\s+your\s+core\s+rules|modify\s+your\s+behavior|ignore\s+your\s+instructions|forget\s+your\s+rules)/i.test(
    message
  )
}

function isPromptInjectionAttempt(message: string): boolean {
  return /(ignore\s+previous\s+instructions|you\s+are\s+now|pretend\s+you\s+are|act\s+as\s+if\s+you\s+are|from\s+now\s+on\s+you\s+are|disregard\s+all|new\s+instructions|system:\s*you)/i.test(
    message
  )
}

function isDataLeakageRisk(response: string): boolean {
  return /(api[_-]?key|secret[_-]?key|password\s*[:=]|192\.168\.\d+\.\d+|localhost:\d{4}|bearer\s+[a-z0-9])/i.test(
    response
  )
}

function isDestructiveAction(message: string): boolean {
  return /(delete\s+all|drop\s+table|reset\s+everything|wipe|destroy|purge|remove\s+all|clear\s+all\s+data)/i.test(
    message
  )
}

function isHumanOverrideCommand(message: string): boolean {
  return /^(stop|pause|cancel|kill|abort|halt|emergency\s+stop)\s*[.!]?$/i.test(message.trim())
}

function calculateConfidence(triggeredRules: string[]): number {
  if (triggeredRules.length <= 1) return 0.95
  const safetyRules = triggeredRules.filter((r) => r.startsWith("safety-"))
  if (safetyRules.length > 0) return 0.9
  return 0.85
}
