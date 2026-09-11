/**
 * Shared Fusarium scenario-simulation bus.
 * Exercise only. Never a live COP. No invented species counts. No Fusarium p stub.
 */

export const SCENARIO_SIM_SCHEMA = "fusarium-scenario-sim/v1" as const
export const SCENARIO_SIM_BANNER = "SYNTHETIC EXERCISE"
export const SCENARIO_SIM_LIVE = false as const
export const SCENARIO_SIM_CHANNEL = "fusarium-scenario-sim"
export const SCENARIO_SIM_EVENT = "fusarium:scenario-sim"
export const SCENARIO_AO_LNG = -81.6072
export const SCENARIO_AO_LAT = 31.8697
export const SCENARIO_AO_PLACE = "Fort Stewart, Liberty County, Georgia"
export const SCENARIO_RUN_ID = "itdx-bulldog-demo"
export const SCENARIO_DATASET_ID = "demo-11"

export type ScenarioBindStatus =
  | "BOUND"
  | "NO_DATA"
  | "UNQUALIFIED"
  | "NOT_SUPPLIED"
  | "IDLE"
  | "LIT"

export type ScenarioSurfaceKind = "app" | "panel" | "overlay" | "api"

export interface ScenarioAo {
  place: string
  lng: number
  lat: number
  live: false
  source: string
}

export interface ScenarioSurface {
  id: string
  title: string
  href: string
  kind: ScenarioSurfaceKind
  bind: ScenarioBindStatus
  source: string
  note: string
  lit: boolean
}

export interface ScenarioWeatherVar {
  id: "weather"
  live: false
  status: ScenarioBindStatus
  nwsCwa: "JAX"
  openMeteoCite: string
  nwsCite: string
  temperatureC: number | null
  note: string
}

export interface ScenarioMovementVar {
  id: "movement"
  live: false
  status: ScenarioBindStatus
  replayTime: string | null
  index: number
  sampleCount: number
  pathTree: string
  note: string
}

export interface ScenarioUnitVar {
  id: string
  label: string
  kind: string
  live: false
  position: [number, number] | null
  status: string
}

export interface ScenarioSensorVar {
  id: string
  label: string
  live: false
  missing: boolean
  note: string
}

export interface ScenarioIntelBeat {
  id: string
  title: string
  question: string
  live: false
  source: string
}

export interface ScenarioPersonnelVar {
  live: false
  roleCount: number
  personaId: string
  personaTitle: string
  dutyNote: string
  catalogSource: string
}

export interface ScenarioNlmWeight {
  id: string
  path: string | null
  bytes: number | null
  sha256: string | null
  source: string
  modifiedAt: string | null
}

export interface ScenarioNlmVar {
  live: false
  bound_to_ollama: false
  forecast_qualified: false
  p: null
  loaded: boolean | null
  qualification_status: string
  modelId: string | null
  modelDir: string | null
  tensorCount: number | null
  parameterCount: number | null
  weights: ScenarioNlmWeight[]
  weightsSource: string
  note: string
}

export interface ScenarioVariables {
  weather: ScenarioWeatherVar
  movement: ScenarioMovementVar
  units: ScenarioUnitVar[]
  sensors: ScenarioSensorVar[]
  intelBeat: ScenarioIntelBeat
  personnel: ScenarioPersonnelVar
  nlm: ScenarioNlmVar
  scenarioId: string
  scenarioName: string
  documentName: string
}

export interface ScenarioSimFrame {
  schema: typeof SCENARIO_SIM_SCHEMA
  live: false
  banner: typeof SCENARIO_SIM_BANNER
  classification: "UNCLASSIFIED"
  runId: typeof SCENARIO_RUN_ID
  datasetId: typeof SCENARIO_DATASET_ID
  ao: ScenarioAo
  index: number
  clockIso: string
  running: boolean
  variables: ScenarioVariables
  surfaces: ScenarioSurface[]
}

export interface ScenarioSimControl {
  running: boolean
  live: false
  banner: typeof SCENARIO_SIM_BANNER
  index: number
}
