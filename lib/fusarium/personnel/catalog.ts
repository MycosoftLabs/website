import catalogJson from "./generated-catalog.json"
import { personaById } from "./personas"
import type { PersonnelRole } from "./types"

interface GeneratedCatalog {
  schema_version: string
  as_of: string
  status: string
  actual_unit_roster: boolean
  permissions_granted_by_import: boolean
  package_calc_checks_passed: number
  package_calc_checks_note: string
  roles: PersonnelRole[]
  ranks: unknown[]
  pay_benchmarks: unknown[]
  training: unknown[]
  pilot_coverage: unknown[]
  workflows: unknown[]
  sources: unknown[]
  permission_proposals: unknown[]
  human_outcome_definitions: unknown[]
  human_outcomes_by_role: Array<{
    role_id: string
    evidence_status: string
    data_origin: string
    labor_hours_released: null
    labor_reduction_percent: null
    actual_duty_hours_released_per_person_week: null
    duty_reduction_percent: null
    rest_hours_gained_per_person_week: null
    workload_reduction_points: null
    error_absolute_reduction_pp: null
    fatality_absolute_reduction_pp: null
    individual_death_risk_reduction: null
    approved_personnel_reduction: null
    measured_cash_savings_usd: null
    causal_attribution: string
  }>
  human_outcome_claim_policy: Record<string, unknown>
  services: string[]
}

const catalog = catalogJson as GeneratedCatalog

export function getPersonnelCatalog() {
  return {
    ...catalog,
    role_count: catalog.roles.length,
    note: "Proposed user personas. Not required headcount. Not a named unit roster. Import grants no access.",
    in_boundary_cui: {
      source_class: "in_boundary_cui",
      available: false,
      status: "NOT_SUPPLIED",
      copy: "CUI-backed measures are not available on this commercial surface. They will land only on an SAO-authorized in-boundary path later. Mycosoft is pursuing CMMC L2 and is not CMMC compliant.",
    },
  }
}

export function listRoles(): PersonnelRole[] {
  return catalog.roles
}

export function roleById(roleId: string): PersonnelRole | undefined {
  return catalog.roles.find((role) => role.role_id === roleId)
}

export function rolesForPersona(personaId: string): PersonnelRole[] {
  if (personaId === "owner_full") return catalog.roles
  return catalog.roles.filter((role) => role.persona_id === personaId)
}

export function resolveDuty(roleId?: string | null, personaId?: string | null) {
  const role = roleId ? roleById(roleId) : undefined
  const persona = personaById(role?.persona_id || personaId || "owner_full")
  return { role: role ?? null, persona, catalog_meta: getPersonnelCatalog() }
}
