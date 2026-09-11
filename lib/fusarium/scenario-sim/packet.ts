import documentsJson from "@/lib/itdx/lab-catalog/documents.json"
import scenariosJson from "@/lib/itdx/lab-catalog/scenarios.json"
import { ASSETS, SAMPLE_COUNT, START_UTC, snapshot } from "@/lib/itdx/replay-core.mjs"
import { TRAINING_PIRS } from "@/lib/itdx/synthetic-briefing"
import { PERSONA_PROFILES } from "@/lib/fusarium/personnel/personas"
import {
  SCENARIO_AO_LAT,
  SCENARIO_AO_LNG,
  SCENARIO_AO_PLACE,
  SCENARIO_DATASET_ID,
  SCENARIO_RUN_ID,
  SCENARIO_SIM_BANNER,
  SCENARIO_SIM_SCHEMA,
  type ScenarioNlmVar,
  type ScenarioNlmWeight,
  type ScenarioSimFrame,
  type ScenarioVariables,
} from "./contracts"
import { listScenarioSurfaces } from "./surfaces"

const STEP_SECONDS = 10
const ROLE_COUNT = 180

interface CatalogDoc {
  id?: string
  name?: string
}

interface CatalogScenario {
  id?: string
  name?: string
}

const DOCUMENTS = documentsJson as CatalogDoc[]
const SCENARIOS = scenariosJson as CatalogScenario[]

export const IDLE_NLM: ScenarioNlmVar = {
  live: false,
  bound_to_ollama: false,
  forecast_qualified: false,
  p: null,
  loaded: null,
  qualification_status: "UNQUALIFIED",
  modelId: null,
  modelDir: null,
  tensorCount: null,
  parameterCount: null,
  weights: [],
  weightsSource: "MAS /api/nlm/weights",
  note: "NLM not polled at idle. When the test runs, the bus reads the real MAS service. No Ollama bind. p stays null.",
}

export function buildVariables(index: number, nlm: ScenarioNlmVar = IDLE_NLM, temperatureC: number | null = null): ScenarioVariables {
  const safeIndex = Number.isInteger(index) ? Math.max(0, Math.min(SAMPLE_COUNT - 1, index)) : 0
  const frame = snapshot(safeIndex)
  const scenario = SCENARIOS[safeIndex % SCENARIOS.length] || { id: "clean", name: "Clean coastal replay" }
  const document = DOCUMENTS[safeIndex % DOCUMENTS.length] || { name: "ITDX26 packaged catalog" }
  const pir = TRAINING_PIRS[safeIndex % TRAINING_PIRS.length]
  const persona = PERSONA_PROFILES[safeIndex % PERSONA_PROFILES.length]
  const sensor = frame.assets.find((row: { id: string }) => row.id === "demo-sensor-03")
  return {
    weather: {
      id: "weather",
      live: false,
      status: temperatureC == null ? "IDLE" : "BOUND",
      nwsCwa: "JAX",
      openMeteoCite: "https://open-meteo.com/",
      nwsCite: "https://api.weather.gov",
      temperatureC,
      note:
        temperatureC == null
          ? "Fort Stewart weather is a simulation input (Open-Meteo + NWS JAX cite). Live Earth Sim weather layers stay off unless the operator turns Live Data on."
          : `${temperatureC}°C cited from Open-Meteo at Fort Stewart. Cite only — not a live METOC COP.`,
    },
    movement: {
      id: "movement",
      live: false,
      status: "BOUND",
      replayTime: frame.replay_time,
      index: safeIndex,
      sampleCount: SAMPLE_COUNT,
      pathTree: "/api/fusarium/movement/snapshot",
      note: "Authored 121-sample Fort Stewart replay. Hypothesis path tree remains live=false.",
    },
    units: (frame.assets as Array<{
      id: string
      label: string
      kind: string
      position: [number, number] | null
      current_position_status?: string
    }>).map((asset) => ({
      id: asset.id,
      label: asset.label,
      kind: asset.kind,
      live: false as const,
      position: asset.position,
      status: asset.current_position_status || "SYNTHETIC",
    })),
    sensors: [
      {
        id: "demo-sensor-03",
        label: sensor?.label || "DEMO SENSOR 03",
        live: false,
        missing: Boolean(sensor && sensor.position == null),
        note: "Fictional mobile sensor from replay-core. Missing every eleventh authored report.",
      },
    ],
    intelBeat: {
      id: pir.id,
      title: pir.shortLabel,
      question: pir.question,
      live: false,
      source: `training PIR + ${document.name}`,
    },
    personnel: {
      live: false,
      roleCount: ROLE_COUNT,
      personaId: persona.persona_id,
      personaTitle: persona.title,
      dutyNote: `Exercise duty context from the 180-role catalog. Current persona: ${persona.title}.`,
      catalogSource: "lib/fusarium/personnel/generated-catalog.json",
    },
    nlm,
    scenarioId: String(scenario.id || "clean"),
    scenarioName: String(scenario.name || "Clean coastal replay"),
    documentName: String(document.name || "ITDX26 packaged catalog"),
  }
}

export function buildFrame(options: {
  index?: number
  running?: boolean
  nlm?: ScenarioNlmVar
  temperatureC?: number | null
  now?: string
}): ScenarioSimFrame {
  const index = options.index ?? 0
  const running = Boolean(options.running)
  const clockIso =
    options.now ||
    new Date(Date.parse(START_UTC) + index * STEP_SECONDS * 1000).toISOString()
  return {
    schema: SCENARIO_SIM_SCHEMA,
    live: false,
    banner: SCENARIO_SIM_BANNER,
    classification: "UNCLASSIFIED",
    runId: SCENARIO_RUN_ID,
    datasetId: SCENARIO_DATASET_ID,
    ao: {
      place: SCENARIO_AO_PLACE,
      lng: SCENARIO_AO_LNG,
      lat: SCENARIO_AO_LAT,
      live: false,
      source: "public Wikipedia / USGS GNIS Fort Stewart; ITDX replay-core",
    },
    index,
    clockIso,
    running,
    variables: buildVariables(index, options.nlm || IDLE_NLM, options.temperatureC ?? null),
    surfaces: listScenarioSurfaces(running),
  }
}

export function emptyWeights(): ScenarioNlmWeight[] {
  return []
}

export { ASSETS, SAMPLE_COUNT, DOCUMENTS, SCENARIOS }
