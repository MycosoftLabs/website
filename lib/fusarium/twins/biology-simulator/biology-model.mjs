export const BIOLOGY_MODEL_SCHEMA = "mycosoft.fusarium.biology.workbench.v2"

export const BIOLOGY_SCALES = Object.freeze([
  { id: "cell-culture", label: "Cell culture" },
  { id: "fungal-colony", label: "Fungal colony" },
  { id: "microbial-culture", label: "Microbial culture" },
  { id: "population", label: "Population" },
])

export const BIOLOGY_MODELS = Object.freeze([
  { id: "logistic", label: "Logistic growth", description: "Density-limited growth toward a fixed carrying capacity." },
  { id: "exponential", label: "Exponential growth / decay", description: "Unconstrained change at a constant per-capita rate." },
  { id: "competition", label: "Two-population competition", description: "Bounded Lotka-Volterra competition between two populations." },
  { id: "sir", label: "SIR compartments", description: "Closed susceptible-infectious-recovered compartment flow." },
])

export const DEFAULT_MODEL_PARAMETERS = Object.freeze({
  logistic: { initialPopulation: 120, carryingCapacity: 12000, growthRatePerHour: 0.18 },
  exponential: { initialPopulation: 120, ratePerHour: 0.08 },
  competition: { populationA: 120, populationB: 80, carryingCapacityA: 1200, carryingCapacityB: 900, growthRateAPerHour: 0.12, growthRateBPerHour: 0.1, effectBOnA: 0.55, effectAOnB: 0.7 },
  sir: { susceptible: 990, infectious: 10, recovered: 0, transmissionPerHour: 0.00035, recoveryPerHour: 0.08 },
})

export const DEFAULT_BIOLOGY_SCENARIO = Object.freeze({ schema: BIOLOGY_MODEL_SCHEMA, model: "logistic", scale: "fungal-colony", durationHours: 48, stepMinutes: 30, parameters: DEFAULT_MODEL_PARAMETERS.logistic, ...DEFAULT_MODEL_PARAMETERS.logistic })

const asNumber = (value) => typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN
const finite = (value) => Number.isFinite(value)
const bounded = (value, min, max) => finite(value) && value >= min && value <= max
const round = (value) => Number(value.toFixed(6))

function normalizeLegacy(input) {
  const legacyKeys = ["initialPopulation", "carryingCapacity", "growthRatePerHour"]
  const hasLegacyFields = input && legacyKeys.every((key) => Object.hasOwn(input, key))
  const legacyOverridesParameters = hasLegacyFields && legacyKeys.some((key) => input[key] !== input.parameters?.[key])
  if (hasLegacyFields && (!input.parameters || (input.model === "logistic" && legacyOverridesParameters))) return { ...input, model: "logistic", parameters: { initialPopulation: input.initialPopulation, carryingCapacity: input.carryingCapacity, growthRatePerHour: input.growthRatePerHour } }
  if (input?.parameters || input?.model) return input
  return { schema: BIOLOGY_MODEL_SCHEMA, model: "logistic", scale: input?.scale, durationHours: input?.durationHours, stepMinutes: input?.stepMinutes, parameters: { initialPopulation: input?.initialPopulation, carryingCapacity: input?.carryingCapacity, growthRatePerHour: input?.growthRatePerHour } }
}

export function validateBiologyScenario(input) {
  const source = normalizeLegacy(input && typeof input === "object" ? input : {})
  const model = typeof source.model === "string" ? source.model : ""
  const scenario = { schema: BIOLOGY_MODEL_SCHEMA, model, scale: typeof source.scale === "string" ? source.scale : "", durationHours: asNumber(source.durationHours), stepMinutes: asNumber(source.stepMinutes), parameters: Object.fromEntries(Object.entries(source.parameters ?? {}).map(([key, value]) => [key, asNumber(value)])) }
  const errors = []
  if (!BIOLOGY_MODELS.some((entry) => entry.id === model)) errors.push("Choose a supported deterministic model.")
  if (!BIOLOGY_SCALES.some((entry) => entry.id === scenario.scale)) errors.push("Choose a supported biological scale.")
  if (!bounded(scenario.durationHours, 1, 720)) errors.push("Duration must be between 1 and 720 hours.")
  if (!bounded(scenario.stepMinutes, 1, 60)) errors.push("Step size must be between 1 and 60 minutes.")
  const p = scenario.parameters
  if (model === "logistic") {
    if (!bounded(p.initialPopulation, 0.000001, 1e12)) errors.push("Initial population must be greater than zero and at most 1e12.")
    if (!finite(p.carryingCapacity) || p.carryingCapacity < p.initialPopulation || p.carryingCapacity > 1e12) errors.push("Carrying capacity must be at least the initial population and at most 1e12.")
    if (!bounded(p.growthRatePerHour, -2, 2) || p.growthRatePerHour === 0) errors.push("Growth rate must be non-zero and between -2 and 2 per hour.")
  } else if (model === "exponential") {
    if (!bounded(p.initialPopulation, 0.000001, 1e12)) errors.push("Initial population must be greater than zero and at most 1e12.")
    if (!bounded(p.ratePerHour, -2, 2) || p.ratePerHour === 0) errors.push("Rate must be non-zero and between -2 and 2 per hour.")
    if (finite(p.initialPopulation) && finite(p.ratePerHour) && finite(scenario.durationHours) && p.initialPopulation * Math.exp(p.ratePerHour * scenario.durationHours) > 1e15) errors.push("Scenario exceeds the numerical output bound of 1e15.")
  } else if (model === "competition") {
    for (const key of ["populationA", "populationB"]) if (!bounded(p[key], 0.000001, 1e12)) errors.push(`${key} must be greater than zero and at most 1e12.`)
    if (!finite(p.carryingCapacityA) || p.carryingCapacityA < p.populationA || p.carryingCapacityA > 1e12) errors.push("Carrying capacity A must be at least population A and at most 1e12.")
    if (!finite(p.carryingCapacityB) || p.carryingCapacityB < p.populationB || p.carryingCapacityB > 1e12) errors.push("Carrying capacity B must be at least population B and at most 1e12.")
    for (const key of ["growthRateAPerHour", "growthRateBPerHour"]) if (!bounded(p[key], 0.000001, 2)) errors.push(`${key} must be greater than zero and at most 2 per hour.`)
    for (const key of ["effectBOnA", "effectAOnB"]) if (!bounded(p[key], 0, 10)) errors.push(`${key} must be between 0 and 10.`)
  } else if (model === "sir") {
    for (const key of ["susceptible", "infectious", "recovered"]) if (!bounded(p[key], 0, 1e12)) errors.push(`${key} must be between zero and 1e12.`)
    if ((p.susceptible ?? 0) + (p.infectious ?? 0) + (p.recovered ?? 0) <= 0) errors.push("Total compartment population must be greater than zero.")
    if (!bounded(p.transmissionPerHour, 0, 2)) errors.push("Transmission coefficient must be between 0 and 2 per person-hour.")
    if (!bounded(p.recoveryPerHour, 0, 2)) errors.push("Recovery rate must be between 0 and 2 per hour.")
  }
  return errors.length ? { ok: false, errors, scenario: null } : { ok: true, errors: [], scenario }
}

function timeGrid(durationHours, stepMinutes) {
  const stepHours = stepMinutes / 60, steps = Math.ceil(durationHours / stepHours)
  return Array.from({ length: steps + 1 }, (_, index) => Math.min(durationHours, index * stepHours)).filter((hour, index, all) => index === 0 || hour !== all[index - 1])
}

function logistic(scenario) {
  const p = scenario.parameters
  const points = timeGrid(scenario.durationHours, scenario.stepMinutes).map((hour) => ({ hour: round(hour), value: round(Math.max(0, p.carryingCapacity / (1 + ((p.carryingCapacity - p.initialPopulation) / p.initialPopulation) * Math.exp(-p.growthRatePerHour * hour)))) }))
  return { series: [{ id: "population", label: "Population", unit: "individuals", color: "#34d399", points }], phase: null }
}

function exponential(scenario) {
  const p = scenario.parameters
  return { series: [{ id: "population", label: "Population", unit: "individuals", color: "#38bdf8", points: timeGrid(scenario.durationHours, scenario.stepMinutes).map((hour) => ({ hour: round(hour), value: round(p.initialPopulation * Math.exp(p.ratePerHour * hour)) })) }], phase: null }
}

function rk4Step(state, dt, derivative) {
  const add = (base, delta, factor) => base.map((value, i) => value + delta[i] * factor)
  const k1 = derivative(state), k2 = derivative(add(state, k1, dt / 2)), k3 = derivative(add(state, k2, dt / 2)), k4 = derivative(add(state, k3, dt))
  return state.map((value, i) => Math.max(0, value + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6))
}

function integrate(scenario, initial, derivative, definitions) {
  const hours = timeGrid(scenario.durationHours, scenario.stepMinutes); let state = initial
  const values = hours.map((hour, index) => { if (index > 0) state = rk4Step(state, hour - hours[index - 1], derivative); return { hour: round(hour), state: state.map(round) } })
  return { series: definitions.map((definition, index) => ({ ...definition, points: values.map((point) => ({ hour: point.hour, value: point.state[index] })) })), phase: definitions.length === 2 ? values.map((point) => ({ x: point.state[0], y: point.state[1], hour: point.hour })) : null }
}

function competition(scenario) {
  const p = scenario.parameters
  return integrate(scenario, [p.populationA, p.populationB], ([a, b]) => [p.growthRateAPerHour * a * (1 - (a + p.effectBOnA * b) / p.carryingCapacityA), p.growthRateBPerHour * b * (1 - (b + p.effectAOnB * a) / p.carryingCapacityB)], [{ id: "population-a", label: "Population A", unit: "individuals", color: "#34d399" }, { id: "population-b", label: "Population B", unit: "individuals", color: "#fb923c" }])
}

function sir(scenario) {
  const p = scenario.parameters
  return integrate(scenario, [p.susceptible, p.infectious, p.recovered], ([s, i]) => { const incidence = p.transmissionPerHour * s * i, recovery = p.recoveryPerHour * i; return [-incidence, incidence - recovery, recovery] }, [{ id: "susceptible", label: "Susceptible", unit: "individuals", color: "#38bdf8" }, { id: "infectious", label: "Infectious", unit: "individuals", color: "#fb7185" }, { id: "recovered", label: "Recovered", unit: "individuals", color: "#34d399" }])
}

export function simulateBiologyScenario(input) {
  const validation = validateBiologyScenario(input)
  if (!validation.ok) return validation
  const scenario = validation.scenario
  const output = scenario.model === "logistic" ? logistic(scenario) : scenario.model === "exponential" ? exponential(scenario) : scenario.model === "competition" ? competition(scenario) : sir(scenario)
  const allValues = output.series.flatMap((series) => series.points.map((point) => point.value))
  return { ok: true, errors: [], schema: BIOLOGY_MODEL_SCHEMA, model: scenario.model, scenario, ...output, summary: { seriesCount: output.series.length, pointCount: output.series[0]?.points.length ?? 0, minimum: round(Math.min(...allValues)), maximum: round(Math.max(...allValues)), finalValues: Object.fromEntries(output.series.map((series) => [series.id, series.points.at(-1)?.value ?? null])) }, provenance: { source: "operator-entered-parameters", liveTelemetry: false, calibrated: false, persisted: false, integrator: scenario.model === "competition" || scenario.model === "sir" ? "fixed-step-rk4" : "closed-form", note: "Deterministic mathematical scenario output only; not an observation, calibrated prediction, or live biological state." } }
}

export function simulateBiologyPopulation(input) {
  const result = simulateBiologyScenario({ ...normalizeLegacy(input), model: "logistic" })
  if (!result.ok) return result
  const points = result.series[0].points.map((point) => ({ hour: point.hour, population: point.value })), k = result.scenario.parameters.carryingCapacity
  const halfCapacityPoint = points.find((point) => point.population >= k / 2) ?? null
  return { ...result, model: "deterministic-logistic-growth", scenario: { ...result.scenario, ...result.scenario.parameters }, points, summary: { initialPopulation: result.scenario.parameters.initialPopulation, finalPopulation: points.at(-1)?.population ?? result.scenario.parameters.initialPopulation, carryingCapacity: k, percentOfCapacity: round(((points.at(-1)?.population ?? 0) / k) * 100), halfCapacityHour: halfCapacityPoint?.hour ?? null } }
}
