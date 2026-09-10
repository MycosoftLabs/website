import { getPersonnelCatalog, roleById } from "./catalog"
import { PACKAGE_CALC_CHECKS_PASSED } from "./human-outcomes"
import { readMeasurementStore } from "./outcomes-store"
import { personaById } from "./personas"
import { evidenceLabel } from "./types"

export async function buildKoRelay(roleId?: string | null) {
  const catalog = getPersonnelCatalog()
  const store = await readMeasurementStore()
  const surveys = roleId ? store.surveys.filter((row) => row.role_id === roleId) : store.surveys
  const telemetry = roleId ? store.telemetry.filter((row) => row.role_id === roleId) : store.telemetry
  const inferences = roleId ? store.inferences.filter((row) => row.role_id === roleId) : store.inferences
  const role = roleId ? roleById(roleId) : null
  const catalogRow = roleId
    ? catalog.human_outcomes_by_role.find((row) => row.role_id === roleId)
    : null

  const tlx = surveys.filter((row) => row.instrument === "NASA-TLX")
  const wellbq = surveys.filter((row) => row.instrument === "NIOSH-WellBQ-SCORES")
  const rest = surveys.filter((row) => row.instrument === "REST_ERROR_INCIDENT")
  const lastTlx = tlx.at(-1)
  const meanTlx =
    lastTlx == null
      ? null
      : Object.values(lastTlx.scores)
          .filter((v): v is number => typeof v === "number")
          .reduce((a, b) => a + b, 0) /
        Math.max(
          1,
          Object.values(lastTlx.scores).filter((v) => typeof v === "number").length,
        )

  return {
    schema_version: "1.1.0",
    decision_support: true,
    live_cop: false,
    cmmc_compliant: false,
    package_calc_checks_passed: PACKAGE_CALC_CHECKS_PASSED,
    package_calc_checks_note: catalog.package_calc_checks_note,
    in_boundary_cui: catalog.in_boundary_cui,
    role: role
      ? {
          role_id: role.role_id,
          title: role.role_title,
          service: role.service,
          specialty_code: role.specialty_code,
          persona_id: role.persona_id,
          persona_title: personaById(role.persona_id).title,
        }
      : null,
    n: {
      surveys: surveys.length,
      telemetry: telemetry.length,
      inferences: inferences.length,
    },
    tiles: {
      labor_capacity: {
        value: catalogRow?.labor_hours_released ?? null,
        display: evidenceLabel("not_measured", 0),
        source_class: "not_measured",
      },
      duty_hours: {
        value: catalogRow?.actual_duty_hours_released_per_person_week ?? null,
        display: evidenceLabel("not_measured", 0),
        source_class: "not_measured",
      },
      rest: {
        value: rest.at(-1)?.rest_hours_observed ?? null,
        display: rest.length === 0 ? evidenceLabel("not_measured", 0) : evidenceLabel("survey", rest.length),
        source_class: rest.length === 0 ? "not_measured" : "survey",
      },
      nasa_tlx: {
        value: meanTlx,
        display: tlx.length === 0 ? evidenceLabel("not_measured", 0) : evidenceLabel("survey", tlx.length),
        source_class: tlx.length === 0 ? "not_measured" : "survey",
        unit: tlx.length ? "instrument points (not percent less stress)" : null,
      },
      wellbeing: {
        value: wellbq.at(-1)?.scores?.overall ?? null,
        display: wellbq.length === 0 ? evidenceLabel("not_measured", 0) : evidenceLabel("survey", wellbq.length),
        source_class: wellbq.length === 0 ? "not_measured" : "survey",
      },
      errors: {
        value: rest.at(-1)?.error_events ?? null,
        display: rest.length === 0 ? evidenceLabel("not_measured", 0) : evidenceLabel("survey", rest.length),
        source_class: rest.length === 0 ? "not_measured" : "survey",
      },
      fatality: {
        value: null,
        display: evidenceLabel("not_measured", 0),
        source_class: "not_measured",
        note: "Fatality % cannot be derived from hours saved, surveys, or inference.",
      },
      approved_personnel_reduction: {
        value: null,
        display: evidenceLabel("not_measured", 0),
        source_class: "not_measured",
      },
    },
    surveys,
    telemetry,
    inferences,
    honesty: [
      "If it is not measured, the UI says Not measured. Never 0 or 0.85.",
      "Negative results are preserved when later surveys worsen.",
      "Inferred rows stay method: inferred and are not measured fatality reductions.",
      "in_boundary_cui is disabled / NOT_SUPPLIED on this commercial surface.",
    ],
  }
}
