export type DevelopmentSurface = "functions" | "sdk" | "shell"

export interface DevelopmentRecord {
  id: string
  surface: DevelopmentSurface
  category: string
  name: string
  location: string
  state: "source-present" | "unbound" | "locked"
  description: string
  boundary: string
}

/** Source inventory only. No record proves a running service or authorization. */
export const DEVELOPMENT_CATALOG: readonly DevelopmentRecord[] = [
  { id: "next-route-handlers", surface: "functions", category: "request handlers", name: "Next same-origin route handlers", location: "apps/twins-host/app/api/**/route.ts", state: "source-present", description: "Server-side HTTP adapters for local UI contracts and bounded upstream normalization.", boundary: "Each handler owns its own identity, rate, provenance, and mutation rules." },
  { id: "runtime-api", surface: "functions", category: "runtime", name: "Fusarium Intelligence v1", location: "services/runtime/fusarium_runtime/intelligence", state: "unbound", description: "Typed environmental-intelligence services and local SQLite/WAL persistence.", boundary: "The observed shared runtime is not proven source-equivalent and v1 remains unbound." },
  { id: "field-bake", surface: "functions", category: "environment", name: "Arraylake field bake", location: "Website GitHub Actions / local baked assets", state: "unbound", description: "Produces field manifests and frame assets for Earth Simulator and Aerosol.", boundary: "Publication and provider access require their own approved workflow and credential boundary." },
  { id: "petri-worker", surface: "functions", category: "simulation", name: "Petri simulation worker", location: "apps/twins-host/lib/petri-dish-v2", state: "source-present", description: "Local deterministic simulation worker and REST compatibility seam.", boundary: "Simulation output is never operational observation evidence." },
  { id: "gandha-local", surface: "functions", category: "analysis", name: "GANDHA local model", location: "apps/twins-host/lib/fusarium/gandha", state: "source-present", description: "Offline dataset validation, feature extraction, and deterministic local exploratory model.", boundary: "No licensed Bosch deployment or live device inference is claimed." },
  { id: "web-client", surface: "sdk", category: "TypeScript", name: "Fusarium same-origin client contracts", location: "apps/twins-host/lib/fusarium", state: "source-present", description: "Typed contracts, providers, deep links, and source-state normalization used by Fusarium applications.", boundary: "The library is internal source, not a published or versioned external SDK." },
  { id: "runtime-models", surface: "sdk", category: "Python", name: "Fusarium runtime models", location: "services/runtime/fusarium_runtime/intelligence", state: "source-present", description: "Pydantic request, response, persistence, identity, and error contracts.", boundary: "Importable source does not prove the shared runtime has loaded it." },
  { id: "device-observation", surface: "sdk", category: "device evidence", name: "Device observation contract", location: "apps/twins-host/lib/fusarium/device-observations", state: "source-present", description: "Modality-neutral, provenance-bearing passive observation envelope.", boundary: "The registry is unbound until a qualified adapter is explicitly selected." },
  { id: "gcs-contract", surface: "sdk", category: "vehicles", name: "GCS vehicle-profile contracts", location: "apps/twins-host/lib/fusarium/gcs", state: "source-present", description: "Psathyrella, Agaric, and Mushroom 1 display and adapter boundaries.", boundary: "UI profiles never grant command authority or prove physical execution." },
  { id: "external-sdk", surface: "sdk", category: "distribution", name: "Published Fusarium SDK", location: "not published", state: "unbound", description: "Future versioned package for approved integrations.", boundary: "No public compatibility, support, authentication, or release contract exists yet." },
  { id: "shell-session", surface: "shell", category: "session", name: "Authenticated shell session", location: "not bound", state: "locked", description: "A future terminal session broker with server-verified identity and scoped workspace.", boundary: "Browser identity, URL state, and client roles cannot open a shell." },
  { id: "shell-audit", surface: "shell", category: "audit", name: "Command audit and retention", location: "not bound", state: "locked", description: "Future immutable command, output, actor, approval, and outcome evidence.", boundary: "No shell is exposed without durable audit and recovery policy." },
  { id: "shell-policy", surface: "shell", category: "policy", name: "Command and target policy", location: "not bound", state: "locked", description: "Future allowlists, target constraints, timeouts, output limits, and destructive-command interlocks.", boundary: "Arbitrary execution and protected-system contact are not available." },
]

export function developmentRecords(surface: DevelopmentSurface, query: string): DevelopmentRecord[] {
  const needle = query.trim().toLowerCase()
  return DEVELOPMENT_CATALOG.filter((record) => record.surface === surface && (!needle || `${record.name} ${record.category} ${record.location} ${record.description}`.toLowerCase().includes(needle)))
}
