export type GlobalControlDeviceKind = "aquatic" | "flying" | "walking"
export type GlobalControlView = "overview" | "mission" | "payload" | "systems"

export interface GlobalControlStatusField {
  label: string
  unit?: string
}

export interface GlobalControlControlAxis {
  label: string
  negative: string
  positive: string
}

export interface GlobalControlDeviceProfile {
  id: "psathyrella" | "agaric" | "mushroom-1"
  displayName: string
  kind: GlobalControlDeviceKind
  vehicleLabel: string
  operationLabel: string
  adapterState: "presentation-only" | "unbound"
  presentationRoute: string | null
  telemetryEndpoint: string | null
  commandEndpoint: string | null
  commandAuthority: "none"
  capabilities: readonly string[]
  modes: readonly string[]
  axes: readonly GlobalControlControlAxis[]
  statusFields: readonly GlobalControlStatusField[]
  sensors: readonly string[]
  payloads: readonly string[]
  missionChecks: readonly string[]
}

/**
 * Product profiles describe the three intended Global Control System vehicles. They are not
 * evidence that hardware, telemetry, command authority, or an adapter is connected.
 *
 * Shared compute/control architecture, uncertain Agaric part identities, and the evidence
 * required before enabling adapters are recorded in:
 * docs/MYCOSOFT_DEVICE_COMPUTE_AND_CONTROL_ARCHITECTURE_SEP01_2026.md
 */
export const GLOBAL_CONTROL_DEVICE_PROFILES: readonly GlobalControlDeviceProfile[] = [
  {
    id: "psathyrella",
    displayName: "Psathyrella",
    kind: "aquatic",
    vehicleLabel: "Buoy test station",
    operationLabel: "Marine",
    adapterState: "presentation-only",
    presentationRoute: "/natureos/psathyrella",
    telemetryEndpoint: null,
    commandEndpoint: null,
    commandAuthority: "none",
    capabilities: ["buoy navigation", "camera payload", "marine sensing", "mission planning", "device mesh"],
    modes: ["Manual", "Station keep", "Waypoint", "Survey", "Return"],
    axes: [
      { label: "Thrust", negative: "Reverse", positive: "Forward" },
      { label: "Yaw", negative: "Port", positive: "Starboard" },
    ],
    statusFields: [
      { label: "Depth", unit: "m" },
      { label: "Speed", unit: "kn" },
      { label: "Heading", unit: "deg" },
      { label: "Battery", unit: "%" },
    ],
    sensors: ["GNSS", "marine IMU", "BME688", "camera ring", "hydrophones", "radio mesh"],
    payloads: ["marine imaging", "environmental sensing", "acoustic sensing"],
    missionChecks: ["station identity verified", "marine boundary verified", "command session verified", "deadman verified"],
  },
  {
    id: "agaric",
    displayName: "Agaric",
    kind: "flying",
    vehicleLabel: "Flying drone",
    operationLabel: "Flight",
    adapterState: "unbound",
    presentationRoute: null,
    telemetryEndpoint: null,
    commandEndpoint: null,
    commandAuthority: "none",
    capabilities: ["multiaxis flight", "camera payload", "mission planning", "device mesh"],
    modes: ["Manual", "Altitude hold", "Position hold", "Return home", "Mission"],
    axes: [
      { label: "Thrust", negative: "Descend", positive: "Climb" },
      { label: "Yaw", negative: "Rotate left", positive: "Rotate right" },
      { label: "Pitch", negative: "Reverse", positive: "Forward" },
      { label: "Roll", negative: "Left", positive: "Right" },
    ],
    statusFields: [
      { label: "Altitude AGL", unit: "m" },
      { label: "Ground speed", unit: "m/s" },
      { label: "Heading", unit: "deg" },
      { label: "Vertical rate", unit: "m/s" },
    ],
    sensors: ["GNSS", "flight IMU", "barometer", "magnetometer", "motor controller", "payload camera"],
    payloads: ["stabilized imaging", "environmental sensing", "device relay"],
    missionChecks: ["home position verified", "flight boundary verified", "altitude ceiling verified", "command authority verified"],
  },
  {
    id: "mushroom-1",
    displayName: "Mushroom 1",
    kind: "walking",
    vehicleLabel: "Walking drone",
    operationLabel: "Gait",
    adapterState: "unbound",
    presentationRoute: null,
    telemetryEndpoint: null,
    commandEndpoint: null,
    commandAuthority: "none",
    capabilities: ["walking locomotion", "body sensing", "mission planning", "device mesh"],
    modes: ["Stand", "Walk", "Traverse", "Step over", "Return"],
    axes: [
      { label: "Travel", negative: "Reverse", positive: "Forward" },
      { label: "Turn", negative: "Turn left", positive: "Turn right" },
      { label: "Lateral", negative: "Step left", positive: "Step right" },
      { label: "Step height", negative: "Lower", positive: "Raise" },
    ],
    statusFields: [
      { label: "Gait", unit: "" },
      { label: "Body clearance", unit: "cm" },
      { label: "Heading", unit: "deg" },
      { label: "Slope", unit: "deg" },
    ],
    sensors: ["body IMU", "joint encoders", "foot contacts", "motor controllers", "depth camera", "environmental sensors"],
    payloads: ["terrain imaging", "environmental sensing", "sample carrier"],
    missionChecks: ["neutral stance verified", "terrain boundary verified", "step clearance verified", "command authority verified"],
  },
] as const

export function globalControlProfile(id: string): GlobalControlDeviceProfile {
  return GLOBAL_CONTROL_DEVICE_PROFILES.find((profile) => profile.id === id) ?? GLOBAL_CONTROL_DEVICE_PROFILES[0]
}

export function globalControlViewLabel(profile: GlobalControlDeviceProfile, view: GlobalControlView): string {
  if (view === "mission") return `${profile.operationLabel} plan`
  if (view === "payload") return "Payload"
  if (view === "systems") return "Systems"
  return "Overview"
}
