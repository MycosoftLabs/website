import type { HypothesisBranch } from "./geometry"

export const MOVEMENT_SNAPSHOT_SCHEMA = "mycosoft.fusarium.device-movement.v1" as const
export const MOVEMENT_CLASSIFICATION = "UNCLASSIFIED" as const

export type MovementTruth = "live" | "hypothesis" | "NOT_SUPPLIED"
export type MovementSource =
  | "earth-simulator-devices"
  | "mas-registry"
  | "mindex"
  | "device-telemetry"
  | "itdx-weka"
  | "local-geometry"

export interface MovementFix {
  lng: number
  lat: number
  observedAt: string | null
  source: MovementSource
}

export interface LiveMovementDevice {
  id: string
  name: string
  status: string
  source: string
  live: true
  fix: MovementFix
  path: MovementFix[] | "NOT_SUPPLIED"
  headingDeg: number | null
}

export interface CoordinationPair {
  fromId: string
  toId: string
  rangeM: number
  bearingDeg: number
  formula: "haversine + forward azimuth (WGS-84 sphere)"
  live: true
}

export interface TriangulationDepiction {
  observerIds: string[]
  vertices: Array<[number, number]>
  fix: [number, number] | null
  residualM: number | null
  live: boolean
  qualification: "geometric-fix" | "unqualified-proposal"
  note: string
}

export interface PathTreeDepiction {
  origin: [number, number]
  originLabel: string
  branches: HypothesisBranch[]
  live: false
  source: MovementSource
  note: string
}

export interface MovementCommandSeam {
  waypointCommand: "propose-only"
  missionCommand: "propose-only"
  existingCommandApi: "/api/devices/network/[deviceId]/command"
  commandCapability: "ping-health-sensors-only"
  receipt: "NOT_SUPPLIED"
  note: "Network command API exists for health/sensor reads. Waypoint and mission tasking are not accepted; C2 may propose only."
}

export interface MovementSnapshot {
  schema: typeof MOVEMENT_SNAPSHOT_SCHEMA
  classification: typeof MOVEMENT_CLASSIFICATION
  generatedAt: string
  liveDeviceCount: number
  devices: LiveMovementDevice[]
  coordination: CoordinationPair[]
  triangulation: TriangulationDepiction | null
  pathTree: PathTreeDepiction
  commandSeam: MovementCommandSeam
  emptyReason: string | null
  sources: {
    earthSimDevices: "ok" | "error" | "empty"
    telemetryTrails: "ok" | "NOT_SUPPLIED" | "partial"
    itdxWeka: "ok" | "NOT_SUPPLIED"
  }
}
