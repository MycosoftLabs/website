import {
  AO_GEOCODE_SOURCE,
  AO_ORIGIN_LAT,
  AO_ORIGIN_LNG,
  AO_PLACE,
} from "@/lib/itdx/replay-core.mjs"
import type { MovementSnapshot } from "@/lib/fusarium/movement/contracts"
import type { WekaWalkthrough } from "@/lib/itdx/weka-v14-types"

export const ITDX_BRIEFING_CLASSIFICATION = "UNCLASSIFIED" as const
export const ITDX_BRIEFING_BANNER = "SYNTHETIC EXERCISE"
export const ITDX_OPEN_TOPO_CITE =
  "© OpenStreetMap contributors, SRTM · © OpenTopoMap (CC-BY-SA). AWS Terrain hillshade is the default Earth Sim base."

export type ItdxBriefingVariant = "overlay" | "intel-feed" | "workspace"
export type ItdxBriefingSectionId =
  | "ao"
  | "pirs"
  | "playback"
  | "models"
  | "movement"
  | "traffic"
  | "ticks"

export interface ItdxTrainingPir {
  id: string
  shortLabel: string
  question: string
  channelIds: string[]
}

/** Generic public-language training PIRs. Not real CCIR / PIR from a unit. */
export const TRAINING_PIRS: ItdxTrainingPir[] = [
  {
    id: "PIR-W",
    shortLabel: "Weather / environment",
    question:
      "What publicly cited weather is over the Fort Stewart slice, and does it constrain ground movement in this exercise?",
    channelIds: ["weather", "earth2"],
  },
  {
    id: "PIR-M",
    shortLabel: "Movement / pathways",
    question:
      "Which public roads or airfield approaches (Hunter AAF / Hinesville if cited) are supplied as OSINT — not targeting data?",
    channelIds: ["pathways", "navigation", "traffic", "equipment_weapons_assets"],
  },
  {
    id: "PIR-B",
    shortLabel: "Biology / aerosol",
    question:
      "What public biology or aerosol indicators (GBIF / iNaturalist / MINDEX AQ / FIRMS) are supplied for the slice?",
    channelIds: ["biology", "crep"],
  },
  {
    id: "PIR-P",
    shortLabel: "Collection pathways",
    question:
      "What hypothesis collection corridor and possible-path tree are shown for training — live=false?",
    channelIds: ["nlm", "physics"],
  },
]

export interface ItdxChannelFacts {
  reason?: string | null
  capability_class?: string | null
  live?: boolean | null
  temperature_c?: number
  nws?: string
  nws_cwa?: string | null
  open_meteo?: string
  gbif_count?: number
  inaturalist_count?: number
  wikipedia?: Array<{ title: string; url?: string }>
  nominatim?: string[]
}

export interface ItdxChannelRow {
  id: string
  status?: string
  note?: string
  reason?: string | null
  rows?: number
  source_url?: string
  facts?: ItdxChannelFacts
  citations?: Array<{ name: string; url?: string; count?: number | null }>
  chips?: Array<{ id: string; label: string; kind: string; synthetic?: boolean; live?: boolean }>
  geojson?: { type: string; features?: unknown[] } | null
}

export interface ItdxSituationBriefing {
  situation_status?: number
  situation?: {
    schema_version?: string
    channels?: ItdxChannelRow[]
    note?: string
    clock?: string | null
    ao?: { name?: string; bbox?: number[]; center?: number[] }
    official_injects?: { status?: string }
  }
  demo?: ItdxChannelRow[]
  google?: ItdxChannelRow & { configured?: boolean }
  pathways?: ItdxChannelRow
  base?: ItdxChannelRow
  devices?: ItdxChannelRow
  situation_error?: string | null
  live_cop?: boolean
  synthetic?: boolean
  official_injects?: { status?: string; note?: string }
}

export interface ItdxNlmBriefing {
  engine?: {
    state?: string
    health?: string
    ready?: boolean | null
    errors?: string[]
  }
  nlm?: {
    model_loaded?: boolean | null
    forecast_qualified?: boolean
    bound_to_ollama?: boolean
    model_name?: string | null
    weights_sha256?: string | null
    p?: null
    qualification_status?: string | null
    training_origin?: string | null
  }
  training?: {
    state?: string
    reachable?: boolean
    error?: string | null
  }
  provenance?: { provider?: string; note?: string }
}

export interface ItdxTask8Briefing {
  source?: string
  path?: string
  roles?: Array<{ id: string; label: string; verdict: string; bound: boolean; note?: string }>
  options?: Array<{ id?: string; title?: string; formspace_gate?: string; gate?: string }>
  governor?: Array<{
    id: string
    title?: string
    local_gate?: string | null
    mas_approved?: boolean | null
    mas_reason?: string | null
    mas_status?: number
    execution?: string
  }>
  seven_role?: { qualification?: string; missing_artifact?: string }
  myca?: { status?: string; state?: string; is_conscious?: boolean }
  myca_status?: number
  note?: string
}

export interface ItdxBriefingBundle {
  situation: ItdxSituationBriefing | null
  nlm: ItdxNlmBriefing | null
  movement: MovementSnapshot | null
  weka: WekaWalkthrough | null
  task8: ItdxTask8Briefing | null
  situationError: string | null
  nlmError: string | null
  movementError: string | null
  wekaError: string | null
  task8Error: string | null
  loadedAt: string | null
}

export function aoCopy() {
  return {
    place: AO_PLACE,
    lng: AO_ORIGIN_LNG,
    lat: AO_ORIGIN_LAT,
    geocode: AO_GEOCODE_SOURCE,
    openTopo: ITDX_OPEN_TOPO_CITE,
    bbox: [-81.7, 31.8, -81.45, 32.05] as const,
  }
}

export function channelById(channels: ItdxChannelRow[] | undefined, id: string) {
  return channels?.find((channel) => channel.id === id) ?? null
}

export function isSupplied(status?: string) {
  return status === "SUPPLIED" || status === "BOUND"
}

export function shortSha(value?: string | null) {
  if (!value) return "NOT_SUPPLIED"
  return value.length > 16 ? `${value.slice(0, 16)}…` : value
}

export function weatherAnswer(channel: ItdxChannelRow | null) {
  if (!channel) return "Weather channel NOT_SUPPLIED from MAS situation-assessment."
  if (!isSupplied(channel.status) || channel.facts?.temperature_c == null) {
    return `${channel.status || "NOT_SUPPLIED"}${channel.reason ? ` · ${channel.reason}` : channel.note ? ` · ${channel.note}` : ""}`
  }
  const cwa = channel.facts.nws_cwa ? ` ${channel.facts.nws_cwa}` : ""
  return `${channel.facts.temperature_c}°C Open-Meteo · NWS 31.8697,-81.6072${cwa}. Cite only — not a live METOC COP.`
}

export function biologyAnswer(channel: ItdxChannelRow | null) {
  if (!channel) return "Biology channel NOT_SUPPLIED."
  if (!isSupplied(channel.status)) {
    return `${channel.status}${channel.reason ? ` · ${channel.reason}` : ""}`
  }
  return `GBIF fungi ${channel.facts?.gbif_count ?? "—"} · iNaturalist ${channel.facts?.inaturalist_count ?? "—"}. Public occurrence counts, not a field collection.`
}

function haystack(channel: ItdxChannelRow | null) {
  if (!channel) return ""
  const cites = (channel.citations || []).map((row) => `${row.name} ${row.url || ""}`).join(" ")
  return `${channel.note || ""} ${channel.reason || ""} ${(channel.facts?.nominatim || []).join(" ")} ${cites}`.toLowerCase()
}

export function osintPlaceHits(channels: ItdxChannelRow[]) {
  const hits: string[] = []
  for (const channel of channels) {
    const text = haystack(channel)
    if (text.includes("hunter")) hits.push("Hunter Army Airfield (public OSM / situation cite)")
    if (text.includes("hinesville")) hits.push("Hinesville (public OSM / situation cite)")
  }
  return Array.from(new Set(hits))
}

export function movementLines(snapshot: MovementSnapshot | null, error: string | null) {
  if (error) return [`Movement snapshot UNAVAILABLE · ${error}`]
  if (!snapshot) return ["Movement snapshot pending."]
  const lines = [
    `Live registry devices: ${snapshot.liveDeviceCount} (catalog field seeds are not a convoy).`,
    `Path polyline: ${
      snapshot.devices.some((device) => device.path !== "NOT_SUPPLIED")
        ? "telemetry trail SUPPLIED for at least one live device"
        : "NOT_SUPPLIED (need ≥2 fixes)"
    }.`,
    `Coordination pairs: ${snapshot.coordination.length} live (needs ≥2 live devices).`,
    `Triangulation: live=${String(snapshot.triangulation?.live ?? false)} · ${
      snapshot.triangulation?.qualification || "unqualified-proposal"
    }.`,
    `Path tree: live=false · source ${snapshot.pathTree.source} · hypothesis only.`,
    `C2 waypoints: ${snapshot.commandSeam.waypointCommand} · receipt ${snapshot.commandSeam.receipt}.`,
  ]
  if (snapshot.emptyReason) lines.push(snapshot.emptyReason)
  return lines
}

export function wekaLine(receipt: WekaWalkthrough | null, error: string | null) {
  if (error) return `Weka receipt ${error}. No synthetic PASS is drawn.`
  if (!receipt) return "Weka receipt pending."
  const tasks = receipt.cases.flatMap((entry) => entry.tasks)
  const first = tasks[0]
  return `verify ${receipt.verify_status} · arithmetic ${receipt.arithmetic_status} (${receipt.arithmetic_checks}) · trial ${
    receipt.trial_criteria_status || "UNKNOWN"
  } · field ${receipt.field_readiness || "NOT_ESTABLISHED"} · F1 ${
    first?.f1 == null ? "undefined" : first.f1.toFixed(4)
  } · abstain ${first?.abstentions ?? "—"}.`
}

export function defaultOpenSections(variant: ItdxBriefingVariant): ItdxBriefingSectionId[] {
  if (variant === "overlay") return ["ao", "pirs", "playback", "models"]
  if (variant === "workspace") return []
  return ["ao", "pirs", "playback", "models", "movement", "traffic"]
}
