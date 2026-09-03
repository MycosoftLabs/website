import type { SensingSourceId } from "./contracts"

/**
 * Source-inspected reuse inventory. This is not a runtime connectivity report.
 * Every operational axis stays not_probed until a separately approved read gate.
 */

export const SENSING_REUSE_MATRIX_SCHEMA = "fusarium-sensing-reuse-matrix/v1" as const

export type SensingReuseLevel =
  | "read_adapter_candidate"
  | "source_types_reusable"
  | "contract_only"
  | "none_quarantined"

export interface SensingReadCandidate {
  method: "GET"
  path: string
  sourceFile: string
  evidence: string
}

export interface SensingQuarantineEntry {
  method: "GET" | "POST" | "ANY"
  path: string
  sourceFile: string
  reason: string
}

export interface SensingReuseRow {
  sourceId: SensingSourceId
  label: string
  reuseLevel: SensingReuseLevel
  approvedForTrustedRead: false
  reusableSourceTypes: readonly string[]
  readCandidates: readonly SensingReadCandidate[]
  quarantined: readonly SensingQuarantineEntry[]
  axes: {
    configured: "not_probed"
    reachable: "not_probed"
    authorized: "not_probed"
    schemaFresh: "source_inspected"
    dataPresent: "unknown"
  }
  qualification: string
  nextAction: string
}

const UNPROBED_AXES = {
  configured: "not_probed",
  reachable: "not_probed",
  authorized: "not_probed",
  schemaFresh: "source_inspected",
  dataPresent: "unknown",
} as const

export const SENSING_REUSE_MATRIX: readonly SensingReuseRow[] = [
  {
    sourceId: "spores",
    label: "Spore observations and dispersal",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: [],
    readCandidates: [
      {
        method: "GET",
        path: "/api/natureos/aerosol/spores",
        sourceFile: "app/api/natureos/aerosol/spores/route.ts",
        evidence: "MINDEX observation proxy; failure returns no observations instead of generated detections.",
      },
      {
        method: "GET",
        path: "/api/natureos/spores",
        sourceFile: "app/api/natureos/spores/route.ts",
        evidence: "NatureOS FUNGA dispersal proxy; explicitly unavailable when the backend does not answer.",
      },
    ],
    quarantined: [
      {
        method: "GET",
        path: "/api/spores/detections",
        sourceFile: "app/api/spores/detections/route.ts",
        reason: "Converts iNaturalist sightings into invented concentration, wind, humidity, and temperature values with Math.random while claiming realData.",
      },
      {
        method: "POST",
        path: "/api/natureos/spores",
        sourceFile: "app/api/natureos/spores/route.ts",
        reason: "The trusted foundation is read-only; write-style request methods are outside this contract.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "Route source exists, but no result shape currently supplies the required classification, provenance, freshness, or confidence envelope.",
    nextAction: "Add a same-origin GET adapter that maps only source records into fusarium-sensing-read/v1 and reports unbound on connector failure.",
  },
  {
    sourceId: "sporebase",
    label: "SporeBase devices, physical samples, and telemetry",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["lib/sporebase.ts hardware and sample-status definitions"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/devices/sporebase",
        sourceFile: "app/api/devices/sporebase/route.ts",
        evidence: "MAS device-list proxy with an empty response when the upstream is absent.",
      },
      {
        method: "GET",
        path: "/api/devices/sporebase/samples",
        sourceFile: "app/api/devices/sporebase/samples/route.ts",
        evidence: "MAS sample-list proxy with explicit empty arrays.",
      },
      {
        method: "GET",
        path: "/api/devices/sporebase/telemetry",
        sourceFile: "app/api/devices/sporebase/telemetry/route.ts",
        evidence: "Device-scoped MAS telemetry proxy; no data generator is present.",
      },
    ],
    quarantined: [
      {
        method: "POST",
        path: "/api/devices/sporebase/samples",
        sourceFile: "app/api/devices/sporebase/samples/route.ts",
        reason: "Creates upstream sample records and is not a read contract.",
      },
      {
        method: "POST",
        path: "/api/devices/sporebase/order",
        sourceFile: "app/api/devices/sporebase/order/route.ts",
        reason: "Commercial/order mutation is outside this read-only evidence lane.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "The GET routes collapse some upstream failures to HTTP 200 empty payloads, so an adapter must distinguish unbound from a completed empty query.",
    nextAction: "Normalize device, sample, and telemetry reads separately; never infer zero spores from absent telemetry.",
  },
  {
    sourceId: "particulate",
    label: "Local particulate mass and particle counts",
    reuseLevel: "source_types_reusable",
    approvedForTrustedRead: false,
    reusableSourceTypes: [
      "lib/mycobrain/types.ts BMV080 pm1, pm2_5, pm4, pm10, particle_count fields",
      "lib/sporebase.ts BMV080 hardware declaration",
    ],
    readCandidates: [],
    quarantined: [],
    axes: UNPROBED_AXES,
    qualification: "Sensor capabilities and units are defined, but no source-inspected route proves BMV080 particulate observations or counts.",
    nextAction: "Bind an actual device telemetry reader and preserve measured zero separately from missing sensor fields.",
  },
  {
    sourceId: "nasa-firms-fire",
    label: "NASA FIRMS fire detections",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["GeoJSON FeatureCollection output from the MINDEX wildfire BFF"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/crep/environment/wildfires",
        sourceFile: "app/api/crep/environment/wildfires/route.ts",
        evidence: "Maps MINDEX earth.wildfires rows to GeoJSON and labels NASA FIRMS VIIRS 375 m source resolution; unavailable remains an empty feature collection with upstream metadata.",
      },
      {
        method: "GET",
        path: "/api/oei/eonet?category=wildfires",
        sourceFile: "app/api/oei/eonet/route.ts",
        evidence: "NASA EONET event feed candidate for event context, not a substitute for FIRMS pixel detections.",
      },
    ],
    quarantined: [
      {
        method: "GET",
        path: "/api/worldview/v1/query?type=crep.live.environmental.wildfires-firms",
        sourceFile: "lib/worldview/registry.ts",
        reason: "The registry label says FIRMS but routes to NASA EONET event context; it must not be represented as VIIRS thermal detections.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "The MINDEX adapter is the strongest source candidate, but connector configuration, authorization, row timestamps, and data presence were not probed.",
    nextAction: "Map detectedAt/sourceId into per-record provenance and evaluate freshness against an operator-approved maximum age.",
  },
  {
    sourceId: "smoke",
    label: "Smoke observations and plumes",
    reuseLevel: "none_quarantined",
    approvedForTrustedRead: false,
    reusableSourceTypes: [],
    readCandidates: [],
    quarantined: [
      {
        method: "GET",
        path: "/api/crep/oyster/emit",
        sourceFile: "app/api/crep/oyster/emit/route.ts",
        reason: "Falls back to three static EMIT plume samples when live data is unavailable; those samples cannot enter trusted smoke evidence.",
      },
      {
        method: "GET",
        path: "/api/crep/tijuana-estuary",
        sourceFile: "app/api/crep/tijuana-estuary/route.ts",
        reason: "Contains explicitly simulated EMIT plumes and approximation polygons.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "No source-inspected smoke-specific observation feed met the trusted read boundary. Fire detections are not smoke measurements.",
    nextAction: "Keep smoke unbound until a feed supplies observed plume geometry or particulate evidence with timestamps and provider provenance.",
  },
  {
    sourceId: "air-quality",
    label: "Regional air quality and pollutant measurements",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["AirNow AQI normalization", "OpenAQ measurement and station field definitions"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/crep/environment/air-quality",
        sourceFile: "app/api/crep/environment/air-quality/route.ts",
        evidence: "MINDEX station/pollutant GeoJSON adapter with an explicit upstream unavailable marker and no mock rows.",
      },
      {
        method: "GET",
        path: "/api/crep/airnow/current",
        sourceFile: "app/api/crep/airnow/current/route.ts",
        evidence: "EPA AirNow nearest-monitor proxy; fails closed when required configuration is absent.",
      },
      {
        method: "GET",
        path: "/api/crep/airnow/bbox",
        sourceFile: "app/api/crep/airnow/bbox/route.ts",
        evidence: "EPA AirNow bbox monitor proxy; returns upstream observations rather than generated stations.",
      },
      {
        method: "GET",
        path: "/api/natureos/feeds/openaq/measurements",
        sourceFile: "app/api/natureos/feeds/openaq/measurements/route.ts",
        evidence: "MAS OpenAQ proxy with explicit unavailable/empty response on connector failure.",
      },
    ],
    quarantined: [
      {
        method: "GET",
        path: "/api/oei/openaq",
        sourceFile: "lib/oei/connectors/openaq.ts",
        reason: "On errors or rate limits the connector emits hardcoded city PM values and random O3/NO2 values as observations.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "Candidates exist for MINDEX, AirNow, and MAS/OpenAQ, but none currently emits the unified classification/provenance/freshness contract.",
    nextAction: "Adapt one approved provider at a time and retain provider-native measuredAt, parameter, value, and unit fields.",
  },
  {
    sourceId: "gis",
    label: "GIS catalog, GeoJSON, and local tiles",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["lib/worldview/registry.ts dataset metadata", "GeoJSON FeatureCollection shapes", "local PMTiles/GeoJSON file serving"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/worldview/v1/catalog",
        sourceFile: "app/api/worldview/v1/catalog/route.ts",
        evidence: "Source-only dataset discovery surface; it describes routes but does not prove their data.",
      },
      {
        method: "GET",
        path: "/api/crep/tiles/[...tile]",
        sourceFile: "app/api/crep/tiles/[...tile]/route.ts",
        evidence: "Same-origin local-file tile/GeoJSON reader with path containment checks.",
      },
    ],
    quarantined: [
      {
        method: "GET",
        path: "/api/worldview/v1/query",
        sourceFile: "app/api/worldview/v1/query/route.ts",
        reason: "The unified query is authenticated and metered; no chargeable or external dataset call is approved by this source-only lane.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "Catalog and local-file serving code are reusable, but dataset licensing, file presence, freshness, and access scope remain per-layer concerns.",
    nextAction: "Create a layer allowlist and attach source, license, capture date, spatial resolution, and checksum before exposing any layer.",
  },
  {
    sourceId: "fci",
    label: "FCI bioelectric signals",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["lib/mindex/fci/interface.ts FCI channel, reading, device, event, and status definitions"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/fci/telemetry?device_id={id}",
        sourceFile: "app/api/fci/telemetry/route.ts",
        evidence: "MINDEX FCI reading-history proxy with device and time-window parameters.",
      },
      {
        method: "GET",
        path: "/api/fci/devices",
        sourceFile: "app/api/fci/devices/route.ts",
        evidence: "MINDEX FCI device-list proxy with an explicit unavailable response for selected upstream statuses.",
      },
    ],
    quarantined: [
      {
        method: "POST",
        path: "/api/fci/telemetry",
        sourceFile: "app/api/fci/telemetry/route.ts",
        reason: "Submits telemetry to MINDEX and is outside the read foundation.",
      },
      {
        method: "POST",
        path: "/api/fci/stimulate",
        sourceFile: "app/api/fci/stimulate/route.ts",
        reason: "Actuation/stimulation is explicitly outside an evidence-only read contract.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "FCI types contain useful confidence and timestamp fields, but runtime reads were not authenticated or schema-verified.",
    nextAction: "Map readings without invoking commands; keep stimulation behind a separate human-authorized control contract.",
  },
  {
    sourceId: "mycobrain",
    label: "MycoBrain environmental and bioelectric device signals",
    reuseLevel: "source_types_reusable",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["lib/mycobrain/types.ts sensor library", "lib/sensors/frames.ts active/simulated frame distinctions"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/natureos/devices/mycobrain",
        sourceFile: "app/api/natureos/devices/mycobrain/route.ts",
        evidence: "Merges MycoBrain service and MINDEX device declarations while retaining source labels and warnings.",
      },
    ],
    quarantined: [
      {
        method: "GET",
        path: "/api/mycobrain/[port]/telemetry",
        sourceFile: "app/api/mycobrain/[port]/telemetry/route.ts",
        reason: "GET sends a POST status command to the device and may auto-ingest telemetry to MINDEX, so it is not side-effect-free.",
      },
      {
        method: "GET",
        path: "/api/natureos/devices/telemetry",
        sourceFile: "app/api/natureos/devices/telemetry/route.ts",
        reason: "Supplies site-default coordinates and current timestamps when source values are missing and crosses into the protected Earth fallback lane.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "Device and sensor schemas are reusable; no inspected telemetry route is both side-effect-free and fully provenance-preserving.",
    nextAction: "Add a passive read adapter that consumes already-published telemetry and never sends device commands or writes during GET.",
  },
  {
    sourceId: "bluesight",
    label: "BlueSight visual/spatial observations and spectral intent",
    reuseLevel: "source_types_reusable",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["lib/bluesight/types.ts observation, detection, track, model-health, and confidence fields"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/natureos/bluesight/observations/latest",
        sourceFile: "app/api/natureos/bluesight/[[...path]]/route.ts",
        evidence: "Catch-all MAS GET proxy used by bluesightLatestObservation.",
      },
    ],
    quarantined: [
      {
        method: "POST",
        path: "/api/natureos/bluesight/[[...path]]",
        sourceFile: "app/api/natureos/bluesight/[[...path]]/route.ts",
        reason: "Generic write passthrough is not part of a trusted read contract.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "BlueSight source types cover camera/lidar/radar/Wi-Fi/microscope observations. No wavelength-resolved or calibrated spectral measurement schema was found.",
    nextAction: "Use the existing observation types for visual/spatial evidence; keep spectral data unbound until a sensor wavelength/intensity contract exists.",
  },
  {
    sourceId: "sine",
    label: "SINE acoustic evidence",
    reuseLevel: "read_adapter_candidate",
    approvedForTrustedRead: false,
    reusableSourceTypes: ["lib/mindex/sine-contract.ts evidence requirements, class families, model provenance, and no-synthetic policy"],
    readCandidates: [
      {
        method: "GET",
        path: "/api/mindex/sine/status",
        sourceFile: "app/api/mindex/sine/status/route.ts",
        evidence: "MINDEX SINE status proxy with explicit unavailable states.",
      },
      {
        method: "GET",
        path: "/api/mindex/sine/models",
        sourceFile: "app/api/mindex/sine/models/route.ts",
        evidence: "Model registry read with explicit missing/upstream status handling.",
      },
      {
        method: "GET",
        path: "/api/mindex/sine/prototypes",
        sourceFile: "app/api/mindex/sine/prototypes/route.ts",
        evidence: "Prototype catalog read with explicit unavailable handling.",
      },
      {
        method: "GET",
        path: "/api/mindex/sine/blobs/[id]/analysis",
        sourceFile: "app/api/mindex/sine/blobs/[id]/analysis/route.ts",
        evidence: "Saved evidence read that returns empty evidence arrays when unavailable.",
      },
    ],
    quarantined: [
      {
        method: "POST",
        path: "/api/mindex/sine/blobs/[id]/analyze",
        sourceFile: "app/api/mindex/sine/blobs/[id]/analyze/route.ts",
        reason: "Runs analysis and is not a passive read.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "The source contract is strong: real audio, model/runtime checksums, evidence links, no LLM/filename/mock fallback. Runtime model and artifact availability remain unprobed.",
    nextAction: "Wrap saved analysis only after validating its model, artifact, prototype, window, and transcript provenance fields.",
  },
  {
    sourceId: "gandha",
    label: "GANDHA VOC, gas, and chemical sensing",
    reuseLevel: "contract_only",
    approvedForTrustedRead: false,
    reusableSourceTypes: [
      "lib/mycobrain/types.ts BME688 gas resistance/IAQ/bVOC/eCO2 fields",
      "lib/mycobrain/types.ts SGP41 VOC/NOx raw and index fields",
    ],
    readCandidates: [],
    quarantined: [
      {
        method: "ANY",
        path: "/api/mindex/smells",
        sourceFile: "app/api/mindex/smells/route.ts",
        reason: "Uses an unproven hardcoded fungal smell database and threshold matcher without measurement, training, calibration, or provenance records.",
      },
      {
        method: "GET",
        path: "/api/mycobrain/[port]/telemetry",
        sourceFile: "app/api/mycobrain/[port]/telemetry/route.ts",
        reason: "The apparent sensor read has command and possible MINDEX-write side effects.",
      },
    ],
    axes: UNPROBED_AXES,
    qualification: "GANDHA product intent exists, but no drift-aware calibrated VOC/gas read API was found. Sensor field definitions alone are not chemical identification evidence.",
    nextAction: "Start with raw gas/VOC values plus temperature, humidity, calibration, baseline, drift, and device provenance; never assert absolute compound identity from an uncalibrated signature.",
  },
]

export function sensingReuseRow(sourceId: SensingSourceId): SensingReuseRow {
  const row = SENSING_REUSE_MATRIX.find((item) => item.sourceId === sourceId)
  if (!row) throw new Error(`unknown sensing source: ${sourceId}`)
  return row
}

export function trustedReadIsBound(sourceId: SensingSourceId): boolean {
  return sensingReuseRow(sourceId).approvedForTrustedRead
}
