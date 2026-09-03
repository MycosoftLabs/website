export const MECHANICAL_ARM_READINESS_SCHEMA = "mycosoft.mechanical.arm-readiness.v1" as const
export const MECHANICAL_PASSIVE_SELF_CHECK_SCHEMA = "mycosoft.mechanical.passive-self-check.v1" as const

export type ArmReadinessState =
  | "verified"
  | "unbound"
  | "not_probed"
  | "unavailable"
  | "failed"
  | "quarantined"

export interface ArmReadinessSignal {
  state: ArmReadinessState
  message: string
  observedAt: string | null
  evidenceRef: string | null
}

export interface ArmDeviceCandidate {
  deviceId: string
  label: string
  manufacturer: "Elephant Robotics"
  model: "myCobot 280 Pi 2023"
  exactModelVerified: false
  serialNumber: null
  profileState: "candidate"
}

export interface ArmReferenceProfile {
  profileId: "elephant.mycobot-280-pi-2023"
  model: "myCobot 280 Pi 2023"
  degreesOfFreedom: 6
  workingRadiusMm: 280
  ratedPayloadG: 250
  sdkPackage: "pymycobot"
  sdkClass: "MyCobot280"
  directSerialReference: {
    port: "/dev/ttyAMA0"
    baud: 1_000_000
    state: "official_reference_not_observed"
  }
  jointRangesDeg: readonly [
    readonly [-168, 168],
    readonly [-140, 140],
    readonly [-150, 150],
    readonly [-150, 150],
    readonly [-155, 160],
    readonly [-180, 180],
  ]
}

export const MYCOBOT_280_PI_2023_PROFILE: ArmReferenceProfile = {
  profileId: "elephant.mycobot-280-pi-2023",
  model: "myCobot 280 Pi 2023",
  degreesOfFreedom: 6,
  workingRadiusMm: 280,
  ratedPayloadG: 250,
  sdkPackage: "pymycobot",
  sdkClass: "MyCobot280",
  directSerialReference: {
    port: "/dev/ttyAMA0",
    baud: 1_000_000,
    state: "official_reference_not_observed",
  },
  jointRangesDeg: [
    [-168, 168],
    [-140, 140],
    [-150, 150],
    [-150, 150],
    [-155, 160],
    [-180, 180],
  ],
}

export const MECHANICAL_ARM_CANDIDATES: readonly ArmDeviceCandidate[] = [
  {
    deviceId: "lab-mycobot-280-pi-2023-candidate",
    label: "Lab myCobot 280 Pi 2023 · identity pending",
    manufacturer: "Elephant Robotics",
    model: "myCobot 280 Pi 2023",
    exactModelVerified: false,
    serialNumber: null,
    profileState: "candidate",
  },
]

export type FlexMotionGateId =
  | "device_identity"
  | "exact_model"
  | "canonical_service"
  | "serial_port"
  | "firmware_sdk"
  | "joint_limits"
  | "emergency_stop"
  | "deadman"
  | "workspace_clear"
  | "explicit_operator_action"

export const FLEX_MOTION_GATE_LABELS: Record<FlexMotionGateId, string> = {
  device_identity: "Physical device identity and serial number",
  exact_model: "Exact installed model",
  canonical_service: "Canonical adapter service",
  serial_port: "Observed serial transport",
  firmware_sdk: "Firmware and SDK compatibility",
  joint_limits: "Installed joint limits",
  emergency_stop: "Independent emergency stop",
  deadman: "Operator deadman control",
  workspace_clear: "Clear physical workspace",
  explicit_operator_action: "Explicit in-person operator action",
}

export type ArmTelemetryProvenance = "device_read" | "simulated" | "placeholder" | null

export interface ArmReadinessSnapshot {
  schema: typeof MECHANICAL_ARM_READINESS_SCHEMA
  deviceId: string
  profileId: ArmReferenceProfile["profileId"]
  observedAt: string | null
  identity: ArmReadinessSignal
  service: ArmReadinessSignal
  sdk: ArmReadinessSignal
  serial: ArmReadinessSignal
  camera: ArmReadinessSignal
  proprioception: ArmReadinessSignal
  telemetry: {
    state: "withheld" | "verified" | "simulated" | "quarantined"
    jointsDeg: readonly number[] | null
    coordinates: readonly number[] | null
    observedAt: string | null
    provenance: ArmTelemetryProvenance
  }
  flexGates: Record<FlexMotionGateId, ArmReadinessSignal>
}

const notProbed = (message: string): ArmReadinessSignal => ({
  state: "not_probed",
  message,
  observedAt: null,
  evidenceRef: null,
})

const unbound = (message: string): ArmReadinessSignal => ({
  state: "unbound",
  message,
  observedAt: null,
  evidenceRef: null,
})

export function createUnboundArmReadiness(deviceId: string): ArmReadinessSnapshot {
  const flexGates = Object.fromEntries(
    (Object.keys(FLEX_MOTION_GATE_LABELS) as FlexMotionGateId[]).map((gate) => [
      gate,
      notProbed(`${FLEX_MOTION_GATE_LABELS[gate]} has not been verified.`),
    ]),
  ) as Record<FlexMotionGateId, ArmReadinessSignal>

  return {
    schema: MECHANICAL_ARM_READINESS_SCHEMA,
    deviceId,
    profileId: MYCOBOT_280_PI_2023_PROFILE.profileId,
    observedAt: null,
    identity: notProbed("The physical unit serial number and registry identity have not been observed."),
    service: unbound("No canonical myCobot adapter service has been selected or probed."),
    sdk: notProbed("The installed pymycobot version and MyCobot280 class have not been probed."),
    serial: notProbed("No serial port has been opened. The official Pi port and baud remain reference values only."),
    camera: notProbed("No camera device or stream has been opened."),
    proprioception: unbound("No provenance-bearing joint-state provider is bound."),
    telemetry: {
      state: "withheld",
      jointsDeg: null,
      coordinates: null,
      observedAt: null,
      provenance: null,
    },
    flexGates,
  }
}

export interface PassiveArmSelfCheckRequest {
  schema: typeof MECHANICAL_PASSIVE_SELF_CHECK_SCHEMA
  action: "passive_readiness_check"
  deviceId: string
  constraints: {
    allowMotion: false
    allowPowerChange: false
    allowServoWrite: false
    allowFirmwareChange: false
    allowCalibration: false
  }
}

export function buildPassiveArmSelfCheckRequest(deviceId: string): PassiveArmSelfCheckRequest {
  return {
    schema: MECHANICAL_PASSIVE_SELF_CHECK_SCHEMA,
    action: "passive_readiness_check",
    deviceId,
    constraints: {
      allowMotion: false,
      allowPowerChange: false,
      allowServoWrite: false,
      allowFirmwareChange: false,
      allowCalibration: false,
    },
  }
}

export interface PassiveArmSelfCheckResult {
  state: "ready" | "blocked" | "failed" | "quarantined"
  motionFree: true
  contactedHardware: false
  checked: readonly ["service", "sdk", "serial", "camera", "proprioception"]
  reasons: string[]
}

export function evaluatePassiveArmSelfCheck(snapshot: ArmReadinessSnapshot): PassiveArmSelfCheckResult {
  const reasons: string[] = []
  const signals = [
    ["Service", snapshot.service],
    ["SDK", snapshot.sdk],
    ["Serial", snapshot.serial],
    ["Camera", snapshot.camera],
    ["Proprioception", snapshot.proprioception],
  ] as const

  const fabricatedConnection = snapshot.identity.state === "verified"
    && (snapshot.service.state !== "verified" || snapshot.serial.state !== "verified")
  const placeholderTelemetry = snapshot.telemetry.provenance === "placeholder"
    || snapshot.telemetry.state === "quarantined"

  if (fabricatedConnection) reasons.push("Connected identity is unsupported without verified service and serial evidence.")
  if (placeholderTelemetry) reasons.push("Placeholder telemetry is quarantined and cannot establish readiness.")
  if (snapshot.telemetry.jointsDeg && snapshot.telemetry.jointsDeg.length !== MYCOBOT_280_PI_2023_PROFILE.degreesOfFreedom) {
    reasons.push("Joint telemetry does not contain exactly six axes.")
  }
  if (snapshot.telemetry.state === "verified" && (!snapshot.telemetry.observedAt || snapshot.telemetry.provenance !== "device_read")) {
    reasons.push("Verified telemetry requires a device-read timestamp and provenance.")
  }

  if (fabricatedConnection || placeholderTelemetry) {
    return { state: "quarantined", motionFree: true, contactedHardware: false, checked: ["service", "sdk", "serial", "camera", "proprioception"], reasons }
  }

  for (const [label, signal] of signals) {
    if (signal.state !== "verified") reasons.push(`${label}: ${signal.message}`)
  }
  const failed = signals.some(([, signal]) => signal.state === "failed")
  return {
    state: reasons.length === 0 ? "ready" : failed ? "failed" : "blocked",
    motionFree: true,
    contactedHardware: false,
    checked: ["service", "sdk", "serial", "camera", "proprioception"],
    reasons,
  }
}

export function flexMotionReadiness(snapshot: ArmReadinessSnapshot) {
  const missing = (Object.keys(FLEX_MOTION_GATE_LABELS) as FlexMotionGateId[])
    .filter((gate) => snapshot.flexGates[gate].state !== "verified")
    .map((gate) => FLEX_MOTION_GATE_LABELS[gate])
  return { canMove: missing.length === 0, missing }
}
