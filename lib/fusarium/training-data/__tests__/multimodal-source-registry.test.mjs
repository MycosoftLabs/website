import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(here, "..", "multimodal-source-registry.ts")
const source = readFileSync(sourcePath, "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-multimodal-source-registry-"))
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
writeFileSync(join(compiledDir, "multimodal-source-registry.mjs"), compiled)
const registry = await import(
  pathToFileURL(join(compiledDir, "multimodal-source-registry.mjs")).href
)
test.after(() => rmSync(compiledDir, { recursive: true, force: true }))

const expectedIds = [
  "gandha-uci-temperature-modulation",
  "gandha-uci-dynamic-mixtures",
  "gandha-uci-flow-modulation",
  "gandha-uci-gas-drift",
  "gandha-mycosoft-bme6xx-controlled-captures",
  "bluesight-fathomnet-visual-assets",
  "bluesight-usgs-3dep-lidar-aoi",
  "bluesight-nuscenes-multisensor",
  "bluesight-xview3-sar",
  "bluesight-ultralytics-yolo26",
  "bluesight-sahi-framework",
  "fci-zenodo-oyster-fungi-electrical",
  "fci-zenodo-four-fungi-electrical",
  "fci-figshare-plant-response-library",
  "fci-zenodo-plant-weather-monitoring",
  "thermal-usgs-landsat-c2-l2-st",
  "thermal-nasa-ecostress-v003-lste",
  "thermal-noaa-goes-r-abi-lst",
  "thermal-flir-adas-starter",
  "tactus-droid-rlds-pilot",
  "tactus-bridgedata-v2",
  "tactus-touch-and-go",
  "tactus-open-x-embodiment-rt1x",
  "tactus-mycosoft-mycobot-passive-logs",
]

const expectedStatuses = {
  "gandha-uci-temperature-modulation": ["CANDIDATE_CLOSED"],
  "gandha-uci-dynamic-mixtures": ["CANDIDATE_CLOSED"],
  "gandha-uci-flow-modulation": ["CANDIDATE_CLOSED"],
  "gandha-uci-gas-drift": ["REJECTED_FOR_NOW", "TERMS_HOLD"],
  "gandha-mycosoft-bme6xx-controlled-captures": ["CAPTURE_PLAN_ONLY", "TERMS_HOLD", "VERSION_HOLD"],
  "bluesight-fathomnet-visual-assets": ["TERMS_HOLD", "SIZE_HOLD"],
  "bluesight-usgs-3dep-lidar-aoi": ["CANDIDATE_CLOSED", "SIZE_HOLD"],
  "bluesight-nuscenes-multisensor": ["COMMERCIAL_LICENSE_HOLD"],
  "bluesight-xview3-sar": ["TERMS_HOLD", "VERSION_HOLD", "SIZE_HOLD"],
  "bluesight-ultralytics-yolo26": ["COMMERCIAL_LICENSE_HOLD", "VERSION_HOLD", "SIZE_HOLD"],
  "bluesight-sahi-framework": ["CANDIDATE_CLOSED"],
  "fci-zenodo-oyster-fungi-electrical": ["TERMS_HOLD"],
  "fci-zenodo-four-fungi-electrical": ["TERMS_HOLD"],
  "fci-figshare-plant-response-library": ["CANDIDATE_CLOSED"],
  "fci-zenodo-plant-weather-monitoring": ["TERMS_HOLD"],
  "thermal-usgs-landsat-c2-l2-st": ["CANDIDATE_CLOSED", "SIZE_HOLD"],
  "thermal-nasa-ecostress-v003-lste": ["CANDIDATE_CLOSED", "SIZE_HOLD"],
  "thermal-noaa-goes-r-abi-lst": ["CANDIDATE_CLOSED", "SIZE_HOLD"],
  "thermal-flir-adas-starter": ["TERMS_HOLD", "SIZE_HOLD"],
  "tactus-droid-rlds-pilot": ["CANDIDATE_CLOSED"],
  "tactus-bridgedata-v2": ["CANDIDATE_CLOSED", "SIZE_HOLD"],
  "tactus-touch-and-go": ["CANDIDATE_CLOSED", "VERSION_HOLD", "SIZE_HOLD"],
  "tactus-open-x-embodiment-rt1x": ["TERMS_HOLD", "VERSION_HOLD", "SIZE_HOLD"],
  "tactus-mycosoft-mycobot-passive-logs": ["CAPTURE_PLAN_ONLY"],
}

test("publishes the typed 24-candidate registry in research order", () => {
  assert.equal(
    registry.MULTIMODAL_SOURCE_REGISTRY_V1.schema,
    "fusarium-multimodal-source-registry/v1",
  )
  assert.equal(registry.MULTIMODAL_SOURCE_REGISTRY_V1.version, "2026-09-02.1")
  assert.equal(registry.MULTIMODAL_SOURCE_RESEARCH.instructionsAreExecutionAuthority, false)
  assert.equal(registry.MULTIMODAL_SOURCE_CANDIDATE_COUNT, 24)
  assert.deepEqual(
    registry.MULTIMODAL_SOURCE_CANDIDATES.map((entry) => entry.id),
    expectedIds,
  )
  assert.equal(new Set(expectedIds).size, 24)
  assert.deepEqual(registry.validateMultimodalSourceRegistryV1(), [])
})

test("keeps the five application catalogs distinct", () => {
  assert.deepEqual(
    Object.fromEntries(
      ["GANDHA", "BlueSight", "FCI", "Thermal", "Tactus — Mechanical"].map(
        (application) => [
          application,
          registry.multimodalSourceCandidatesForApplication(application).length,
        ],
      ),
    ),
    {
      GANDHA: 5,
      BlueSight: 6,
      FCI: 4,
      Thermal: 4,
      "Tactus — Mechanical": 5,
    },
  )
  assert.ok(
    registry.MULTIMODAL_SOURCE_CANDIDATES.every(
      (entry) => entry.modalities.length > 0 && entry.artifactKinds.length > 0,
    ),
  )
})

test("preserves the research gate and status distinctions exactly", () => {
  assert.deepEqual(
    Object.fromEntries(
      registry.MULTIMODAL_SOURCE_CANDIDATES.map((entry) => [
        entry.id,
        entry.statuses,
      ]),
    ),
    expectedStatuses,
  )
  assert.equal(
    registry.multimodalSourceCandidateById("gandha-uci-gas-drift").validation
      .state,
    "prohibited-while-rights-conflict",
  )
  assert.equal(
    registry.multimodalSourceCandidateById(
      "gandha-mycosoft-bme6xx-controlled-captures",
    ).validation.state,
    "capture-plan-not-approved",
  )
  assert.equal(
    registry.multimodalSourceCandidateById(
      "tactus-mycosoft-mycobot-passive-logs",
    ).validation.state,
    "capture-plan-not-approved",
  )
})

test("retains authority, terms, version, checksum, size, destination, provenance, and validation evidence", () => {
  for (const entry of registry.MULTIMODAL_SOURCE_CANDIDATES) {
    assert.ok(entry.sourceSummary)
    assert.ok(entry.authorityReferences.length > 0)
    assert.ok(entry.authorityReferences.every((reference) => reference.title))
    assert.ok(entry.terms.state)
    assert.equal(entry.terms.sufficientForAcquisition, false)
    assert.ok(entry.terms.summary)
    assert.ok(entry.version.state)
    assert.equal(entry.version.immutableArtifactFrozen, false)
    assert.ok(entry.version.requirements.length > 0)
    assert.ok(entry.checksum.state)
    assert.equal(entry.checksum.mycosoftSha256, null)
    assert.ok(entry.size.state)
    assert.ok(entry.size.publishedSummary)
    assert.equal(entry.size.boundedObjectManifestPresent, false)
    assert.equal(entry.size.destinationCapacityVerified, false)
    assert.ok(entry.destination.state)
    assert.equal(entry.destination.physicalLocationVerified, false)
    assert.equal(entry.provenance.state, "requirements-only")
    assert.ok(entry.provenance.requiredEvidence.length > 0)
    assert.equal(entry.provenance.captured, false)
    assert.ok(entry.validation.state)
    assert.ok(entry.validation.requiredChecks.length > 0)
    assert.equal(entry.validation.completed, false)
  }
})

test("keeps every transfer and human approval gate closed", () => {
  for (const entry of registry.MULTIMODAL_SOURCE_CANDIDATES) {
    assert.equal(entry.downloadMechanism.invoked, false)
    assert.equal(entry.approval.state, "absent")
    assert.equal(entry.approval.approver, null)
    assert.equal(entry.approval.approvedAt, null)
    assert.equal(entry.approval.scope, null)
    assert.equal(entry.gate.state, "closed")
    assert.ok(entry.gate.blockers.length > 0)
    assert.equal(entry.executionAuthority, false)
  }
  assert.deepEqual(registry.MULTIMODAL_SOURCE_REGISTRY_V1.executionPolicy, {
    metadataOnly: true,
    networkRequestsAuthorized: false,
    downloadsAuthorized: false,
    filesystemOrNasAccessAuthorized: false,
    credentialUseAuthorized: false,
    trainingAuthorized: false,
    modelPromotionAuthorized: false,
    serviceChangesAuthorized: false,
    deviceActionsAuthorized: false,
  })
})

test("records provider digests as unverified evidence rather than local validation", () => {
  const sahi = registry.multimodalSourceCandidateById("bluesight-sahi-framework")
  assert.deepEqual(
    sahi.checksum.providerChecksums.map(({ algorithm, value }) => [algorithm, value]),
    [
      ["SHA-256", "de352051115f5445a09aed396b84ad807dab54ea1452d5f497417689dc495b8e"],
      ["SHA-256", "edc8457a4a4432e7466c80afab71b0faf6990a7bd534f8fcd389680f967ddbf8"],
    ],
  )
  const fourFungi = registry.multimodalSourceCandidateById(
    "fci-zenodo-four-fungi-electrical",
  )
  assert.equal(fourFungi.checksum.providerChecksums.length, 4)
  assert.ok(
    [...sahi.checksum.providerChecksums, ...fourFungi.checksum.providerChecksums].every(
      (entry) => entry.verifiedByMycosoft === false,
    ),
  )
})

test("keeps YOLO26 blocked, SAHI software-only, and broad Hugging Face outside the candidate registry", () => {
  const yolo = registry.multimodalSourceCandidateById(
    "bluesight-ultralytics-yolo26",
  )
  assert.equal(yolo.version.observedLabel, "documentation identity 26.0.0")
  assert.ok(yolo.statuses.includes("COMMERCIAL_LICENSE_HOLD"))
  assert.ok(yolo.statuses.includes("VERSION_HOLD"))
  assert.deepEqual(yolo.artifactKinds, [
    "model-software",
    "unselected-model-checkpoint",
  ])
  assert.equal(
    yolo.trainingSourceRole,
    "model-software-and-unselected-checkpoints-not-training-data",
  )

  const sahi = registry.multimodalSourceCandidateById("bluesight-sahi-framework")
  assert.deepEqual(sahi.artifactKinds, ["software-framework"])
  assert.equal(sahi.trainingSourceRole, "software-only-not-training-data")
  assert.match(sahi.sourceSummary, /software only, with no dataset or model weight/i)
  assert.equal(sahi.artifactKinds.includes("dataset"), false)
  assert.equal(sahi.artifactKinds.includes("unselected-model-checkpoint"), false)

  assert.equal(
    registry.MULTIMODAL_SOURCE_CANDIDATES.some((entry) =>
      entry.id.includes("hugging-face"),
    ),
    false,
  )
  assert.deepEqual(registry.MULTIMODAL_NON_CANDIDATE_DIRECTIONS, [
    {
      direction: "broad-hugging-face-discovery",
      state: "not-a-candidate",
      reason:
        "A broad catalog request has no exact organization, repository, artifact kind, immutable revision, complete card, license record, object list, digest, or bounded approval.",
      acquisitionAuthority: false,
    },
  ])
})

test("contains no network, filesystem, process, credential, training, or device execution seam", () => {
  assert.doesNotMatch(source, /^\s*import\s/m)
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(
    source,
    /\baxios\b|node:fs|child_process|process\.env|WebSocket|EventSource/,
  )
  assert.doesNotMatch(
    source,
    /export\s+(?:async\s+)?function\s+(?:download|write|train|execute|dispatch|connect|move)\b/i,
  )
})
