/**
 * Read-only fleet and future device-safety seam for Command & Control.
 *
 * This module deliberately contains static catalog metadata only. It has no
 * transport, live device state, environmental data, physical location, or
 * execution capability.
 */

export type CommercialClassification = "UNCLASSIFIED"

export type FleetDeviceId =
  | "mushroom-1"
  | "psathyrella"
  | "agaric-mini"
  | "agaric-standard"
  | "agaric-heavy"

export type FleetMobilityCategory = "ground" | "aquatic" | "flying"
export type FleetPlatformProfile = "land" | "marine_buoy" | "uav"

export interface FleetCatalogDevice {
  readonly kind: "device"
  readonly id: FleetDeviceId
  readonly name: string
  readonly mobilityCategory: FleetMobilityCategory
  readonly platformProfile: FleetPlatformProfile
  readonly classification: CommercialClassification
  readonly provenance: "static_catalog"
}

export interface FleetTruthBoundary {
  readonly endpointReachability: "unavailable"
  readonly identity: "unverified"
  readonly schema: "unverified"
  readonly freshness: "unknown"
  readonly provenance: "static_catalog"
  readonly coverage: "unknown"
  readonly coverageContract: "none"
  readonly dataPresence: "unknown"
  readonly actualExecution: "unavailable"
}

export type ControlStage = "observed" | "proposed" | "approved" | "executed"
export type ControlStageAvailability = "unavailable" | "session_local"

export interface ControlStageState {
  readonly stage: ControlStage
  readonly availability: ControlStageAvailability
  readonly retention: "none" | "session_only"
  readonly actualExecution: "unavailable"
  readonly note: string
}

export type ProposalOrigin = "human" | "natural_language" | "myca"

export interface SessionLocalProposalInput {
  readonly id: string
  readonly summary: string
  readonly origin: ProposalOrigin
  readonly rationale?: string | null
}

export interface SessionLocalProposal {
  readonly kind: "session_local_proposal"
  readonly id: string
  readonly summary: string
  readonly origin: ProposalOrigin
  readonly rationale: string | null
  readonly stage: "proposed"
  readonly scope: "session_local"
  readonly approval: "unavailable"
  readonly actualExecution: "unavailable"
  readonly externalSideEffects: "none"
  readonly classification: CommercialClassification
}

export type CertifiedControlPrerequisiteId =
  | "signed-authenticated-commands"
  | "expiry-nonces-idempotency"
  | "device-local-safety-limits"
  | "geofencing-collision-environmental-constraints"
  | "positive-acknowledgement"
  | "emergency-stop-manual-override"
  | "lost-link-safe-behavior"
  | "simulation-hardware-in-the-loop"
  | "authority-separation"
  | "immutable-audit"

export interface CertifiedControlPrerequisite {
  readonly id: CertifiedControlPrerequisiteId
  readonly label: string
  readonly state: "future_prerequisite_unmet"
  readonly identified: false
  readonly verified: false
  readonly enabled: false
}

export type StandardsProfileSeamId =
  | "mission-plan-exchange"
  | "environmental-observation-evidence"
  | "device-telemetry"
  | "command-safety-assurance"
  | "identity-signing"
  | "classification-data-handling"
  | "geospatial-map"
  | "joint-all-domain-gateway"

export interface StandardsProfileSeam {
  readonly id: StandardsProfileSeamId
  readonly label: string
  readonly profile: "unidentified"
  readonly state: "disabled"
  readonly enabled: false
  readonly verified: false
  readonly complianceClaim: "none"
}

export interface CoordinationHandoffSeam {
  readonly direction: "c2_to_gcs" | "gcs_to_c2" | "c2_to_earth" | "earth_to_c2"
  readonly owner: "command_and_control" | "gcs" | "earth_simulator"
  readonly exchangeProfile: "unidentified"
  readonly state: "disabled_unverified"
  readonly fieldsRequired: readonly string[]
  readonly externalSideEffects: "none"
  readonly note: string
}

export const COMMERCIAL_UNCLASSIFIED_BOUNDARY = Object.freeze({
  classification: "UNCLASSIFIED" as const,
  operatingContext: "commercial" as const,
  militaryClaim: "none" as const,
  jadc2Claim: "none" as const,
  fedrampClaim: "none" as const,
  accreditationClaim: "none" as const,
  note: "Commercial UNCLASSIFIED context only; no military, JADC2, FedRAMP, or accreditation claim is made.",
})

export const FLEET_DEVICE_CATALOG: readonly FleetCatalogDevice[] = Object.freeze([
  Object.freeze({
    kind: "device" as const,
    id: "mushroom-1" as const,
    name: "Mushroom 1",
    mobilityCategory: "ground" as const,
    platformProfile: "land" as const,
    classification: "UNCLASSIFIED" as const,
    provenance: "static_catalog" as const,
  }),
  Object.freeze({
    kind: "device" as const,
    id: "psathyrella" as const,
    name: "Psathyrella",
    mobilityCategory: "aquatic" as const,
    platformProfile: "marine_buoy" as const,
    classification: "UNCLASSIFIED" as const,
    provenance: "static_catalog" as const,
  }),
  Object.freeze({
    kind: "device" as const,
    id: "agaric-mini" as const,
    name: "Agaric Mini",
    mobilityCategory: "flying" as const,
    platformProfile: "uav" as const,
    classification: "UNCLASSIFIED" as const,
    provenance: "static_catalog" as const,
  }),
  Object.freeze({
    kind: "device" as const,
    id: "agaric-standard" as const,
    name: "Agaric Standard",
    mobilityCategory: "flying" as const,
    platformProfile: "uav" as const,
    classification: "UNCLASSIFIED" as const,
    provenance: "static_catalog" as const,
  }),
  Object.freeze({
    kind: "device" as const,
    id: "agaric-heavy" as const,
    name: "Agaric Heavy-Lift",
    mobilityCategory: "flying" as const,
    platformProfile: "uav" as const,
    classification: "UNCLASSIFIED" as const,
    provenance: "static_catalog" as const,
  }),
])

/** A future taxonomy placeholder, explicitly not a device or deployed asset. */
export const FUTURE_MOBILE_PROFILE = Object.freeze({
  kind: "future_category" as const,
  category: "mobile" as const,
  profile: "unidentified" as const,
  catalogDevice: false as const,
  availability: "unavailable" as const,
  classification: "UNCLASSIFIED" as const,
  provenance: "future_profile" as const,
  note: "Taxonomy placeholder only; this is not a device, asset, or execution-capable profile.",
})

export const FLEET_TRUTH_BOUNDARY: FleetTruthBoundary = Object.freeze({
  endpointReachability: "unavailable",
  identity: "unverified",
  schema: "unverified",
  freshness: "unknown",
  provenance: "static_catalog",
  coverage: "unknown",
  coverageContract: "none",
  dataPresence: "unknown",
  actualExecution: "unavailable",
})

export const PSATHYRELLA_IDENTITY_CONFLICT = Object.freeze({
  kind: "identity_alias_conflict" as const,
  catalogId: "psathyrella" as const,
  conflictingAliases: Object.freeze(["psathyrella-1", "psathyrella-buoy-com4", "mycobrain-COM4"] as const),
  resolution: "unresolved" as const,
  identity: "unverified" as const,
  note: "Aliases are recorded for review only and must not be resolved to a physical target.",
})

export const EARTH_SIMULATOR_SEAM = Object.freeze({
  kind: "integration_seam" as const,
  label: "Earth Simulator",
  interaction: "link_only" as const,
  access: "read_only" as const,
  verification: "unverified" as const,
  mapContract: "none" as const,
  dataContract: "none" as const,
  deviceStateContract: "none" as const,
  actualExecution: "unavailable" as const,
  note: "Link-only seam; no map, data, live-device, or execution contract is asserted.",
})

export const DEVICE_APP_OWNERSHIP = Object.freeze({
  commandAndControlOwns: Object.freeze([
    "mission and environmental context",
    "intelligence and evidence linkage",
    "personnel review and policy readiness",
    "inert proposals and interoperability handoffs",
  ] as const),
  gcsOwns: Object.freeze([
    "device-specific telemetry presentation",
    "device-specific operation",
    "device safety interaction",
    "physical-device integration",
  ] as const),
  boundary: "C2 coordinates context and review; it does not duplicate or invoke the GCS device plane." as const,
})

const handoffSeam = (
  direction: CoordinationHandoffSeam["direction"],
  owner: CoordinationHandoffSeam["owner"],
  fieldsRequired: readonly string[],
  note: string,
): CoordinationHandoffSeam =>
  Object.freeze({
    direction,
    owner,
    exchangeProfile: "unidentified",
    state: "disabled_unverified",
    fieldsRequired: Object.freeze([...fieldsRequired]),
    externalSideEffects: "none",
    note,
  })

/** Contract requirements only. These seams do not connect to either application. */
export const COORDINATION_HANDOFF_SEAMS: readonly CoordinationHandoffSeam[] = Object.freeze([
  handoffSeam(
    "c2_to_gcs",
    "command_and_control",
    [
      "mission and area identity",
      "time range and LIVE REPLAY FORECAST SIMULATED mode",
      "canonical selected device identity",
      "environmental object and evidence references",
      "human review and policy result",
      "proposal text and non-executable waypoint labels",
      "provenance and all truth axes",
    ],
    "Future context handoff only; no tasking, low-level instruction, or physical operation may be included.",
  ),
  handoffSeam(
    "gcs_to_c2",
    "gcs",
    [
      "canonical device identity and explicit alias mapping",
      "versioned read-snapshot schema",
      "source identity and verification result",
      "observed and received timestamps",
      "provenance freshness coverage and data presence",
      "read-only safety state",
      "device-originated receipt and outcome proof when independently verified",
    ],
    "Claude-owned GCS must expose a bounded read adapter; interface-local ledger events are insufficient.",
  ),
  handoffSeam(
    "c2_to_earth",
    "command_and_control",
    [
      "mission area and time range",
      "mode and selected environmental object",
      "selected device catalog identity",
      "evidence references and classification",
    ],
    "Context-preserving navigation only; no map layer or device state is transferred in this phase.",
  ),
  handoffSeam(
    "earth_to_c2",
    "earth_simulator",
    [
      "returned selection identity",
      "map and environmental layer schema",
      "provenance freshness coverage and data presence",
      "simulation or observation mode",
    ],
    "A reverse selection contract is required before Earth Simulator state can appear in C2.",
  ),
])

export const GCS_ACKNOWLEDGMENT_BOUNDARY = Object.freeze({
  ledgerAcknowledgment: "interface_local_only" as const,
  deviceOriginatedProof: "unavailable" as const,
  physicalExecutionProof: "unavailable" as const,
  positiveOutcomeRequired: true as const,
  note: "A GCS ledger ACK records an interface event; it is not device-originated proof of receipt, outcome, or physical execution.",
})

export const CONTROL_STATE_MODEL: Readonly<Record<ControlStage, ControlStageState>> = Object.freeze({
  observed: Object.freeze({
    stage: "observed",
    availability: "unavailable",
    retention: "none",
    actualExecution: "unavailable",
    note: "No live device state is observed.",
  }),
  proposed: Object.freeze({
    stage: "proposed",
    availability: "session_local",
    retention: "session_only",
    actualExecution: "unavailable",
    note: "A proposal is a session-local draft and is never executable.",
  }),
  approved: Object.freeze({
    stage: "approved",
    availability: "unavailable",
    retention: "none",
    actualExecution: "unavailable",
    note: "No approved device package exists.",
  }),
  executed: Object.freeze({
    stage: "executed",
    availability: "unavailable",
    retention: "none",
    actualExecution: "unavailable",
    note: "No physical execution or acknowledgement is available.",
  }),
})

export const MANUAL_CONTROL_POLICY = Object.freeze({
  mode: "disabled" as const,
  actualExecution: "unavailable" as const,
  note: "Manual device operation is not implemented or available.",
})

export const PROPOSAL_INPUT_POLICY = Object.freeze({
  naturalLanguage: "session_local_only" as const,
  myca: "session_local_only" as const,
  retention: "session_only" as const,
  approval: "unavailable" as const,
  actualExecution: "unavailable" as const,
  externalSideEffects: "none" as const,
})

const prerequisite = (
  id: CertifiedControlPrerequisiteId,
  label: string,
): CertifiedControlPrerequisite =>
  Object.freeze({
    id,
    label,
    state: "future_prerequisite_unmet",
    identified: false,
    verified: false,
    enabled: false,
  })

export const CERTIFIED_CONTROL_PREREQUISITES: readonly CertifiedControlPrerequisite[] = Object.freeze([
  prerequisite("signed-authenticated-commands", "Signed and authenticated commands"),
  prerequisite("expiry-nonces-idempotency", "Expiry, nonces, and idempotency"),
  prerequisite("device-local-safety-limits", "Device-local safety limits and rejection"),
  prerequisite(
    "geofencing-collision-environmental-constraints",
    "Geofencing, collision avoidance, and environmental constraints",
  ),
  prerequisite("positive-acknowledgement", "Positive acknowledgement of receipt and outcome"),
  prerequisite("emergency-stop-manual-override", "Emergency stop and manual override"),
  prerequisite("lost-link-safe-behavior", "Defined lost-link and safe-state behavior"),
  prerequisite("simulation-hardware-in-the-loop", "Simulation and hardware-in-the-loop acceptance"),
  prerequisite("authority-separation", "Separation of proposal, approval, authority, and verification"),
  prerequisite("immutable-audit", "Immutable audit of every state transition"),
])

const standardsSeam = (id: StandardsProfileSeamId, label: string): StandardsProfileSeam =>
  Object.freeze({
    id,
    label,
    profile: "unidentified",
    state: "disabled",
    enabled: false,
    verified: false,
    complianceClaim: "none",
  })

export const STANDARDS_PROFILE_SEAMS: readonly StandardsProfileSeam[] = Object.freeze([
  standardsSeam("mission-plan-exchange", "Mission plan exchange"),
  standardsSeam("environmental-observation-evidence", "Environmental observation and evidence"),
  standardsSeam("device-telemetry", "Device telemetry"),
  standardsSeam("command-safety-assurance", "Command safety and assurance"),
  standardsSeam("identity-signing", "Identity and signing"),
  standardsSeam("classification-data-handling", "Classification and data handling"),
  standardsSeam("geospatial-map", "Geospatial and map"),
  standardsSeam("joint-all-domain-gateway", "Joint/all-domain gateway"),
])

export function listFleetDevices(): readonly FleetCatalogDevice[] {
  return FLEET_DEVICE_CATALOG
}

/** Canonical catalog lookup only; unresolved aliases intentionally do not resolve. */
export function findFleetDevice(id: string): FleetCatalogDevice | null {
  return FLEET_DEVICE_CATALOG.find((device) => device.id === id) ?? null
}

/** Build an inert proposal value without persistence, approval, or side effects. */
export function createSessionLocalProposal(input: SessionLocalProposalInput): SessionLocalProposal {
  const id = input.id.trim()
  const summary = input.summary.trim()
  if (!id) throw new TypeError("A session-local proposal id is required.")
  if (!summary) throw new TypeError("A session-local proposal summary is required.")

  return Object.freeze({
    kind: "session_local_proposal",
    id,
    summary,
    origin: input.origin,
    rationale: input.rationale?.trim() || null,
    stage: "proposed",
    scope: "session_local",
    approval: "unavailable",
    actualExecution: "unavailable",
    externalSideEffects: "none",
    classification: "UNCLASSIFIED",
  })
}

/** Assemble the immutable values a read-only UI may render. */
export function buildFleetReadOnlySnapshot() {
  return Object.freeze({
    classificationBoundary: COMMERCIAL_UNCLASSIFIED_BOUNDARY,
    devices: FLEET_DEVICE_CATALOG,
    futureMobileProfile: FUTURE_MOBILE_PROFILE,
    truthBoundary: FLEET_TRUTH_BOUNDARY,
    psathyrellaIdentityConflict: PSATHYRELLA_IDENTITY_CONFLICT,
    earthSimulatorSeam: EARTH_SIMULATOR_SEAM,
    deviceAppOwnership: DEVICE_APP_OWNERSHIP,
    coordinationHandoffSeams: COORDINATION_HANDOFF_SEAMS,
    gcsAcknowledgmentBoundary: GCS_ACKNOWLEDGMENT_BOUNDARY,
    stateModel: CONTROL_STATE_MODEL,
    manualPolicy: MANUAL_CONTROL_POLICY,
    proposalPolicy: PROPOSAL_INPUT_POLICY,
    certifiedPrerequisites: CERTIFIED_CONTROL_PREREQUISITES,
    standardsProfiles: STANDARDS_PROFILE_SEAMS,
  })
}
