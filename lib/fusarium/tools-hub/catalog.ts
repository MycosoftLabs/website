export type ToolAvailability = "available" | "unbound" | "planned" | "legacy-only"

export interface FusariumToolRecord {
  id: string
  name: string
  category: "operations" | "environment" | "intelligence" | "defense" | "cyber-defense" | "simulation" | "analysis" | "sensing" | "data" | "evidence"
  description: string
  href: string
  availability: ToolAvailability
  boundary: string
}

/**
 * Fusarium-local science-tool directory. Availability describes the mounted
 * user surface only; it never implies that a provider, device, or model is
 * connected. NatureOS-only tools remain visibly separated until they receive
 * a Fusarium mount rather than silently sending an operator to the civilian UI.
 */
export const FUSARIUM_TOOL_CATALOG: readonly FusariumToolRecord[] = [
  { id: "situational-awareness", name: "Situational Awareness", category: "operations", description: "Evidence-led environmental common operating picture.", href: "/fusarium/situational-awareness", availability: "available", boundary: "Unknown coverage never becomes an all-clear." },
  { id: "threat-assessment", name: "Threat Assessment", category: "intelligence", description: "Review environmental indicators, confidence, provenance, and consequences.", href: "/fusarium/threat-assessment", availability: "available", boundary: "Assessment is read-only and does not select targets or effects." },
  { id: "data-fusion", name: "Data Fusion", category: "intelligence", description: "Correlate typed environmental evidence across source and time boundaries.", href: "/fusarium/data-fusion", availability: "available", boundary: "Correlation does not convert uncertainty into fact." },
  { id: "command-control", name: "Command & Control", category: "operations", description: "Human review, proposal, and mission-context surface.", href: "/fusarium/command-control", availability: "unbound", boundary: "No autonomous tasking, dispatch, or device command." },
  { id: "oei", name: "OEI Narrative", category: "intelligence", description: "Evidence-linked environmental intelligence composition and review.", href: "/fusarium/oei", availability: "available", boundary: "Preview is not release or external publication." },
  { id: "stack", name: "Stack Inventory", category: "cyber-defense", description: "Read-only dependency, runtime, connector, and readiness inventory.", href: "/fusarium/stack", availability: "available", boundary: "Discovery never performs remediation or network exploitation." },
  { id: "gcs", name: "Global Control System", category: "operations", description: "Device-profile telemetry and separately gated control console.", href: "/fusarium/gcs", availability: "unbound", boundary: "Vehicle adapters and commands remain locked until independently authorized." },
  { id: "source-provenance", name: "Source Provenance Inspector", category: "evidence", description: "Inspect provider, timestamps, stable identifiers, freshness, and checksums in bounded local JSON.", href: "/fusarium/tools/source-provenance", availability: "available", boundary: "Local inspection only; it validates claims and never invents missing provenance." },
  { id: "chain-of-custody", name: "Chain of Custody Ledger Inspector", category: "evidence", description: "Verify supplied custody order, revisions, provenance, authoritative times, and canonical hash links locally.", href: "/fusarium/tools/chain-of-custody", availability: "available", boundary: "Structural verification never asserts that a custody event actually occurred." },
  { id: "evidence-timeline", name: "Evidence Timeline Builder", category: "evidence", description: "Deterministically order supplied evidence while retaining record time, observation time, provenance, and canonical hashes.", href: "/fusarium/tools/evidence-timeline", availability: "available", boundary: "Missing events are never inferred or inserted." },
  { id: "field-packet", name: "Field Packet Builder", category: "evidence", description: "Assemble bounded UNCLASSIFIED field records into a deterministic, locally exportable evidence manifest.", href: "/fusarium/tools/field-packet", availability: "available", boundary: "Local export is not persistence, transmission, release, or proof of authenticity." },
  { id: "evidence-diff", name: "Evidence Diff", category: "evidence", description: "Compare two supplied evidence revisions by stable record identity and canonical content.", href: "/fusarium/tools/evidence-diff", availability: "available", boundary: "A content difference does not establish cause, intent, or attribution." },
  { id: "field-coverage", name: "Environmental Coverage Planner", category: "environment", description: "Compare supplied environmental observations and explicitly required domain gaps for monitoring plans.", href: "/fusarium/tools/field-coverage", availability: "available", boundary: "No targeting, effect planning, or inferred access score. Valid structure does not prove authenticity." },
  { id: "field-diff", name: "Field Change Detector", category: "environment", description: "Compare observed, forecast, and replay fields while preserving model and valid-time boundaries.", href: "/fusarium/tools/field-diff", availability: "available", boundary: "A forecast difference is not an observed change." },
  { id: "sensor-health", name: "Sensor Health Triage", category: "defense", description: "Review device freshness, calibration, clock drift, power, and source authorization signals.", href: "/fusarium/tools/sensor-health", availability: "available", boundary: "Triage is advisory and never changes device configuration." },
  { id: "evidence-integrity", name: "Evidence Integrity Check", category: "cyber-defense", description: "Canonicalize bounded JSON, compute SHA-256 locally, and compare an optional declared digest.", href: "/fusarium/tools/evidence-integrity", availability: "available", boundary: "Defensive local verification only; no upload, bypass, write, or tampering capability." },
  { id: "network-posture", name: "Network Posture Review", category: "cyber-defense", description: "Read-only review of approved asset inventory, service exposure, certificate state, and configuration evidence.", href: "/fusarium/tools/network-posture", availability: "available", boundary: "No scanning beyond approved inventory, exploitation, credential use, or automatic changes." },
  { id: "incident-timeline", name: "Incident Timeline", category: "defense", description: "Assemble append-only environmental, device, operator, and system events for human review.", href: "/fusarium/tools/incident-timeline", availability: "available", boundary: "Timeline correlation does not assign intent or attribution." },
  { id: "classification-review", name: "Classification / Releaseability Checker", category: "defense", description: "Check handling labels, source restrictions, and release blockers for UNCLASSIFIED work products.", href: "/fusarium/tools/classification-release-checker", availability: "available", boundary: "Metadata validation is not classification guidance or authority to release." },
  { id: "indicator-watch", name: "Indicator Watchlist", category: "intelligence", description: "Evaluate bounded local rules over imported numeric environmental evidence.", href: "/fusarium/tools/indicator-watchlist", availability: "available", boundary: "No person surveillance, persistence, external alerts, automated response, or device action." },
  { id: "environmental-object-tracker", name: "Environmental Object Tracker", category: "intelligence", description: "Track explicitly selected non-human environmental subjects such as wildlife, fungi, spores, vegetation, vessels, aircraft, or vehicles across imported observations.", href: "/fusarium/tools/environmental-object-tracker", availability: "available", boundary: "Human identification is disabled; track identity, confidence, loss/reacquisition, provenance, and operator review are required. No weapons cueing or autonomous pursuit." },
  { id: "multisensor-track-fusion", name: "Multi-Sensor Track Fusion", category: "defense", description: "Correlate imported camera, radar, LiDAR, AIS, ADS-B, and environmental observations into reviewable tracks without collapsing source uncertainty.", href: "/fusarium/tools/multisensor-track-fusion", availability: "available", boundary: "Correlation is evidence, not identity, intent, authorization, target selection, or an executed command." },
  { id: "source-health", name: "Source Health Matrix", category: "cyber-defense", description: "Probe a fixed same-origin read allowlist and separate response, authorization, freshness, and data state.", href: "/fusarium/tools/source-health", availability: "available", boundary: "No arbitrary URL executor; a configured URL is never reported as a live integration." },
  { id: "virtual-petri-dish", name: "Virtual Petri Dish", category: "simulation", description: "Interactive mycelium and culture simulation with local evidence export.", href: "/fusarium/virtual-petri-dish", availability: "available", boundary: "Simulation results are not observations." },
  { id: "biology-simulator", name: "Biology Simulator", category: "simulation", description: "Cross-scale biological simulation workspace.", href: "/fusarium/biology-simulator", availability: "available", boundary: "Provider-backed models remain separately qualified." },
  { id: "earth-simulator", name: "Earth Simulator", category: "simulation", description: "Shared environmental globe, field layers, and time context.", href: "/fusarium/earth-simulator", availability: "available", boundary: "Observed, forecast, replay, and simulated fields remain distinct." },
  { id: "compound-analyser", name: "Compound Analyser", category: "analysis", description: "Compound inspection and chemistry analysis workspace.", href: "/fusarium/compound-analyser", availability: "available", boundary: "No clinical, safety, or efficacy conclusion is inferred." },
  { id: "life-database", name: "Life Database", category: "data", description: "Species, taxonomy, phylogeny, and provenance-aware biological records.", href: "/fusarium/life-database", availability: "available", boundary: "Missing records are unknown, not absence." },
  { id: "growth-analytics", name: "Growth Analytics", category: "analysis", description: "Growth-series inspection and comparison.", href: "/fusarium/growth-analytics", availability: "available", boundary: "Imported evidence retains source and time boundaries." },
  { id: "aerosol", name: "Aerosol", category: "analysis", description: "Atmospheric and bioaerosol evidence over the shared Earth field plane.", href: "/fusarium/aerosol", availability: "available", boundary: "Device, occurrence, lab, and modeled evidence stay separate." },
  { id: "fci", name: "FCI", category: "sensing", description: "Fungal-computer interface inventory and bioelectric evidence surface.", href: "/fusarium/fci", availability: "unbound", boundary: "Inventory membership is not a live signal stream." },
  { id: "sine", name: "SINE", category: "sensing", description: "Acoustic evidence playback, inspection, and analysis.", href: "/fusarium/sine", availability: "unbound", boundary: "Saved audio is not assigned to a device without provenance." },
  { id: "bluesight", name: "BlueSight", category: "sensing", description: "Camera, radar, LiDAR, and Wi-Fi-sense comparison by selected scope.", href: "/fusarium/bluesight", availability: "unbound", boundary: "Capabilities are not telemetry." },
  { id: "gandha", name: "GANDHA", category: "sensing", description: "Bosch-compatible gas and odor dataset inspection and local model workflow.", href: "/fusarium/gandha", availability: "unbound", boundary: "Device inference and licensed deployment remain unbound." },
  { id: "thermal", name: "Thermal Field Laboratory", category: "sensing", description: "Radiometric sequence validation, comparison, and evidence export.", href: "/fusarium/thermal", availability: "unbound", boundary: "File evidence does not imply connected thermal hardware." },
  { id: "mechanical", name: "Tactus — Mechanical", category: "sensing", description: "Mechanical, contact, force, and proprioception evidence workbench.", href: "/fusarium/mechanical", availability: "unbound", boundary: "Hardware motion and actuation remain locked." },
  { id: "retrosynthesis", name: "Retrosynthesis Evidence Map", category: "analysis", description: "Review supplied non-operational chemistry relationships, provenance, and coverage locally.", href: "/fusarium/tools/retrosynthesis", availability: "available", boundary: "Evidence coverage is not chemical validation; no procedure, provider call, persistence, export, or execution is available." },
  { id: "digital-twin", name: "Digital Twin", category: "simulation", description: "Fusarium-local, passive selected-device evidence adapter with strict identity and freshness checks.", href: "/fusarium/tools/digital-twin", availability: "unbound", boundary: "A validated device response supplies measurements only; it does not prove a synchronized biological twin." },
  { id: "physics-sim", name: "Physics Simulator", category: "simulation", description: "Client-side stochastic molecular and field demonstration mounted from the immutable NatureOS payload.", href: "/fusarium/tools/physics-sim", availability: "available", boundary: "All generated values are SIMULATED; no quantum solver, force field, environmental provider, or calibrated forecast runs." },
] as const

export const TOOL_CATEGORIES = ["all", "operations", "environment", "intelligence", "defense", "cyber-defense", "evidence", "simulation", "analysis", "sensing", "data"] as const
export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

export function visibleTools(category: ToolCategory, query: string): FusariumToolRecord[] {
  const needle = query.trim().toLowerCase()
  return FUSARIUM_TOOL_CATALOG.filter((tool) => {
    if (category !== "all" && tool.category !== category) return false
    if (!needle) return true
    return `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(needle)
  })
}
