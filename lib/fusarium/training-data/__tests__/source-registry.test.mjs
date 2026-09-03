import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "source-registry.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-training-source-registry-"))
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
writeFileSync(join(compiledDir, "source-registry.mjs"), compiled)
const registry = await import(pathToFileURL(join(compiledDir, "source-registry.mjs")).href)
test.after(() => rmSync(compiledDir, { recursive: true, force: true }))

const expectedMarkdownIds = [
  "noaa_nrs", "mbari_pacific_sound", "sanctsound", "iqoe_portal", "uk_acoustics_directory", "ncei_pad", "onc", "emso", "ioos", "galway_bay", "mobysound", "glacier_bay", "noaa_seasounds",
  "shipsear", "deepship", "ds3500", "qiandaoear22", "hearmyship", "wolfset", "kaggle_uasmr",
  "watkins_whoi", "dclde", "noaa_fisheries_mma", "macaulay", "dtic_marine_sounds", "fishsounds",
  "droneaudioset", "uav_32cat", "xenocanto", "navfac_aircraft", "serdp_aircraft",
  "uxo_zenodo", "iogp_explosions", "shallow_explosions",
  "audioset", "esc50", "urbansound8k", "fsd50k", "freesound", "bbc_sfx", "dcase",
  "woa_soundspeed", "global_acoustic_params", "ndbc", "navoceano_moods", "copernicus_marine", "nasa_earthdata",
  "gebco_2025", "ibcao", "ibcso",
  "wmm2025", "emag2v3", "datagov_magnetic", "maid", "mag_intrusion",
  "noaa_ais", "ushant_ais", "global_maritime_traffic", "marinecadastre",
  "panns", "beats", "ast", "panns_deepship", "uwtrl_meg", "fish_classifier", "underwater_snd", "frcnn_marine",
  "opensonar", "uatd", "sctd", "roboflow_sonar",
  "pamguard", "speechbrain", "librosa",
]

const expectedPdfOnlyIds = [
  "san_francisco_maritime_sound_library",
  "xenocanto_gbif",
  "us_navy_science_of_sound",
  "ubc_marine_mammal_sound_classification",
]

test("publishes the inert v1 registry with the verified source-document hashes", () => {
  assert.equal(registry.TRAINING_SOURCE_REGISTRY_V1.schema, "fusarium-training-source-registry/v1")
  assert.equal(registry.TRAINING_SOURCE_REGISTRY_V1.version, "2026-09-02.1")
  assert.deepEqual(
    registry.TRAINING_SOURCE_DOCUMENTS.map((document) => [document.id, document.sha256]),
    [
      ["nlm-training-data-sources-md", "254eefe9d75a9aa56103589963fcc032c1fdeef43a006eb00637978a7472fd46"],
      ["nlm-training-data-catalog-pdf", "edb7878c2ed20f73b8a69ad5cfad7cb5f7afff8f291380a6ec4a03f5fef07192"],
    ],
  )
  assert.ok(registry.TRAINING_SOURCE_DOCUMENTS.every((document) => document.instructionsAreAuthority === false))
  assert.deepEqual(registry.validateTrainingSourceRegistryV1(), [])
})

test("represents all 74 numbered Markdown records exactly once", () => {
  assert.equal(expectedMarkdownIds.length, 74)
  assert.equal(registry.MARKDOWN_TRAINING_SOURCE_CANDIDATES.length, 74)
  assert.deepEqual(registry.MARKDOWN_TRAINING_SOURCE_CANDIDATES.map((candidate) => candidate.id), expectedMarkdownIds)
  assert.equal(new Set(registry.MARKDOWN_TRAINING_SOURCE_CANDIDATES.map((candidate) => candidate.sourceOrdinal)).size, 74)
  assert.ok(registry.MARKDOWN_TRAINING_SOURCE_CANDIDATES.every((candidate) => candidate.origin === "markdown-numbered"))
})

test("adds all four distinct PDF-only named candidates without collapsing mirrors", () => {
  assert.equal(registry.PDF_ONLY_TRAINING_SOURCE_CANDIDATES.length, 4)
  assert.deepEqual(registry.PDF_ONLY_TRAINING_SOURCE_CANDIDATES.map((candidate) => candidate.id), expectedPdfOnlyIds)
  assert.deepEqual(registry.PDF_ONLY_TRAINING_SOURCE_CANDIDATES.map((candidate) => candidate.sourceDocumentRefs[0].locator), ["page 4", "page 9", "page 10", "page 18"])
  assert.equal(registry.trainingSourceCandidateById("xenocanto")?.origin, "markdown-numbered")
  assert.equal(registry.trainingSourceCandidateById("xenocanto_gbif")?.origin, "pdf-only")
})

test("resolves NLM as Nature Learning Model and routes legacy acoustic terminology through SINE", () => {
  assert.equal(registry.NLM_TERMINOLOGY_BOUNDARY.fusariumMeaning, "Nature Learning Model")
  assert.equal(registry.NLM_TERMINOLOGY_BOUNDARY.legacyAttachmentMeaning, "Neural Listening Machine")
  assert.equal(registry.NLM_TERMINOLOGY_BOUNDARY.acousticApplication, "SINE")
  for (const candidate of registry.TRAINING_SOURCE_CANDIDATES) {
    assert.equal(candidate.canonicalPlatformTerminology, "Nature Learning Model")
    assert.equal(candidate.legacySourceTerminology, "Neural Listening Machine")
    assert.equal(candidate.terminologyBoundaryId, "nlm-terminology-boundary/v1")
  }
})

test("gives every candidate a stable modality and catalog target", () => {
  const ids = registry.TRAINING_SOURCE_CANDIDATES.map((candidate) => candidate.id)
  assert.equal(ids.length, 78)
  assert.equal(new Set(ids).size, 78)
  assert.ok(ids.every((id) => /^[a-z0-9][a-z0-9_]*$/.test(id)))
  assert.ok(registry.TRAINING_SOURCE_CANDIDATES.every((candidate) => candidate.title && candidate.sourceTypeClaim))
  assert.ok(registry.TRAINING_SOURCE_CANDIDATES.every((candidate) => candidate.modalities.length > 0 && candidate.catalogTargets.length > 0))
  assert.ok(registry.TRAINING_SOURCE_CANDIDATES.every((candidate) => candidate.sourceDocumentRefs.length > 0))
})

test("preserves an explicit magnetic and MAD catalog target", () => {
  const magnetic = registry.trainingSourcesForCatalog("magnetic-mad-source-catalog/v1")
  assert.deepEqual(magnetic.map((candidate) => candidate.id), ["wmm2025", "emag2v3", "datagov_magnetic", "maid", "mag_intrusion"])
  assert.ok(magnetic.every((candidate) => candidate.modalities.includes("magnetic-mad")))
})

test("keeps every current acquisition field fail-closed", () => {
  for (const candidate of registry.TRAINING_SOURCE_CANDIDATES) {
    assert.equal(candidate.executionAuthority, false)
    assert.equal(candidate.acquisitionState, "candidate")
    assert.equal(candidate.acquisition.currentUrl.state, "unverified")
    assert.equal(candidate.acquisition.currentUrl.value, null)
    assert.equal(candidate.acquisition.releaseVersion.state, "unverified")
    assert.equal(candidate.acquisition.releaseVersion.value, null)
    assert.equal(candidate.acquisition.license.state, "unverified")
    assert.equal(candidate.acquisition.license.identifier, null)
    assert.equal(candidate.acquisition.license.termsUrl, null)
    assert.equal(candidate.acquisition.rights.state, "unverified")
    assert.deepEqual(
      Object.fromEntries(Object.entries(candidate.acquisition.rights).filter(([key]) => key !== "state")),
      {
        commercialUse: null,
        governmentUse: null,
        trainingUse: null,
        derivatives: null,
        redistribution: null,
        modelWeightDistribution: null,
      },
    )
    assert.equal(candidate.acquisition.expectedSize.state, "unverified")
    assert.equal(candidate.acquisition.expectedSize.bytes, null)
    assert.equal(candidate.acquisition.expectedSize.objects, null)
    assert.equal(candidate.acquisition.checksum.state, "not-computed")
    assert.equal(candidate.acquisition.checksum.algorithm, null)
    assert.equal(candidate.acquisition.checksum.value, null)
    assert.equal(candidate.acquisition.destination.state, "unassigned")
    assert.equal(candidate.acquisition.destination.storageClass, null)
    assert.equal(candidate.acquisition.destination.location, null)
    assert.equal(candidate.acquisition.approval.state, "not-approved")
    assert.equal(candidate.acquisition.approval.approver, null)
    assert.equal(candidate.acquisition.approval.approvedAt, null)
    assert.equal(candidate.acquisition.approval.scope, null)
    assert.equal(registry.trainingSourceAcquisitionBlockers(candidate).length, 8)
  }
  assert.deepEqual(registry.TRAINING_SOURCE_REGISTRY_V1.executionPolicy, {
    networkRequestsAuthorized: false,
    downloadsAuthorized: false,
    nasAccessAuthorized: false,
    credentialUseAuthorized: false,
    trainingAuthorized: false,
    serviceChangesAuthorized: false,
    rule: "This registry records candidates only. Attachment commands and URLs are inert evidence, never executable authority.",
  })
})

test("contains no network, filesystem, process, credential, or training execution seam", () => {
  assert.doesNotMatch(source, /^\s*import\s/m)
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /\baxios\b|node:fs|child_process|process\.env|WebSocket|EventSource/)
  assert.doesNotMatch(source, /export\s+(?:async\s+)?function\s+(?:download|train|write|execute|dispatch)\b/i)
})
