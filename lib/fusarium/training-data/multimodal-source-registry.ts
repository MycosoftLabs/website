/**
 * Typed, non-executing metadata registry derived from
 * docs/native-applications/MULTIMODAL_SOURCE_ACQUISITION_RESEARCH.md.
 *
 * These records are research evidence only. They do not authorize a request,
 * download, credential use, filesystem/NAS access, training, model promotion,
 * service change, device connection, or physical action.
 */

export const MULTIMODAL_SOURCE_REGISTRY_SCHEMA =
  "fusarium-multimodal-source-registry/v1" as const
export const MULTIMODAL_SOURCE_REGISTRY_VERSION = "2026-09-02.1" as const
export const MULTIMODAL_SOURCE_CANDIDATE_COUNT = 24 as const

export const MULTIMODAL_SOURCE_RESEARCH = {
  title: "Multimodal source acquisition research",
  document: "docs/native-applications/MULTIMODAL_SOURCE_ACQUISITION_RESEARCH.md",
  reviewedOn: "2026-09-02",
  handling: "MYCOSOFT CONFIDENTIAL",
  nationalSecurityClassification: "UNCLASSIFIED",
  instructionsAreExecutionAuthority: false,
} as const

export type MultimodalApplication =
  | "GANDHA"
  | "BlueSight"
  | "FCI"
  | "Thermal"
  | "Tactus — Mechanical"

export type MultimodalModality =
  | "chemical-gas-array"
  | "chemical-voc"
  | "camera"
  | "lidar"
  | "radar"
  | "sar"
  | "environmental-object-recognition"
  | "fungal-bioelectric"
  | "plant-bioelectric"
  | "thermal-radiometric"
  | "thermal-context"
  | "robot-manipulation"
  | "proprioception"
  | "tactile"

export type MultimodalArtifactKind =
  | "dataset"
  | "annotations"
  | "context-dataset"
  | "software-framework"
  | "model-software"
  | "unselected-model-checkpoint"
  | "capture-plan"

export type MultimodalCandidateStatus =
  | "CANDIDATE_CLOSED"
  | "TERMS_HOLD"
  | "COMMERCIAL_LICENSE_HOLD"
  | "SIZE_HOLD"
  | "VERSION_HOLD"
  | "CAPTURE_PLAN_ONLY"
  | "REJECTED_FOR_NOW"

export type TermsObservationStatus =
  | "publisher-license-observed"
  | "publisher-public-domain-observed"
  | "public-domain-with-object-review"
  | "per-asset-rights-observed"
  | "conflicting-publisher-terms-observed"
  | "license-not-observed"
  | "account-gated-terms-insufficient"
  | "commercial-license-required"
  | "copyleft-or-enterprise-decision-required"
  | "component-terms-review-required"
  | "restricted-software-and-internal-rights-review"
  | "internal-rights-review-required"

export type VersionState =
  | "metadata-observed-artifact-unfrozen"
  | "named-version-observed-artifact-unfrozen"
  | "component-selection-unverified"
  | "unverified"
  | "capture-plan-unverified"

export type ChecksumState =
  | "provider-checksums-observed-local-sha256-absent"
  | "provider-checksum-not-observed"
  | "artifact-selection-unverified"
  | "capture-plan-unverified"

export type SizeState =
  | "published-size-expanded-size-unverified"
  | "published-estimate-manifest-unverified"
  | "tbd-by-dry-run"
  | "tbd-by-account-dry-run"
  | "tbd-by-authorized-dry-run"
  | "tbd-by-artifact-selection"
  | "tbd-by-component-dry-run"
  | "tbd-by-capture-plan"
  | "not-applicable-until-rights-resolved"

export type DestinationState =
  | "logical-concept-only"
  | "unassigned-on-rights-hold"

export interface MultimodalAuthorityReferenceV1 {
  title: string
  kind:
    | "publisher-page"
    | "publisher-policy"
    | "publisher-terms"
    | "publisher-documentation"
    | "publisher-repository"
    | "government-catalog"
    | "paper"
    | "future-internal-protocol"
  url: string | null
  doi: string | null
  observationState: "observed" | "future-required"
}

export interface MultimodalTermsEvidenceV1 {
  state: TermsObservationStatus
  observedLicenses: readonly string[]
  summary: string
  sufficientForAcquisition: false
}

export interface MultimodalVersionEvidenceV1 {
  state: VersionState
  observedLabel: string | null
  immutableArtifactFrozen: false
  requirements: readonly string[]
}

export interface MultimodalChecksumEvidenceV1 {
  state: ChecksumState
  providerChecksums: readonly {
    artifact: string
    algorithm: "MD5" | "SHA-256"
    value: string
    verifiedByMycosoft: false
  }[]
  mycosoftSha256: null
}

export interface MultimodalSizeEvidenceV1 {
  state: SizeState
  publishedSummary: string
  boundedObjectManifestPresent: false
  destinationCapacityVerified: false
}

export interface MultimodalDestinationEvidenceV1 {
  state: DestinationState
  logicalPath: string | null
  futureConcept: string | null
  physicalLocationVerified: false
}

export interface MultimodalProvenancePlanV1 {
  state: "requirements-only"
  requiredEvidence: readonly string[]
  captured: false
}

export interface MultimodalValidationPlanV1 {
  state:
    | "planned-not-run"
    | "prohibited-while-rights-conflict"
    | "capture-plan-not-approved"
  requiredChecks: readonly string[]
  completed: false
}

export interface MultimodalHumanApprovalV1 {
  state: "absent"
  approver: null
  approvedAt: null
  scope: null
}

export interface MultimodalSourceCandidateV1 {
  id: string
  application: MultimodalApplication
  modalities: readonly MultimodalModality[]
  artifactKinds: readonly MultimodalArtifactKind[]
  trainingSourceRole:
    | "candidate-not-approved"
    | "context-candidate-not-approved"
    | "software-only-not-training-data"
    | "model-software-and-unselected-checkpoints-not-training-data"
    | "future-capture-plan-only"
  sourceSummary: string
  authorityReferences: readonly MultimodalAuthorityReferenceV1[]
  downloadMechanism: {
    description: string
    invoked: false
  }
  terms: MultimodalTermsEvidenceV1
  version: MultimodalVersionEvidenceV1
  checksum: MultimodalChecksumEvidenceV1
  size: MultimodalSizeEvidenceV1
  destination: MultimodalDestinationEvidenceV1
  provenance: MultimodalProvenancePlanV1
  validation: MultimodalValidationPlanV1
  approval: MultimodalHumanApprovalV1
  statuses: readonly MultimodalCandidateStatus[]
  gate: {
    state: "closed"
    blockers: readonly string[]
  }
  executionAuthority: false
}

type CandidateInput = Omit<
  MultimodalSourceCandidateV1,
  "approval" | "executionAuthority"
>

const candidate = (input: CandidateInput): MultimodalSourceCandidateV1 => ({
  ...input,
  approval: { state: "absent", approver: null, approvedAt: null, scope: null },
  executionAuthority: false,
})

const authority = (
  title: string,
  kind: MultimodalAuthorityReferenceV1["kind"],
  url: string | null,
  doi: string | null = null,
  observationState: MultimodalAuthorityReferenceV1["observationState"] = "observed",
): MultimodalAuthorityReferenceV1 => ({ title, kind, url, doi, observationState })

const terms = (
  state: TermsObservationStatus,
  observedLicenses: readonly string[],
  summary: string,
): MultimodalTermsEvidenceV1 => ({
  state,
  observedLicenses,
  summary,
  sufficientForAcquisition: false,
})

const version = (
  state: VersionState,
  observedLabel: string | null,
  requirements: readonly string[],
): MultimodalVersionEvidenceV1 => ({
  state,
  observedLabel,
  immutableArtifactFrozen: false,
  requirements,
})

const checksum = (
  state: ChecksumState,
  providerChecksums: MultimodalChecksumEvidenceV1["providerChecksums"] = [],
): MultimodalChecksumEvidenceV1 => ({
  state,
  providerChecksums,
  mycosoftSha256: null,
})

const size = (
  state: SizeState,
  publishedSummary: string,
): MultimodalSizeEvidenceV1 => ({
  state,
  publishedSummary,
  boundedObjectManifestPresent: false,
  destinationCapacityVerified: false,
})

const destination = (
  state: DestinationState,
  logicalPath: string | null,
  futureConcept: string | null = null,
): MultimodalDestinationEvidenceV1 => ({
  state,
  logicalPath,
  futureConcept,
  physicalLocationVerified: false,
})

const provenance = (
  requiredEvidence: readonly string[],
): MultimodalProvenancePlanV1 => ({
  state: "requirements-only",
  requiredEvidence,
  captured: false,
})

const validation = (
  requiredChecks: readonly string[],
  state: MultimodalValidationPlanV1["state"] = "planned-not-run",
): MultimodalValidationPlanV1 => ({ state, requiredChecks, completed: false })

const closedGate = (...blockers: string[]): CandidateInput["gate"] => ({
  state: "closed",
  blockers,
})

export const MULTIMODAL_SOURCE_CANDIDATES: readonly MultimodalSourceCandidateV1[] = [
  candidate({
    id: "gandha-uci-temperature-modulation",
    application: "GANDHA",
    modalities: ["chemical-gas-array", "chemical-voc"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "UCI gas sensor array temperature-modulation cycles with CO and humidity context.",
    authorityReferences: [
      authority("UCI dataset 487", "publisher-page", "https://archive.ics.uci.edu/dataset/487/gas%2Bsensor%2Barray%2Btemperature%2Bmodulation", "10.24432/C5S302"),
    ],
    downloadMechanism: { description: "UCI archive or ucimlrepo ID 487", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Publisher license observed; attribution and planned-use rights review remain required."),
    version: version("metadata-observed-artifact-unfrozen", "donated 2019-04-14", ["freeze the exact archive response"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("published-size-expanded-size-unverified", "174.8 MB published compressed; expanded bytes TBD_BY_DRY_RUN"),
    destination: destination("logical-concept-only", "quarantine/gandha/gandha-uci-temperature-modulation/uci-487-2019/"),
    provenance: provenance(["DOI", "creator", "UCI metadata JSON", "retrieval time", "original archive name", "terms snapshot", "per-file hashes"]),
    validation: validation(["monotonic time", "14-channel continuity", "finite values", "declared gases", "blank periods", "humidity and CO units", "no inferred labels"]),
    statuses: ["CANDIDATE_CLOSED"],
    gate: closedGate("rights review absent", "expanded size absent", "destination capacity absent", "bounded pilot approval absent"),
  }),
  candidate({
    id: "gandha-uci-dynamic-mixtures",
    application: "GANDHA",
    modalities: ["chemical-gas-array", "chemical-voc"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "UCI continuous 16-sensor ethylene/methane and ethylene/CO dynamic mixtures.",
    authorityReferences: [
      authority("UCI dataset 322", "publisher-page", "https://archive.ics.uci.edu/dataset/322/gas%2Bsensor%2Barray%2Bunder%2Bdynamic%2Bgas%2Bmixtures", "10.24432/C5WP4C"),
    ],
    downloadMechanism: { description: "UCI archive or ucimlrepo ID 322", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Publisher license observed; attribution and commercial/government-use review remain required."),
    version: version("metadata-observed-artifact-unfrozen", "donated 2015", ["freeze exact archive identity and object metadata"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("published-size-expanded-size-unverified", "351.9 MB archive; approximately 1.22 GB across the two expanded text files"),
    destination: destination("logical-concept-only", "quarantine/gandha/gandha-uci-dynamic-mixtures/uci-322-2015/"),
    provenance: provenance(["experiment identities", "apparatus description", "concentration streams", "timestamps", "source metadata", "terms snapshot", "hashes"]),
    validation: validation(["parse experiments separately", "channel count", "sampling and time continuity", "concentration units", "exposure transitions", "sensor order"]),
    statuses: ["CANDIDATE_CLOSED"],
    gate: closedGate("exact archive identity absent", "destination capacity absent", "pilot approval absent"),
  }),
  candidate({
    id: "gandha-uci-flow-modulation",
    application: "GANDHA",
    modalities: ["chemical-gas-array", "chemical-voc"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "UCI raw 16-sensor acetone/ethanol mixtures and derived features under controlled flow cycles.",
    authorityReferences: [
      authority("UCI dataset 308", "publisher-page", "https://archive.ics.uci.edu/dataset/308/gas%2Bsensor%2Barray%2Bunder%2Bflow%2Bmodulation", "10.24432/C5BG7G"),
    ],
    downloadMechanism: { description: "UCI archive or ucimlrepo ID 308", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Publisher license observed; rights review remains required."),
    version: version("metadata-observed-artifact-unfrozen", "donated 2014-09-09", ["freeze exact archive response"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("published-size-expanded-size-unverified", "4.6 MB published total; expanded bytes TBD_BY_DRY_RUN"),
    destination: destination("logical-concept-only", "quarantine/gandha/gandha-uci-flow-modulation/uci-308-2014/"),
    provenance: provenance(["experiment and batch IDs", "raw-versus-derived flag", "25 Hz sampling statement", "feature definitions", "DOI", "terms", "hashes"]),
    validation: validation(["preserve raw resistance", "baseline definition", "chamber geometry", "dose", "exposure and recovery phases", "separate supplied features", "independent feature recomputation"]),
    statuses: ["CANDIDATE_CLOSED"],
    gate: closedGate("rights review absent", "expanded size absent", "bounded pilot approval absent"),
  }),
  candidate({
    id: "gandha-uci-gas-drift",
    application: "GANDHA",
    modalities: ["chemical-gas-array", "chemical-voc"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "UCI gas-array drift data and different-concentration extension across six gases.",
    authorityReferences: [
      authority("UCI dataset 224", "publisher-page", "https://archive.ics.uci.edu/dataset/224/gas", "10.24432/C5RP6W"),
      authority("UCI concentration extension 270", "publisher-page", "https://archive.ics.uci.edu/dataset/270/gas%2Bsensor%2Barray%2Bdrift%2Bdataset", "10.24432/C5MK6M"),
    ],
    downloadMechanism: { description: "UCI archive or ucimlrepo; prohibited while terms conflict", invoked: false },
    terms: terms("conflicting-publisher-terms-observed", ["CC BY 4.0", "research-only / commercial use excluded"], "The same publisher pages contain materially conflicting terms."),
    version: version("metadata-observed-artifact-unfrozen", "dataset 224 corrected 2013-10-14", ["resolve terms", "freeze immutable release including corrected batch10.dat"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("not-applicable-until-rights-resolved", "Approximately 9.5–9.6 MB per published archive; expanded sizing deferred pending rights resolution"),
    destination: destination("unassigned-on-rights-hold", null, "quarantine/gandha/gandha-uci-gas-drift/<resolved-release>/"),
    provenance: provenance(["both conflicting publisher statements", "written clarification", "release identity", "hashes"]),
    validation: validation(["batch correction", "gas and concentration units", "sensor order", "temporal split", "drift-batch leakage"], "prohibited-while-rights-conflict"),
    statuses: ["REJECTED_FOR_NOW", "TERMS_HOLD"],
    gate: closedGate("material terms conflict", "written clarification or counsel decision absent", "pilot approval absent"),
  }),
  candidate({
    id: "gandha-mycosoft-bme6xx-controlled-captures",
    application: "GANDHA",
    modalities: ["chemical-gas-array", "chemical-voc"],
    artifactKinds: ["capture-plan"],
    trainingSourceRole: "future-capture-plan-only",
    sourceSummary: "Proposed Mycosoft-controlled BME688/BME690 heater-cycle captures with blanks, known specimens, context, and calibration.",
    authorityReferences: [
      authority("Bosch BME AI-Studio documentation", "publisher-documentation", "https://www.bosch-sensortec.com/software/bme/docs"),
      authority("Bosch software downloads", "publisher-page", "https://www.bosch-sensortec.com/en/software-tools/software-downloads.html"),
      authority("Bosch BSEC", "publisher-page", "https://www.bosch-sensortec.com/en/software-tools/software/bme680-software-bsec"),
    ],
    downloadMechanism: { description: "No acquisition mechanism; inventory licensed local tooling by name and version only", invoked: false },
    terms: terms("restricted-software-and-internal-rights-review", ["Bosch software license agreement required"], "Bosch binaries are closed-source; capture ownership and export rights remain separately unreviewed."),
    version: version("capture-plan-unverified", "AI-Studio docs 2.2.12; desktop 2.3.2; BSEC 2.6.1.0 presented inconsistently", ["inventory exact installed binaries", "capture licenses", "configuration identities", "hashes"]),
    checksum: checksum("capture-plan-unverified"),
    size: size("tbd-by-capture-plan", "TBD from sensor count, heater steps, rate, context channels, duration, replicates, formats, and margin"),
    destination: destination("logical-concept-only", "quarantine/gandha/gandha-mycosoft-bme6xx-controlled-captures/<protocol-version>/"),
    provenance: provenance(["device ID", "board and sensor revisions", "firmware digest", "BSEC and AI-Studio versions", "configuration identity", "specimen chain of custody", "blanks and controls", "operator", "environment", "calibration", "raw SHA-256"]),
    validation: validation(["heater-step count and timing", "raw-versus-compensated distinction", "environmental context", "replicate separation", "label evidence", "no reverse engineering or unlabeled identity inference"], "capture-plan-not-approved"),
    statuses: ["CAPTURE_PLAN_ONLY", "TERMS_HOLD", "VERSION_HOLD"],
    gate: closedGate("tooling approval absent", "capture protocol absent", "specimen and safety review absent", "storage approval absent", "training approval absent"),
  }),

  candidate({
    id: "bluesight-fathomnet-visual-assets",
    application: "BlueSight",
    modalities: ["camera", "environmental-object-recognition"],
    artifactKinds: ["dataset", "annotations"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "FathomNet marine images, video, and annotations for environmental object recognition; not occurrence evidence.",
    authorityReferences: [
      authority("FathomNet Data Use Policy", "publisher-policy", "https://www.fathomnet.org/datause"),
      authority("FathomNet Terms of Use", "publisher-terms", "https://www.fathomnet.org/terms"),
    ],
    downloadMechanism: { description: "Per-record URLs, direct downloads, or an approved account/API workflow", invoked: false },
    terms: terms("per-asset-rights-observed", ["CC0", "CC BY", "CC BY-NC", "CC BY-NC-ND"], "Rights vary by asset and annotation; restricted/private content and revocation require separate handling."),
    version: version("component-selection-unverified", null, ["freeze every asset URL", "annotation revision", "owner-selected license", "retrieval time"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-dry-run", "Filtered asset count and bytes are unresolved"),
    destination: destination("logical-concept-only", "quarantine/bluesight/bluesight-fathomnet-visual-assets/<manifest-id>/"),
    provenance: provenance(["contributor", "host", "visual license", "annotation rights", "record ID", "taxonomy labels", "media timestamp", "deletion or revocation status"]),
    validation: validation(["rights-clear every asset", "exclude NC/ND unless specifically approved", "media decode", "label geometry and taxonomy", "duplicate URLs", "annotation alignment", "not occurrence evidence"]),
    statuses: ["TERMS_HOLD", "SIZE_HOLD"],
    gate: closedGate("per-object rights filter absent", "account review absent", "revocation plan absent", "bounded manifest absent", "pilot approval absent"),
  }),
  candidate({
    id: "bluesight-usgs-3dep-lidar-aoi",
    application: "BlueSight",
    modalities: ["lidar", "environmental-object-recognition"],
    artifactKinds: ["context-dataset"],
    trainingSourceRole: "context-candidate-not-approved",
    sourceSummary: "USGS 3DEP point clouds and derived elevation for bounded terrain and vegetation context.",
    authorityReferences: [
      authority("USGS LidarExplorer", "government-catalog", "https://www.usgs.gov/tools/lidarexplorer"),
      authority("USGS 3DEP products and services", "government-catalog", "https://www.usgs.gov/3d-elevation-program/about-3dep-products-services"),
      authority("USGS 3DEP data catalog record", "government-catalog", "https://data.usgs.gov/datacatalog/data/USGS%3Ab7e353d2-325f-4fc6-8d95-01254705638a"),
    ],
    downloadMechanism: { description: "LidarExplorer, The National Map, or public EPT/LAZ access for one approved AOI", invoked: false },
    terms: terms("publisher-public-domain-observed", ["U.S. public domain"], "USGS describes 3DEP products as public domain; attribution and project metadata remain required."),
    version: version("component-selection-unverified", "evolving collection, 2004-present", ["select AOI", "freeze project/work-unit", "quality level", "metadata and acquisition dates", "CRS", "object list"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-dry-run", "Nationwide holdings excluded; one named AOI needs LAZ/EPT, expanded LAS, and derivative sizing"),
    destination: destination("logical-concept-only", "quarantine/bluesight/bluesight-usgs-3dep-lidar-aoi/<project-id>-<retrieval-date>/"),
    provenance: provenance(["project and work-unit metadata", "vendor and acquisition date", "quality level", "CRS and vertical datum", "classifications", "source URL", "hashes"]),
    validation: validation(["preserve originals", "headers and bounds", "point counts", "CRS and vertical datum", "scale and offset", "classification ranges", "GPS time", "AOI intersection", "never label as live device LiDAR"]),
    statuses: ["CANDIDATE_CLOSED", "SIZE_HOLD"],
    gate: closedGate("exact AOI absent", "bounded storage estimate absent", "pilot approval absent"),
  }),
  candidate({
    id: "bluesight-nuscenes-multisensor",
    application: "BlueSight",
    modalities: ["camera", "lidar", "radar", "environmental-object-recognition"],
    artifactKinds: ["dataset", "annotations"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "nuScenes camera, LiDAR, and radar suite as a cross-modal parser benchmark, not environmental-domain truth.",
    authorityReferences: [
      authority("nuScenes dataset", "publisher-page", "https://www.nuscenes.org/nuscenes"),
      authority("nuScenes commercial terms", "publisher-terms", "https://www.nuscenes.org/terms-of-use-commercial"),
    ],
    downloadMechanism: { description: "Account registration and exact release download after commercial licensing", invoked: false },
    terms: terms("commercial-license-required", ["free use: non-commercial", "CC BY-SA conditions", "commercial license required"], "Revenue-oriented industrial research requires a commercial license and exact written terms."),
    version: version("component-selection-unverified", "example release label v1.0 not selected", ["inspect account catalog", "select exact release", "freeze object manifest"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-account-dry-run", "Public summary lists approximately 1.4M camera images, 390k LiDAR sweeps, and 1.4M radar sweeps; bytes unresolved"),
    destination: destination("unassigned-on-rights-hold", null, "quarantine/bluesight/bluesight-nuscenes-multisensor/<licensed-release>/"),
    provenance: provenance(["license agreement ID", "release", "scene and sample tokens", "sensor calibration", "ego pose", "map version", "ontology", "checksums", "acquisition record"]),
    validation: validation(["bounded scenes only", "token integrity", "timestamp synchronization", "calibration matrices", "radar and LiDAR frames", "ontology mapping", "automotive transfer label"]),
    statuses: ["COMMERCIAL_LICENSE_HOLD"],
    gate: closedGate("written commercial terms absent", "exact release absent", "bounded size absent", "pilot approval absent"),
  }),
  candidate({
    id: "bluesight-xview3-sar",
    application: "BlueSight",
    modalities: ["sar", "radar", "environmental-object-recognition"],
    artifactKinds: ["dataset", "annotations", "context-dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "xView3 Sentinel-1 SAR with maritime detections, bathymetry, wind context, and AIS-derived evidence.",
    authorityReferences: [
      authority("xView3 project", "publisher-page", "https://iuu.xview.us/"),
      authority("xView3 dataset specification", "publisher-documentation", "https://iuu.xview.us/xview3_dataset_whitepaper.pdf"),
    ],
    downloadMechanism: { description: "Official registration and login after current terms review", invoked: false },
    terms: terms("account-gated-terms-insufficient", [], "The project describes data as free/open, but current terms were not retrievable and component rights vary."),
    version: version("unverified", null, ["identify challenge release", "freeze aligned object manifest"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-authorized-dry-run", "Exact official size unresolved; unofficial claims excluded"),
    destination: destination("logical-concept-only", "quarantine/bluesight/bluesight-xview3-sar/<verified-release>/"),
    provenance: provenance(["challenge release", "scene IDs", "Sentinel-1 lineage", "composite and label rights", "AIS derivation", "processing history", "terms snapshot", "hashes"]),
    validation: validation(["preserve GeoTIFF and NoData -32768", "UTM CRS", "aligned raster shapes", "VV/VH units", "wind quality", "land and ice masks", "label coordinates", "scene splits", "no inferred identity or activity"]),
    statuses: ["TERMS_HOLD", "VERSION_HOLD", "SIZE_HOLD"],
    gate: closedGate("current terms absent", "release and object manifest absent", "bounded size absent", "pilot approval absent"),
  }),
  candidate({
    id: "bluesight-ultralytics-yolo26",
    application: "BlueSight",
    modalities: ["camera", "environmental-object-recognition"],
    artifactKinds: ["model-software", "unselected-model-checkpoint"],
    trainingSourceRole: "model-software-and-unselected-checkpoints-not-training-data",
    sourceSummary: "Ultralytics YOLO26 detection, segmentation, and tracking software plus separately selected checkpoints.",
    authorityReferences: [
      authority("YOLO26 documentation", "publisher-documentation", "https://github.com/ultralytics/ultralytics/blob/main/docs/en/models/yolo26.md"),
      authority("Ultralytics repository", "publisher-repository", "https://github.com/ultralytics/ultralytics"),
      authority("Ultralytics repository license", "publisher-terms", "https://github.com/ultralytics/ultralytics/blob/main/LICENSE"),
    ],
    downloadMechanism: { description: "Exact source package and checkpoint only after a written licensing and artifact decision", invoked: false },
    terms: terms("copyleft-or-enterprise-decision-required", ["AGPL-3.0", "Ultralytics Enterprise"], "Closed Fusarium use requires a licensing decision; code terms do not establish checkpoint or training-data rights."),
    version: version("named-version-observed-artifact-unfrozen", "documentation identity 26.0.0", ["pin repository commit", "package version and hash", "checkpoint SKU and URL", "export format", "runtime"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-artifact-selection", "Package, weights, converted engines, and cache must be sized separately"),
    destination: destination("logical-concept-only", "quarantine/bluesight/bluesight-ultralytics-yolo26/<approved-artifact-revision>/"),
    provenance: provenance(["separate code record", "weight record", "model card", "training-data disclosure", "export and conversion", "license record"]),
    validation: validation(["rights-cleared environmental evaluation data", "class ontology", "confidence calibration", "preprocessing", "engine parity", "robustness", "false-positive and false-negative evidence"]),
    statuses: ["COMMERCIAL_LICENSE_HOLD", "VERSION_HOLD", "SIZE_HOLD"],
    gate: closedGate("AGPL compliance or Enterprise decision absent", "exact package and checkpoint unpinned", "artifact bytes absent", "artifact approval absent"),
  }),
  candidate({
    id: "bluesight-sahi-framework",
    application: "BlueSight",
    modalities: ["camera", "environmental-object-recognition"],
    artifactKinds: ["software-framework"],
    trainingSourceRole: "software-only-not-training-data",
    sourceSummary: "SAHI sliced-aided inference framework for large images; software only, with no dataset or model weight.",
    authorityReferences: [
      authority("SAHI on PyPI", "publisher-page", "https://pypi.org/project/sahi/"),
      authority("OBSS SAHI repository", "publisher-repository", "https://github.com/obss/sahi"),
    ],
    downloadMechanism: { description: "Exact hashed PyPI artifact through an approved dependency process", invoked: false },
    terms: terms("publisher-license-observed", ["MIT"], "SAHI's license was observed; dependencies and downstream detectors retain separate terms."),
    version: version("named-version-observed-artifact-unfrozen", "0.12.6 released 2026-08-16", ["dependency lock", "security review", "detector adapter", "deployed-environment definition"]),
    checksum: checksum("provider-checksums-observed-local-sha256-absent", [
      { artifact: "sahi 0.12.6 wheel", algorithm: "SHA-256", value: "de352051115f5445a09aed396b84ad807dab54ea1452d5f497417689dc495b8e", verifiedByMycosoft: false },
      { artifact: "sahi 0.12.6 source distribution", algorithm: "SHA-256", value: "edc8457a4a4432e7466c80afab71b0faf6990a7bd534f8fcd389680f967ddbf8", verifiedByMycosoft: false },
    ]),
    size: size("published-estimate-manifest-unverified", "151.9 KB wheel or 34.3 MB source before dependencies; environment and model bytes TBD_BY_LOCKFILE"),
    destination: destination("logical-concept-only", "quarantine/bluesight/bluesight-sahi-framework/0.12.6/"),
    provenance: provenance(["PyPI JSON and release time", "artifact URL", "provider SHA-256", "MIT text", "dependency lock", "build environment", "detector adapter"]),
    validation: validation(["artifact hash", "dependency resolution", "slice and recombine determinism", "coordinate restoration", "edge-object behavior", "non-maximum suppression", "unsliced parity", "never report as trained intelligence"]),
    statuses: ["CANDIDATE_CLOSED"],
    gate: closedGate("software review absent", "security review absent", "detector-specific approval absent"),
  }),

  candidate({
    id: "fci-zenodo-oyster-fungi-electrical",
    application: "FCI",
    modalities: ["fungal-bioelectric"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "FUNGAR electrical recordings from substrates colonized by Pleurotus ostreatus and P. djamor.",
    authorityReferences: [
      authority("Zenodo record 4430968", "publisher-page", "https://zenodo.org/records/4430968", "10.5281/zenodo.4430968"),
    ],
    downloadMechanism: { description: "Exact Zenodo file after written rights approval", invoked: false },
    terms: terms("license-not-observed", [], "The current Rights field did not expose a dataset license; a related article license is insufficient."),
    version: version("metadata-observed-artifact-unfrozen", "created 2021-01-10; modified 2021-01-11", ["freeze exact record and file identity"]),
    checksum: checksum("provider-checksums-observed-local-sha256-absent", [
      { artifact: "Experiments Electrical Recordings-20210110T195743Z-001.zip", algorithm: "MD5", value: "ae00e6ace4114f8ca33572b4930c41b4", verifiedByMycosoft: false },
    ]),
    size: size("published-size-expanded-size-unverified", "413.2 MB published archive; expanded bytes TBD_BY_DRY_RUN"),
    destination: destination("logical-concept-only", "quarantine/fci/fci-zenodo-oyster-fungi-electrical/4430968-v1/"),
    provenance: provenance(["DOI", "record metadata", "authors and project", "exact filename", "provider MD5", "rights snapshot", "retrieval time", "local SHA-256"]),
    validation: validation(["non-executing format inspection", "channels", "timestamps", "units", "missingness", "electrode and ADC metadata", "species and substrate labels", "replicate boundaries"]),
    statuses: ["TERMS_HOLD"],
    gate: closedGate("written dataset license absent", "expanded-size dry run absent", "pilot approval absent"),
  }),
  candidate({
    id: "fci-zenodo-four-fungi-electrical",
    application: "FCI",
    modalities: ["fungal-bioelectric"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "Electrical activity from Omphalotus nidiformis, Flammulina velutipes, Schizophyllum commune, and Cordyceps militaris.",
    authorityReferences: [
      authority("Zenodo record 5790768", "publisher-page", "https://zenodo.org/records/5790768", "10.5281/zenodo.5790768"),
    ],
    downloadMechanism: { description: "Exact Zenodo files after written rights approval", invoked: false },
    terms: terms("license-not-observed", [], "The current record did not expose a dataset license; public visibility is not approval."),
    version: version("metadata-observed-artifact-unfrozen", "created 2021-12-18; modified 2024-04-25", ["freeze record revision and four exact file identities"]),
    checksum: checksum("provider-checksums-observed-local-sha256-absent", [
      { artifact: "Cordyceps archive", algorithm: "MD5", value: "eccffa79d6ce06fd87d3ab023edc2c0f", verifiedByMycosoft: false },
      { artifact: "Enoki archive", algorithm: "MD5", value: "07d8380ff1599543ab7084fed8719f5f", verifiedByMycosoft: false },
      { artifact: "Ghost archive", algorithm: "MD5", value: "e7ab176bcfe940eb8bb9613b1020bf85", verifiedByMycosoft: false },
      { artifact: "Schizophyllum archive", algorithm: "MD5", value: "bc071c0b6bb59d18833114a4621f6a30", verifiedByMycosoft: false },
    ]),
    size: size("published-size-expanded-size-unverified", "84.6 MB published total across four archives; expanded bytes TBD_BY_DRY_RUN"),
    destination: destination("logical-concept-only", "quarantine/fci/fci-zenodo-four-fungi-electrical/5790768-2024-04-25/"),
    provenance: provenance(["distinct taxon and file identity", "DOI", "dates", "electrode and ADC description", "one-sample-per-second statement", "provider MD5", "rights evidence", "SHA-256"]),
    validation: validation(["up to eight electrode-pair channels", "sample cadence", "voltage range", "duration", "species and file mapping", "timestamp reconstruction", "finite values", "cross-species split leakage"]),
    statuses: ["TERMS_HOLD"],
    gate: closedGate("dataset rights absent", "pilot approval absent"),
  }),
  candidate({
    id: "fci-figshare-plant-response-library",
    application: "FCI",
    modalities: ["plant-bioelectric"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "Plant electrophysiological responses across more than fifteen species under flame or tactile stimuli.",
    authorityReferences: [
      authority("Taylor & Francis Figshare record", "publisher-page", "https://tandf.figshare.com/articles/dataset/A_library_of_electrophysiological_responses_in_plants_-_a_model_of_transversal_education_and_open_science/25425920", "10.6084/m9.figshare.25425920"),
    ],
    downloadMechanism: { description: "Figshare Download all or exact file API after approval", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Publisher license observed for Version 2; exact object evidence remains required."),
    version: version("named-version-observed-artifact-unfrozen", "Version 2 posted 2024-04-08", ["freeze exact file manifest"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("published-size-expanded-size-unverified", "65.22 MB published total; expanded bytes TBD_BY_DRY_RUN"),
    destination: destination("logical-concept-only", "quarantine/fci/fci-figshare-plant-response-library/v2/"),
    provenance: provenance(["DOI", "version", "authors", "species", "stimulus", "institution or collector", "exact files", "license snapshot", "citation", "hashes"]),
    validation: validation(["separate flame and tactile stimuli", "baseline and onset", "units", "sample rate", "electrode metadata", "species and replicate", "response delay", "no safety-event generalization"]),
    statuses: ["CANDIDATE_CLOSED"],
    gate: closedGate("exact object manifest absent", "provider checksum absent", "expanded size absent", "pilot approval absent"),
  }),
  candidate({
    id: "fci-zenodo-plant-weather-monitoring",
    application: "FCI",
    modalities: ["plant-bioelectric"],
    artifactKinds: ["dataset", "context-dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "Hedera helix electrophysiology with weather context and separate derived feature-selection artifacts.",
    authorityReferences: [
      authority("Zenodo record 15095523", "publisher-page", "https://zenodo.org/records/15095523", "10.5281/zenodo.15095523"),
    ],
    downloadMechanism: { description: "Exact Zenodo files after written rights approval", invoked: false },
    terms: terms("license-not-observed", [], "The current Rights field did not expose a dataset license; open language is insufficient."),
    version: version("named-version-observed-artifact-unfrozen", "Version 1; created 2025-03-27; modified 2026-03-05", ["freeze exact record revision and files"]),
    checksum: checksum("provider-checksums-observed-local-sha256-absent", [
      { artifact: "plant data", algorithm: "MD5", value: "da4711e3ee553c172d13977f7ea505d9", verifiedByMycosoft: false },
      { artifact: "weather data", algorithm: "MD5", value: "cee1cba7d59cca5b80d62f3fe33698c8", verifiedByMycosoft: false },
      { artifact: "feature selection", algorithm: "MD5", value: "6ace334473e48a70e4d16f3c13a0fe39", verifiedByMycosoft: false },
    ]),
    size: size("published-size-expanded-size-unverified", "444.2 MB published total; expanded bytes TBD_BY_DRY_RUN"),
    destination: destination("logical-concept-only", "quarantine/fci/fci-zenodo-plant-weather-monitoring/15095523-v1/"),
    provenance: provenance(["raw plant artifact", "weather artifact", "derived feature artifact", "time-zone and clock lineage", "DOI", "version", "MD5", "terms snapshot", "SHA-256"]),
    validation: validation(["clock alignment before interpolation", "missingness", "electrode and ADC units", "environment metadata", "weather-source identity", "subject-disjoint splits", "raw data remains authoritative"]),
    statuses: ["TERMS_HOLD"],
    gate: closedGate("dataset license absent", "exact schema absent", "expanded size absent", "pilot approval absent"),
  }),

  candidate({
    id: "thermal-usgs-landsat-c2-l2-st",
    application: "Thermal",
    modalities: ["thermal-radiometric", "thermal-context"],
    artifactKinds: ["context-dataset"],
    trainingSourceRole: "context-candidate-not-approved",
    sourceSummary: "Landsat Collection 2 Level-2 calibrated surface-temperature context.",
    authorityReferences: [
      authority("USGS Collection 2 Surface Temperature", "government-catalog", "https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature"),
      authority("USGS Collection 2 overview", "government-catalog", "https://www.usgs.gov/landsat-missions/landsat-collection-2"),
      authority("USGS Landsat data access", "government-catalog", "https://www.usgs.gov/landsat-missions/landsat-data-access"),
    ],
    downloadMechanism: { description: "EarthExplorer, Bulk Download, cloud/STAC, or ESPA for one approved AOI/time window", invoked: false },
    terms: terms("publisher-public-domain-observed", ["U.S. public domain"], "USGS open-data and public-domain evidence observed; attribution and product citation remain required."),
    version: version("named-version-observed-artifact-unfrozen", "Collection 2 Level-2", ["spacecraft", "scene and product ID", "processing date", "tier and category", "MTL metadata", "object digests"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-dry-run", "One named AOI/time window only; full archive ingestion excluded"),
    destination: destination("logical-concept-only", "quarantine/thermal/thermal-usgs-landsat-c2-l2-st/<scene-or-aoi-manifest>/"),
    provenance: provenance(["product ID", "acquisition and processing times", "sensor", "path and row", "tier", "QA bands", "MTL/XML", "source endpoint", "public-domain evidence", "hashes"]),
    validation: validation(["preserve original COG/TIFF and metadata", "metadata scale and offset", "Kelvin range", "QA_PIXEL and ST_QA", "saturation", "cloud and shadow", "CRS and bounds", "NoData", "reproducible derivatives"]),
    statuses: ["CANDIDATE_CLOSED", "SIZE_HOLD"],
    gate: closedGate("AOI and freshness purpose absent", "bounded manifest absent", "pilot approval absent"),
  }),
  candidate({
    id: "thermal-nasa-ecostress-v003-lste",
    application: "Thermal",
    modalities: ["thermal-radiometric", "thermal-context"],
    artifactKinds: ["context-dataset"],
    trainingSourceRole: "context-candidate-not-approved",
    sourceSummary: "ECOSTRESS Version 3 gridded or tiled land-surface temperature and emissivity at 70 meters.",
    authorityReferences: [
      authority("NASA ECOSTRESS V3 release notice", "government-catalog", "https://www.earthdata.nasa.gov/data/alerts-outages/ecostress-version-3-level-2-data-products-released"),
      authority("ECOSTRESS ECO_L2G_LSTE.003 product DOI", "government-catalog", "https://doi.org/10.5067/ECOSTRESS/ECO_L2G_LSTE.003", "10.5067/ECOSTRESS/ECO_L2G_LSTE.003"),
    ],
    downloadMechanism: { description: "Earthdata Search, AppEEARS, or approved LP DAAC API after exact collection review", invoked: false },
    terms: terms("public-domain-with-object-review", ["NASA CC0 guidance"], "NASA-led mission guidance observed; exact CMR UseConstraints must be snapshotted per collection."),
    version: version("named-version-observed-artifact-unfrozen", "V003 released 2026-04-27", ["granule IDs", "production times", "CMR revision", "HDF5 or COG variant", "cloud-mask companion"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-dry-run", "One AOI/time window with LSTE and cloud-mask assets"),
    destination: destination("logical-concept-only", "quarantine/thermal/thermal-nasa-ecostress-v003-lste/<granule-manifest>/"),
    provenance: provenance(["DOI", "collection name and version", "granule UR", "orbit and scene", "acquisition and production time", "geolocation correction", "emissivity", "cloud mask", "terms", "hashes"]),
    validation: validation(["HDF5 or COG schema", "scale and fill", "geolocation", "units", "emissivity bands", "cloud mask", "CRS", "cross-product alignment", "not a local device reading"]),
    statuses: ["CANDIDATE_CLOSED", "SIZE_HOLD"],
    gate: closedGate("exact CMR rights snapshot absent", "object manifest absent", "bounded size absent", "pilot approval absent"),
  }),
  candidate({
    id: "thermal-noaa-goes-r-abi-lst",
    application: "Thermal",
    modalities: ["thermal-radiometric", "thermal-context"],
    artifactKinds: ["context-dataset"],
    trainingSourceRole: "context-candidate-not-approved",
    sourceSummary: "GOES-R ABI Level-2+ land-surface temperature for high-cadence regional context.",
    authorityReferences: [
      authority("GOES-R LST product", "government-catalog", "https://goes-r.noaa.gov/products/baseline-LST.html"),
      authority("NOAA NCEI cloud access", "government-catalog", "https://www.ncei.noaa.gov/access/cloud-access"),
      authority("GOES-R Beginner's Guide", "publisher-documentation", "https://www-prod.goesr.woc.noaa.gov/downloads/resources/documents/Beginners_Guide_to_GOES-R_Series_Data.pdf"),
    ],
    downloadMechanism: { description: "Bounded public-object listing and transfer only after an approved satellite/sector/time manifest", invoked: false },
    terms: terms("public-domain-with-object-review", ["U.S. public domain guidance"], "NOAA government-data guidance observed; exact bucket/product metadata and non-NOAA components need review."),
    version: version("component-selection-unverified", null, ["satellite", "product code", "scan mode", "sector", "start/end/creation times", "algorithm version", "object key", "ETag interpretation"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-dry-run", "One sector and bounded period; full-period mirroring excluded"),
    destination: destination("logical-concept-only", "quarantine/thermal/thermal-noaa-goes-r-abi-lst/<satellite-sector-window>/"),
    provenance: provenance(["bucket and key", "NOAA product metadata", "satellite and sector", "timestamps", "quality flags", "algorithm version", "terms evidence", "hashes"]),
    validation: validation(["NetCDF schema", "Kelvin units", "scale and fill", "quality flags", "scan times", "sector bounds", "chronological completeness", "preserve originals", "deterministic derivatives"]),
    statuses: ["CANDIDATE_CLOSED", "SIZE_HOLD"],
    gate: closedGate("exact object window absent", "bounded size absent", "pilot approval absent"),
  }),
  candidate({
    id: "thermal-flir-adas-starter",
    application: "Thermal",
    modalities: ["thermal-radiometric", "camera"],
    artifactKinds: ["dataset", "annotations"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "Teledyne FLIR visible and thermal ADAS pairs with annotations; a sensor-fusion benchmark, not radiometric environmental truth.",
    authorityReferences: [
      authority("Teledyne FLIR starter dataset", "publisher-page", "https://oem.flir.com/en-gb/solutions/automotive/adas-dataset-form/"),
      authority("Teledyne FLIR dataset overview", "publisher-page", "https://oem.flir.com/en-hk/solutions/automotive/dataset"),
    ],
    downloadMechanism: { description: "Account-gated form after terms, privacy, and intended-use review", invoked: false },
    terms: terms("account-gated-terms-insufficient", [], "Public pages do not expose sufficient redistribution, training, or production terms; people and road scenes add privacy review."),
    version: version("unverified", null, ["release tag", "annotation revision", "license agreement", "object manifest"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-authorized-dry-run", "Approximately 14,000 annotated image pairs published; bytes unresolved"),
    destination: destination("unassigned-on-rights-hold", null, "quarantine/thermal/thermal-flir-adas-starter/<licensed-release>/"),
    provenance: provenance(["license agreement", "release", "scene and frame identity", "thermal and visible pairing", "ontology", "collection geography and time", "privacy review", "hashes"]),
    validation: validation(["radiometric versus display-only status", "pair registration", "bit depth", "palettes", "labels", "duplicates", "person-related handling", "never derive temperature from colorized frames"]),
    statuses: ["TERMS_HOLD", "SIZE_HOLD"],
    gate: closedGate("account terms absent", "privacy and intended-use review absent", "exact release absent", "bounded size absent", "pilot approval absent"),
  }),

  candidate({
    id: "tactus-droid-rlds-pilot",
    application: "Tactus — Mechanical",
    modalities: ["robot-manipulation", "proprioception", "camera"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "DROID Franka Panda manipulation demonstrations with images, language, gripper, Cartesian, joint, and commanded-action evidence.",
    authorityReferences: [
      authority("DROID project", "publisher-page", "https://droid-dataset.github.io/"),
      authority("DROID dataset documentation", "publisher-documentation", "https://droid-dataset.github.io/droid/the-droid-dataset"),
      authority("DROID paper", "paper", "https://www.jiajunwu.com/papers/droid_rss.pdf"),
    ],
    downloadMechanism: { description: "Exact Google Cloud bucket objects after approval; only droid_100 is eligible for first review", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Dataset license observed in the paper; privacy and raw-video caveats remain under review."),
    version: version("component-selection-unverified", "droid_100 proposed for first review", ["bucket generations", "object list", "metadata revision", "calibration and annotation update identity"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("published-estimate-manifest-unverified", "2 GB droid_100; 1.7 TB full RLDS; 5.6 TB non-stereo raw; 8.7 TB stereo-HD raw; full/raw variants remain SIZE_HOLD"),
    destination: destination("logical-concept-only", "quarantine/tactus/tactus-droid-rlds-pilot/<bucket-snapshot>/"),
    provenance: provenance(["episode metadata", "original path", "language annotations", "camera calibration revision", "pseudonymous collector and building IDs", "robot configuration", "bucket generation", "terms", "hashes"]),
    validation: validation(["RLDS episode boundaries", "image decode", "joint and action shapes", "finite values", "units and timestamps", "terminal flags", "camera calibration", "commanded-versus-measured distinction", "Franka-to-mycobot transfer gap"]),
    statuses: ["CANDIDATE_CLOSED"],
    gate: closedGate("exact bucket snapshot absent", "privacy review absent", "2 GB pilot approval absent", "full and raw variants size-held"),
  }),
  candidate({
    id: "tactus-bridgedata-v2",
    application: "Tactus — Mechanical",
    modalities: ["robot-manipulation", "proprioception", "camera"],
    artifactKinds: ["dataset"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "BridgeData V2 WidowX 250 demonstrations with RGB or RGB-D views and language labels.",
    authorityReferences: [
      authority("BridgeData V2 project", "publisher-page", "https://rail-berkeley.github.io/bridgedata/"),
    ],
    downloadMechanism: { description: "Exact project-hosted teleoperated and scripted JPEG archives after approval", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Project page license observed; exact artifacts still need a bounded manifest."),
    version: version("named-version-observed-artifact-unfrozen", "V2; 60,096 trajectories, 24 environments, 13 skills", ["freeze exact teleoperated and scripted files"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("tbd-by-dry-run", "Published trajectory counts are not byte estimates"),
    destination: destination("logical-concept-only", "quarantine/tactus/tactus-bridgedata-v2/v2/"),
    provenance: provenance(["teleoperated or scripted origin", "trajectory/task/environment IDs", "camera views", "robot configuration", "language label", "citation", "terms", "hashes"]),
    validation: validation(["archive safety", "trajectory boundaries", "5 Hz control rate", "duration", "image dimensions", "view and depth presence", "action and state schema", "language labels", "WidowX-to-mycobot transfer gap"]),
    statuses: ["CANDIDATE_CLOSED", "SIZE_HOLD"],
    gate: closedGate("exact file list absent", "bytes and checksums absent", "pilot approval absent"),
  }),
  candidate({
    id: "tactus-touch-and-go",
    application: "Tactus — Mechanical",
    modalities: ["tactile", "camera"],
    artifactKinds: ["dataset", "annotations"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "Human-collected paired RGB and GelSight tactile videos with material labels and touch-onset annotations.",
    authorityReferences: [
      authority("Touch and Go project", "publisher-page", "https://touch-and-go.github.io/"),
      authority("Touch and Go NeurIPS dataset paper linked from the project", "paper", null, null, "future-required"),
    ],
    downloadMechanism: { description: "Exact project-linked Google Drive release after approval", invoked: false },
    terms: terms("publisher-license-observed", ["CC BY 4.0"], "Project-page license observed; exact Drive release and privacy posture remain unresolved."),
    version: version("unverified", null, ["immutable release", "object manifest", "provider digests"]),
    checksum: checksum("provider-checksum-not-observed"),
    size: size("tbd-by-dry-run", "Exact files and bytes require metadata enumeration without content transfer"),
    destination: destination("logical-concept-only", "quarantine/tactus/tactus-touch-and-go/<verified-release>/"),
    provenance: provenance(["RGB and tactile pair ID", "object and material label", "touch onset", "collector and session", "location privacy review", "source page", "license", "object IDs", "hashes"]),
    validation: validation(["pair timestamps", "video decode", "frame rates", "GelSight orientation and calibration", "material ontology", "touch-onset alignment", "duplicates", "incidental-person and private-location handling", "not a robot action policy"]),
    statuses: ["CANDIDATE_CLOSED", "VERSION_HOLD", "SIZE_HOLD"],
    gate: closedGate("exact Drive release absent", "privacy review absent", "object and size manifest absent", "pilot approval absent"),
  }),
  candidate({
    id: "tactus-open-x-embodiment-rt1x",
    application: "Tactus — Mechanical",
    modalities: ["robot-manipulation", "proprioception", "camera"],
    artifactKinds: ["dataset", "model-software", "unselected-model-checkpoint"],
    trainingSourceRole: "candidate-not-approved",
    sourceSummary: "Open X-Embodiment RLDS aggregation and RT-1-X checkpoint as a component-level cross-embodiment benchmark.",
    authorityReferences: [
      authority("Google DeepMind Open X-Embodiment repository", "publisher-repository", "https://github.com/google-deepmind/open_x_embodiment"),
      authority("Open X-Embodiment project", "publisher-page", "https://robotics-transformer-x.github.io/"),
    ],
    downloadMechanism: { description: "One exact rights-cleared component or checkpoint object set after approval", invoked: false },
    terms: terms("component-terms-review-required", ["Apache-2.0 software", "CC BY 4.0 other materials", "per-component upstream terms"], "Aggregate terms do not erase contributing-dataset licenses or citation duties."),
    version: version("component-selection-unverified", null, ["repository commit", "dataset and config versions", "spreadsheet revision", "bucket generations", "checkpoint objects"]),
    checksum: checksum("artifact-selection-unverified"),
    size: size("tbd-by-component-dry-run", "More than one million trajectories across 22 embodiments; whole-corpus ingestion is not a pilot"),
    destination: destination("logical-concept-only", "quarantine/tactus/tactus-open-x-embodiment-rt1x/<component-manifest>/"),
    provenance: provenance(["each contributing dataset", "citation", "license", "embodiment", "schema and config", "bucket object", "separate code/checkpoint/data lineage"]),
    validation: validation(["one rights-cleared component", "RLDS schema", "embodiment and action mapping", "image and language alignment", "normalized action semantics", "offline checkpoint parity", "no hardware connection"]),
    statuses: ["TERMS_HOLD", "VERSION_HOLD", "SIZE_HOLD"],
    gate: closedGate("component selection absent", "rights review absent", "exact manifest absent", "bounded size absent", "pilot approval absent"),
  }),
  candidate({
    id: "tactus-mycosoft-mycobot-passive-logs",
    application: "Tactus — Mechanical",
    modalities: ["robot-manipulation", "proprioception", "tactile", "camera"],
    artifactKinds: ["capture-plan"],
    trainingSourceRole: "future-capture-plan-only",
    sourceSummary: "Proposed passive myCobot 280 Pi state, force, tactile, camera, and operator-demonstration logs; no dataset is established.",
    authorityReferences: [
      authority("Future approved Mycosoft capture protocol", "future-internal-protocol", null, null, "future-required"),
      authority("Exact manufacturer and API documentation", "publisher-documentation", null, null, "future-required"),
      authority("Versioned Mycosoft hardware portfolio", "future-internal-protocol", null, null, "future-required"),
    ],
    downloadMechanism: { description: "None; no arm discovery, read, motion, capture, or service call is authorized", invoked: false },
    terms: terms("internal-rights-review-required", [], "Log ownership, manufacturer software rights, incidental-person data, and operator consent require review."),
    version: version("capture-plan-unverified", null, ["arm serial identity", "firmware", "SDK and backend", "kinematic definition", "end effector", "sensor calibration", "file schema"]),
    checksum: checksum("capture-plan-unverified"),
    size: size("tbd-by-capture-plan", "TBD from channels, camera resolution, rates, sessions, formats, replicates, and retention copies"),
    destination: destination("logical-concept-only", "quarantine/tactus/tactus-mycosoft-mycobot-passive-logs/<capture-protocol-version>/"),
    provenance: provenance(["device and operator identity", "mission or test ID", "code/firmware/config hashes", "safety state", "intended action", "validator decision", "dispatch and acknowledgement state", "measured state", "calibration", "session clock", "raw hashes"]),
    validation: validation(["offline passive logs first", "joint order and units", "time synchronization", "limits", "frame graph", "dropped samples", "command and outcome separation", "session isolation", "separate motion authority"], "capture-plan-not-approved"),
    statuses: ["CAPTURE_PLAN_ONLY"],
    gate: closedGate("capture protocol absent", "rights and consent review absent", "storage approval absent", "hardware-safety authority absent", "training approval absent"),
  }),
]

export const MULTIMODAL_NON_CANDIDATE_DIRECTIONS = [
  {
    direction: "broad-hugging-face-discovery",
    state: "not-a-candidate",
    reason: "A broad catalog request has no exact organization, repository, artifact kind, immutable revision, complete card, license record, object list, digest, or bounded approval.",
    acquisitionAuthority: false,
  },
] as const

export const MULTIMODAL_SOURCE_REGISTRY_V1 = {
  schema: MULTIMODAL_SOURCE_REGISTRY_SCHEMA,
  version: MULTIMODAL_SOURCE_REGISTRY_VERSION,
  sourceResearch: MULTIMODAL_SOURCE_RESEARCH,
  candidates: MULTIMODAL_SOURCE_CANDIDATES,
  nonCandidateDirections: MULTIMODAL_NON_CANDIDATE_DIRECTIONS,
  executionPolicy: {
    metadataOnly: true,
    networkRequestsAuthorized: false,
    downloadsAuthorized: false,
    filesystemOrNasAccessAuthorized: false,
    credentialUseAuthorized: false,
    trainingAuthorized: false,
    modelPromotionAuthorized: false,
    serviceChangesAuthorized: false,
    deviceActionsAuthorized: false,
  },
} as const

export function multimodalSourceCandidateById(
  id: string,
): MultimodalSourceCandidateV1 | undefined {
  return MULTIMODAL_SOURCE_CANDIDATES.find((entry) => entry.id === id)
}

export function multimodalSourceCandidatesForApplication(
  application: MultimodalApplication,
): readonly MultimodalSourceCandidateV1[] {
  return MULTIMODAL_SOURCE_CANDIDATES.filter(
    (entry) => entry.application === application,
  )
}

export function validateMultimodalSourceRegistryV1(): readonly string[] {
  const issues: string[] = []
  const ids = new Set<string>()

  if (MULTIMODAL_SOURCE_CANDIDATES.length !== MULTIMODAL_SOURCE_CANDIDATE_COUNT) {
    issues.push("candidate count mismatch")
  }

  for (const entry of MULTIMODAL_SOURCE_CANDIDATES) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id)) {
      issues.push(`${entry.id}: invalid or duplicate candidate id`)
    }
    ids.add(entry.id)
    if (!entry.modalities.length || !entry.artifactKinds.length) {
      issues.push(`${entry.id}: modality or artifact kind absent`)
    }
    if (!entry.authorityReferences.length) {
      issues.push(`${entry.id}: authority references absent`)
    }
    if (
      entry.authorityReferences.some(
        (reference) =>
          reference.observationState === "observed" &&
          reference.url === null &&
          reference.doi === null,
      )
    ) {
      issues.push(`${entry.id}: observed authority has no locator`)
    }
    if (
      entry.terms.sufficientForAcquisition !== false ||
      entry.version.immutableArtifactFrozen !== false ||
      entry.checksum.mycosoftSha256 !== null ||
      entry.size.boundedObjectManifestPresent !== false ||
      entry.size.destinationCapacityVerified !== false ||
      entry.destination.physicalLocationVerified !== false ||
      entry.provenance.captured !== false ||
      entry.validation.completed !== false ||
      entry.approval.state !== "absent" ||
      entry.approval.approver !== null ||
      entry.approval.approvedAt !== null ||
      entry.approval.scope !== null ||
      entry.gate.state !== "closed" ||
      !entry.gate.blockers.length ||
      entry.downloadMechanism.invoked !== false ||
      entry.executionAuthority !== false
    ) {
      issues.push(`${entry.id}: fail-closed evidence boundary is incomplete`)
    }
  }

  const expectedApplicationCounts: Readonly<Record<MultimodalApplication, number>> = {
    GANDHA: 5,
    BlueSight: 6,
    FCI: 4,
    Thermal: 4,
    "Tactus — Mechanical": 5,
  }
  for (const [application, expected] of Object.entries(expectedApplicationCounts)) {
    if (
      multimodalSourceCandidatesForApplication(application as MultimodalApplication)
        .length !== expected
    ) {
      issues.push(`${application}: candidate count mismatch`)
    }
  }

  const yolo = multimodalSourceCandidateById("bluesight-ultralytics-yolo26")
  if (
    !yolo ||
    !yolo.statuses.includes("COMMERCIAL_LICENSE_HOLD") ||
    !yolo.statuses.includes("VERSION_HOLD") ||
    yolo.trainingSourceRole !==
      "model-software-and-unselected-checkpoints-not-training-data"
  ) {
    issues.push("YOLO26 license/version boundary mismatch")
  }

  const sahi = multimodalSourceCandidateById("bluesight-sahi-framework")
  if (
    !sahi ||
    sahi.trainingSourceRole !== "software-only-not-training-data" ||
    sahi.artifactKinds.length !== 1 ||
    sahi.artifactKinds[0] !== "software-framework"
  ) {
    issues.push("SAHI software-only boundary mismatch")
  }

  if (
    MULTIMODAL_SOURCE_CANDIDATES.some((entry) =>
      entry.id.includes("hugging-face"),
    ) ||
    MULTIMODAL_NON_CANDIDATE_DIRECTIONS.some(
      (entry) => entry.state !== "not-a-candidate",
    )
  ) {
    issues.push("broad Hugging Face discovery became a candidate")
  }

  return issues
}
