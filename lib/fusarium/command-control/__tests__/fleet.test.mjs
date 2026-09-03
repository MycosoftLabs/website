import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  CERTIFIED_CONTROL_PREREQUISITES,
  COORDINATION_HANDOFF_SEAMS,
  COMMERCIAL_UNCLASSIFIED_BOUNDARY,
  CONTROL_STATE_MODEL,
  EARTH_SIMULATOR_SEAM,
  DEVICE_APP_OWNERSHIP,
  FLEET_DEVICE_CATALOG,
  FLEET_TRUTH_BOUNDARY,
  FUTURE_MOBILE_PROFILE,
  MANUAL_CONTROL_POLICY,
  GCS_ACKNOWLEDGMENT_BOUNDARY,
  PROPOSAL_INPUT_POLICY,
  PSATHYRELLA_IDENTITY_CONFLICT,
  STANDARDS_PROFILE_SEAMS,
  buildFleetReadOnlySnapshot,
  createSessionLocalProposal,
  findFleetDevice,
  listFleetDevices,
} from "../fleet.ts"

const source = readFileSync(fileURLToPath(new URL("../fleet.ts", import.meta.url)), "utf8")

function objectKeys(value, keys = []) {
  if (!value || typeof value !== "object") return keys
  if (Array.isArray(value)) {
    for (const item of value) objectKeys(item, keys)
    return keys
  }
  for (const [key, nested] of Object.entries(value)) {
    keys.push(key.toLowerCase())
    objectKeys(nested, keys)
  }
  return keys
}

test("static fleet catalog contains only the five verified catalog identities", () => {
  assert.deepEqual(
    FLEET_DEVICE_CATALOG.map(({ id, name, mobilityCategory, platformProfile }) => ({
      id,
      name,
      mobilityCategory,
      platformProfile,
    })),
    [
      { id: "mushroom-1", name: "Mushroom 1", mobilityCategory: "ground", platformProfile: "land" },
      {
        id: "psathyrella",
        name: "Psathyrella",
        mobilityCategory: "aquatic",
        platformProfile: "marine_buoy",
      },
      { id: "agaric-mini", name: "Agaric Mini", mobilityCategory: "flying", platformProfile: "uav" },
      {
        id: "agaric-standard",
        name: "Agaric Standard",
        mobilityCategory: "flying",
        platformProfile: "uav",
      },
      {
        id: "agaric-heavy",
        name: "Agaric Heavy-Lift",
        mobilityCategory: "flying",
        platformProfile: "uav",
      },
    ],
  )
  assert.strictEqual(listFleetDevices(), FLEET_DEVICE_CATALOG)
  assert.equal(findFleetDevice("mushroom-1")?.name, "Mushroom 1")
  assert.ok(FLEET_DEVICE_CATALOG.every((device) => device.kind === "device"))
  assert.ok(FLEET_DEVICE_CATALOG.every((device) => device.classification === "UNCLASSIFIED"))
  assert.ok(FLEET_DEVICE_CATALOG.every((device) => device.provenance === "static_catalog"))
  assert.ok(Object.isFrozen(FLEET_DEVICE_CATALOG))
  assert.ok(FLEET_DEVICE_CATALOG.every(Object.isFrozen))
})

test("truth boundary never implies live data, verified identity, coverage, or execution", () => {
  assert.deepEqual(FLEET_TRUTH_BOUNDARY, {
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
})

test("future mobile taxonomy and Psathyrella aliases cannot masquerade as devices", () => {
  assert.equal(FUTURE_MOBILE_PROFILE.kind, "future_category")
  assert.equal(FUTURE_MOBILE_PROFILE.category, "mobile")
  assert.equal(FUTURE_MOBILE_PROFILE.profile, "unidentified")
  assert.equal(FUTURE_MOBILE_PROFILE.catalogDevice, false)
  assert.equal(FUTURE_MOBILE_PROFILE.availability, "unavailable")

  assert.equal(PSATHYRELLA_IDENTITY_CONFLICT.catalogId, "psathyrella")
  assert.deepEqual(PSATHYRELLA_IDENTITY_CONFLICT.conflictingAliases, [
    "psathyrella-1",
    "psathyrella-buoy-com4",
    "mycobrain-COM4",
  ])
  assert.equal(PSATHYRELLA_IDENTITY_CONFLICT.resolution, "unresolved")
  assert.equal(PSATHYRELLA_IDENTITY_CONFLICT.identity, "unverified")
  assert.equal(findFleetDevice("psathyrella-1"), null)
  assert.equal(findFleetDevice("psathyrella-buoy-com4"), null)
  assert.equal(findFleetDevice("mycobrain-COM4"), null)
})

test("Earth Simulator remains a link-only read-only seam with no map or data contract", () => {
  assert.equal(EARTH_SIMULATOR_SEAM.interaction, "link_only")
  assert.equal(EARTH_SIMULATOR_SEAM.access, "read_only")
  assert.equal(EARTH_SIMULATOR_SEAM.verification, "unverified")
  assert.equal(EARTH_SIMULATOR_SEAM.mapContract, "none")
  assert.equal(EARTH_SIMULATOR_SEAM.dataContract, "none")
  assert.equal(EARTH_SIMULATOR_SEAM.deviceStateContract, "none")
  assert.equal(EARTH_SIMULATOR_SEAM.actualExecution, "unavailable")
})

test("C2 stays above GCS and all bidirectional seams remain inert and unverified", () => {
  assert.match(DEVICE_APP_OWNERSHIP.boundary, /does not duplicate or invoke the GCS device plane/i)
  assert.deepEqual(COORDINATION_HANDOFF_SEAMS.map((item) => item.direction), [
    "c2_to_gcs",
    "gcs_to_c2",
    "c2_to_earth",
    "earth_to_c2",
  ])
  assert.ok(COORDINATION_HANDOFF_SEAMS.every((item) => item.state === "disabled_unverified"))
  assert.ok(COORDINATION_HANDOFF_SEAMS.every((item) => item.externalSideEffects === "none"))
  assert.equal(GCS_ACKNOWLEDGMENT_BOUNDARY.ledgerAcknowledgment, "interface_local_only")
  assert.equal(GCS_ACKNOWLEDGMENT_BOUNDARY.deviceOriginatedProof, "unavailable")
  assert.equal(GCS_ACKNOWLEDGMENT_BOUNDARY.physicalExecutionProof, "unavailable")
  assert.match(GCS_ACKNOWLEDGMENT_BOUNDARY.note, /not device-originated proof/i)
})

test("four-stage state model stops at an inert session-local proposal", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(CONTROL_STATE_MODEL).map(([stage, value]) => [stage, value.availability])),
    {
      observed: "unavailable",
      proposed: "session_local",
      approved: "unavailable",
      executed: "unavailable",
    },
  )
  assert.ok(Object.values(CONTROL_STATE_MODEL).every((stage) => stage.actualExecution === "unavailable"))
  assert.equal(MANUAL_CONTROL_POLICY.mode, "disabled")
  assert.equal(MANUAL_CONTROL_POLICY.actualExecution, "unavailable")
  assert.equal(PROPOSAL_INPUT_POLICY.naturalLanguage, "session_local_only")
  assert.equal(PROPOSAL_INPUT_POLICY.myca, "session_local_only")
  assert.equal(PROPOSAL_INPUT_POLICY.externalSideEffects, "none")

  const proposal = createSessionLocalProposal({
    id: " proposal-1 ",
    summary: " Review an inert concept ",
    origin: "myca",
  })
  assert.deepEqual(proposal, {
    kind: "session_local_proposal",
    id: "proposal-1",
    summary: "Review an inert concept",
    origin: "myca",
    rationale: null,
    stage: "proposed",
    scope: "session_local",
    approval: "unavailable",
    actualExecution: "unavailable",
    externalSideEffects: "none",
    classification: "UNCLASSIFIED",
  })
  assert.ok(Object.isFrozen(proposal))
  assert.throws(() => createSessionLocalProposal({ id: "", summary: "x", origin: "natural_language" }), /id is required/)
})

test("all future certified-operation prerequisites are explicit, unmet, and disabled", () => {
  assert.deepEqual(
    CERTIFIED_CONTROL_PREREQUISITES.map((item) => item.id),
    [
      "signed-authenticated-commands",
      "expiry-nonces-idempotency",
      "device-local-safety-limits",
      "geofencing-collision-environmental-constraints",
      "positive-acknowledgement",
      "emergency-stop-manual-override",
      "lost-link-safe-behavior",
      "simulation-hardware-in-the-loop",
      "authority-separation",
      "immutable-audit",
    ],
  )
  assert.ok(
    CERTIFIED_CONTROL_PREREQUISITES.every(
      (item) =>
        item.state === "future_prerequisite_unmet" &&
        item.identified === false &&
        item.verified === false &&
        item.enabled === false,
    ),
  )
})

test("standards inventory is an unidentified disabled seam, never a compliance claim", () => {
  assert.deepEqual(
    STANDARDS_PROFILE_SEAMS.map((item) => item.id),
    [
      "mission-plan-exchange",
      "environmental-observation-evidence",
      "device-telemetry",
      "command-safety-assurance",
      "identity-signing",
      "classification-data-handling",
      "geospatial-map",
      "joint-all-domain-gateway",
    ],
  )
  assert.ok(
    STANDARDS_PROFILE_SEAMS.every(
      (item) =>
        item.profile === "unidentified" &&
        item.state === "disabled" &&
        item.enabled === false &&
        item.verified === false &&
        item.complianceClaim === "none",
    ),
  )
  assert.deepEqual(COMMERCIAL_UNCLASSIFIED_BOUNDARY, {
    classification: "UNCLASSIFIED",
    operatingContext: "commercial",
    militaryClaim: "none",
    jadc2Claim: "none",
    fedrampClaim: "none",
    accreditationClaim: "none",
    note: "Commercial UNCLASSIFIED context only; no military, JADC2, FedRAMP, or accreditation claim is made.",
  })
})

test("read-only snapshot exposes no URL, LAN/backend address, telemetry, location, status, or operation field", () => {
  const snapshot = buildFleetReadOnlySnapshot()
  const forbiddenFields = new Set([
    "url",
    "uri",
    "href",
    "endpoint",
    "host",
    "hostname",
    "ip",
    "address",
    "lan",
    "backend",
    "coordinates",
    "coordinate",
    "latitude",
    "longitude",
    "lat",
    "lon",
    "lng",
    "position",
    "telemetry",
    "status",
    "command",
    "control",
    "controls",
  ])
  const exposed = objectKeys(snapshot).filter((key) => forbiddenFields.has(key))
  assert.deepEqual(exposed, [])
  assert.doesNotMatch(source, /https?:\/\//i)
  assert.doesNotMatch(source, /\b(?:localhost|backend|LAN)\b/)
  assert.doesNotMatch(source, /\b(?:\d{1,3}\.){3}\d{1,3}\b/)
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/)
  assert.doesNotMatch(source, /^\s*import\s/m)
  assert.ok(Object.isFrozen(snapshot))
})
