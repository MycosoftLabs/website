export type ApiSafety = "passive-read" | "local-analysis" | "gated-write" | "device-action"

export interface ApiCatalogEntry {
  id: string
  domain: "fusarium" | "environment" | "earth" | "biology" | "devices" | "platform"
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  purpose: string
  safety: ApiSafety
  sourceState: "source-present" | "runtime-unbound" | "approval-gated"
}

export interface ApiHealthContract {
  id: string
  label: string
  path: string
  expectedContent: "json"
}

/**
 * Fixed, same-origin, GET-only checks. This list is intentionally separate
 * from the catalog so an operator cannot turn an arbitrary catalog path into
 * a request. Each target is a local contract/read surface and accepts no
 * user-provided URL, method, headers, credentials, or body.
 */
export const API_HEALTH_CONTRACTS: readonly ApiHealthContract[] = [
  { id: "operator-state", label: "Operator state", path: "/api/fusarium/operator/state", expectedContent: "json" },
  { id: "earth-layers", label: "Earth layer catalog", path: "/api/earth-simulator/layers", expectedContent: "json" },
  { id: "field-catalog", label: "Local field catalog", path: "/api/crep/field/_catalog", expectedContent: "json" },
  { id: "compute-snapshot", label: "Local compute snapshot", path: "/api/compute/snapshot", expectedContent: "json" },
] as const

/**
 * Curated operator-facing index, not an OpenAPI claim and not runtime health.
 * Entries name inspected same-origin route sources. The UI intentionally has
 * no request runner: mutation and device-action routes are documentation only.
 */
export const FUSARIUM_API_CATALOG: readonly ApiCatalogEntry[] = [
  { id: "fusarium-root", domain: "fusarium", method: "GET", path: "/api/fusarium/v1", purpose: "Versioned environmental-intelligence discovery contract.", safety: "passive-read", sourceState: "runtime-unbound" },
  { id: "fusarium-readiness", domain: "fusarium", method: "GET", path: "/api/fusarium/v1/readiness", purpose: "Independent runtime, store, source, and authorization readiness.", safety: "passive-read", sourceState: "runtime-unbound" },
  { id: "operator-state", domain: "fusarium", method: "GET", path: "/api/fusarium/operator/state", purpose: "Commercial UNCLASSIFIED compatibility state.", safety: "passive-read", sourceState: "source-present" },
  { id: "device-observations", domain: "fusarium", method: "GET", path: "/api/fusarium/device-observations", purpose: "Typed passive device-observation envelope by scope and modality.", safety: "passive-read", sourceState: "source-present" },
  { id: "crep-health", domain: "environment", method: "GET", path: "/api/crep/health", purpose: "CREP dependency health without implying data presence.", safety: "passive-read", sourceState: "source-present" },
  { id: "crep-weather", domain: "environment", method: "GET", path: "/api/crep/environment/weather", purpose: "Bounded weather observations with upstream and timestamp metadata.", safety: "passive-read", sourceState: "source-present" },
  { id: "crep-air", domain: "environment", method: "GET", path: "/api/crep/environment/air-quality", purpose: "Air-quality observations and source state.", safety: "passive-read", sourceState: "source-present" },
  { id: "crep-fire", domain: "environment", method: "GET", path: "/api/crep/environment/wildfires", purpose: "Wildfire evidence with provider boundary.", safety: "passive-read", sourceState: "source-present" },
  { id: "crep-field", domain: "environment", method: "GET", path: "/api/crep/field/{dataset}/{variable}", purpose: "Arraylake field catalog, manifest, grid, or frame assets.", safety: "passive-read", sourceState: "source-present" },
  { id: "viewport-environment", domain: "environment", method: "GET", path: "/api/crep/viewport-environment", purpose: "Bounded viewport weather and environmental context.", safety: "passive-read", sourceState: "source-present" },
  { id: "earth-layers", domain: "earth", method: "GET", path: "/api/earth-simulator/layers", purpose: "Earth Simulator layer declarations.", safety: "passive-read", sourceState: "source-present" },
  { id: "earth-devices", domain: "earth", method: "GET", path: "/api/earth-simulator/devices", purpose: "Map device observations, distinct from registry readiness.", safety: "passive-read", sourceState: "source-present" },
  { id: "earth-inat", domain: "earth", method: "GET", path: "/api/earth-simulator/inaturalist", purpose: "Occurrence records for bounded geographic queries.", safety: "passive-read", sourceState: "source-present" },
  { id: "earth2-wind", domain: "earth", method: "GET", path: "/api/earth2/layers/wind", purpose: "Vector wind field response with availability state.", safety: "passive-read", sourceState: "source-present" },
  { id: "earth2-spores", domain: "earth", method: "GET", path: "/api/earth2/spore-dispersal", purpose: "Completed modeled-zone read seam; currently lacks a qualified upstream payload.", safety: "passive-read", sourceState: "runtime-unbound" },
  { id: "ancestry", domain: "biology", method: "GET", path: "/api/ancestry", purpose: "Life Database record search and pagination.", safety: "passive-read", sourceState: "source-present" },
  { id: "ancestry-quality", domain: "biology", method: "GET", path: "/api/ancestry/data-quality", purpose: "Taxonomy and record-quality evidence.", safety: "passive-read", sourceState: "source-present" },
  { id: "compounds", domain: "biology", method: "GET", path: "/api/compounds", purpose: "Compound directory and source evidence.", safety: "passive-read", sourceState: "source-present" },
  { id: "compound-sim", domain: "biology", method: "POST", path: "/api/compounds/simulate", purpose: "Local compound simulation request.", safety: "local-analysis", sourceState: "source-present" },
  { id: "device-list", domain: "devices", method: "GET", path: "/api/devices", purpose: "Device registry compatibility read.", safety: "passive-read", sourceState: "source-present" },
  { id: "sporebase", domain: "devices", method: "GET", path: "/api/devices/sporebase", purpose: "SporeBase registry and readiness response.", safety: "passive-read", sourceState: "source-present" },
  { id: "sporebase-telemetry", domain: "devices", method: "GET", path: "/api/devices/sporebase/telemetry", purpose: "Device-bound environmental telemetry, not lab species identity.", safety: "passive-read", sourceState: "source-present" },
  { id: "device-register", domain: "devices", method: "POST", path: "/api/devices/register", purpose: "Register a device through an approved identity and service boundary.", safety: "gated-write", sourceState: "approval-gated" },
  { id: "device-command", domain: "devices", method: "POST", path: "/api/devices/{deviceId}/command", purpose: "Device command boundary.", safety: "device-action", sourceState: "approval-gated" },
  { id: "firmware-audit", domain: "devices", method: "GET", path: "/api/devices/firmware-audit", purpose: "Read-only firmware inventory evidence.", safety: "passive-read", sourceState: "approval-gated" },
  { id: "compute", domain: "platform", method: "GET", path: "/api/compute/snapshot", purpose: "Local compute snapshot with independent source state.", safety: "passive-read", sourceState: "source-present" },
  { id: "containers", domain: "platform", method: "GET", path: "/api/docker/containers", purpose: "Container inventory seam.", safety: "passive-read", sourceState: "approval-gated" },
  { id: "avani-status", domain: "platform", method: "GET", path: "/api/avani/status", purpose: "AVANI policy-engine status.", safety: "passive-read", sourceState: "source-present" },
  { id: "avani-evaluate", domain: "platform", method: "POST", path: "/api/avani/evaluate", purpose: "Local policy evaluation; never external execution.", safety: "local-analysis", sourceState: "source-present" },
] as const

export const API_DOMAINS = ["all", "fusarium", "environment", "earth", "biology", "devices", "platform"] as const
export type ApiDomain = (typeof API_DOMAINS)[number]

export function filterApiCatalog(domain: ApiDomain, query: string, safety: ApiSafety | "all"): ApiCatalogEntry[] {
  const needle = query.trim().toLowerCase()
  return FUSARIUM_API_CATALOG.filter((entry) => {
    if (domain !== "all" && entry.domain !== domain) return false
    if (safety !== "all" && entry.safety !== safety) return false
    if (!needle) return true
    return `${entry.method} ${entry.path} ${entry.purpose} ${entry.domain}`.toLowerCase().includes(needle)
  })
}
