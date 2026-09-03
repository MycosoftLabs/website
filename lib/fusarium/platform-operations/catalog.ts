export type PlatformOperationId =
  | "devices"
  | "mycobrain"
  | "sporebase"
  | "crep"
  | "mindex"
  | "storage"
  | "containers"
  | "monitoring"
  | "partner-mesh"
  | "adapters"
  | "settings"

export interface PlatformReadContract {
  label: string
  endpoint: string
  purpose: string
}

export interface PlatformOperationDefinition {
  id: PlatformOperationId
  title: string
  eyebrow: string
  summary: string
  boundary: string
  accent: "emerald" | "cyan" | "amber" | "violet"
  contracts: readonly PlatformReadContract[]
  links: readonly { label: string; href: string }[]
}

export interface FusariumInfrastructureStage {
  id: "field" | "evidence" | "reasoning" | "model" | "picture" | "platform"
  label: string
  shortLabel: string
  description: string
  href: string
}

/**
 * Operator-facing topology only. This describes responsibility and permitted
 * flow; it never asserts that a connector is currently reachable or authorized.
 */
export const FUSARIUM_INFRASTRUCTURE_FLOW: readonly FusariumInfrastructureStage[] = [
  { id: "field", label: "DirtNet Field Fabric", shortLabel: "DirtNet", description: "MycoBrain edge nodes, SporeBase collectors, sensors, and registered field systems produce bounded observations.", href: "/fusarium/devices" },
  { id: "evidence", label: "MINDEX Evidence Fabric", shortLabel: "MINDEX", description: "Provenance-bearing device, environmental, and mission evidence is indexed without making source availability claims.", href: "/fusarium/mindex" },
  { id: "reasoning", label: "MYCA / MAS Coordination", shortLabel: "MYCA + MAS", description: "Advisory multi-agent workflows correlate authorized evidence; they do not dispatch devices or publish results.", href: "/fusarium/ai-studio" },
  { id: "model", label: "Nature Learning Model", shortLabel: "NLM", description: "Named model and inference surfaces consume approved evidence while measured, forecast, and simulated states remain distinct.", href: "/fusarium/nlm-training" },
  { id: "picture", label: "Earth / CREP Mission Picture", shortLabel: "Earth + CREP", description: "Geospatial and environmental views present source readiness, uncertainty, time, and coverage without implying completeness.", href: "/fusarium/crep" },
  { id: "platform", label: "Protected Platform Fabric", shortLabel: "Platform", description: "Persistence, compute runtime, adapters, and mission assurance support the pipeline behind separately enforced access boundaries.", href: "/fusarium/storage" },
]

export const PLATFORM_OPERATIONS: Record<PlatformOperationId, PlatformOperationDefinition> = {
  devices: {
    id: "devices", title: "DirtNet Operations", eyebrow: "Fusarium Infrastructure · Field fabric", accent: "emerald",
    summary: "The Fusarium field integration boundary for registry-backed devices, edge presence, and geospatial evidence.",
    boundary: "Inventory declarations are not live telemetry. This page cannot discover, register, command, or modify a device.",
    contracts: [
      { label: "Device registry", endpoint: "/api/mindex/registry/devices?limit=200", purpose: "MINDEX registry records" },
      { label: "Network inventory", endpoint: "/api/devices/network", purpose: "Network-backed device declarations" },
      { label: "Earth inventory", endpoint: "/api/earth-simulator/devices", purpose: "Geospatial device evidence" },
      { label: "MQTT presence", endpoint: "/api/devices/mqtt/presence", purpose: "Broker-reported presence when configured" },
    ],
    links: [{ label: "Senses Overview", href: "/fusarium/sensing" }, { label: "Global Control System", href: "/fusarium/gcs" }],
  },
  mycobrain: {
    id: "mycobrain", title: "DirtNet Edge Nodes", eyebrow: "Fusarium Infrastructure · MycoBrain edge", accent: "violet",
    summary: "Read-only MycoBrain edge-service, node, port, and event visibility inside the DirtNet field fabric.",
    boundary: "Serial, LED, buzzer, machine-mode, diagnostics mutation, and control endpoints are excluded. No hardware contact is initiated here.",
    contracts: [
      { label: "Service health", endpoint: "/api/mycobrain/health", purpose: "Configured MycoBrain bridge health" },
      { label: "Device inventory", endpoint: "/api/mycobrain/devices", purpose: "Bridge-reported devices" },
      { label: "Port inventory", endpoint: "/api/mycobrain/ports", purpose: "Configured serial port evidence" },
      { label: "Recent events", endpoint: "/api/mycobrain/events", purpose: "Read-only event history" },
    ],
    links: [{ label: "Fungi Compute Interface", href: "/fusarium/fci" }, { label: "DirtNet Operations", href: "/fusarium/devices" }],
  },
  sporebase: {
    id: "sporebase", title: "DirtNet Bioaerosol Nodes", eyebrow: "Fusarium Infrastructure · SporeBase collection", accent: "amber",
    summary: "Physical SporeBase collector registry, environmental telemetry availability, and delayed laboratory tape evidence.",
    boundary: "Live VOC, BME6xx, and particulate telemetry cannot identify taxa. Taxon detections appear only after timestamped laboratory analysis.",
    contracts: [
      { label: "SporeBase registry", endpoint: "/api/devices/sporebase", purpose: "Registered physical collectors" },
      { label: "Telemetry readiness", endpoint: "/api/devices/sporebase/telemetry?limit=50", purpose: "Measured environmental samples when a device is bound" },
      { label: "Laboratory samples", endpoint: "/api/devices/sporebase/samples?limit=2000", purpose: "Delayed tape interval results" },
    ],
    links: [{ label: "Aerosol", href: "/fusarium/aerosol" }, { label: "DirtNet Operations", href: "/fusarium/devices" }],
  },
  crep: {
    id: "crep", title: "Earth / CREP Mission Picture", eyebrow: "Fusarium Intelligence · Environmental picture", accent: "cyan",
    summary: "Earth Simulator and Common Relevant Environmental Picture service readiness across the Fusarium evidence pipeline.",
    boundary: "A reachable service does not prove every layer is populated. Source failures and empty responses remain visible.",
    contracts: [
      { label: "CREP health", endpoint: "/api/crep/health", purpose: "Core route readiness" },
      { label: "CREP status", endpoint: "/api/crep/status", purpose: "Current integration state" },
      { label: "Source services", endpoint: "/api/crep/services", purpose: "Provider-level availability" },
      { label: "Unified picture", endpoint: "/api/crep/unified", purpose: "Current unified evidence contract" },
    ],
    links: [{ label: "Earth Simulator", href: "/fusarium/earth-simulator" }, { label: "Situational Awareness", href: "/fusarium/situational-awareness" }],
  },
  mindex: {
    id: "mindex", title: "MINDEX Evidence Fabric", eyebrow: "Fusarium Data · Provenance and retrieval", accent: "emerald",
    summary: "The indexed evidence boundary joining DirtNet observations to authorized MYCA, MAS, NLM, and Earth/CREP consumers.",
    boundary: "This surface performs no query, ingest, synchronization, classification, or background job. Record totals are shown only when returned by MINDEX.",
    contracts: [
      { label: "MINDEX health", endpoint: "/api/mindex/health", purpose: "API readiness" },
      { label: "MINDEX statistics", endpoint: "/api/natureos/mindex/stats", purpose: "Reported evidence totals" },
      { label: "ETL status", endpoint: "/api/natureos/mindex/etl-status", purpose: "Pipeline readiness without execution" },
      { label: "Device registry", endpoint: "/api/mindex/registry/devices?limit=50", purpose: "Recent registry evidence" },
    ],
    links: [{ label: "Life Database", href: "/fusarium/life-database" }, { label: "Data Fusion", href: "/fusarium/data-fusion" }],
  },
  storage: {
    id: "storage", title: "Protected Data Fabric", eyebrow: "Fusarium Platform · Persistence boundaries", accent: "cyan",
    summary: "Read-only visibility into configured persistence seams that support Fusarium evidence without collapsing their authorization boundaries.",
    boundary: "No directory walk, upload, download, delete, backup, restore, mount, or credential use is initiated from this page.",
    contracts: [
      { label: "NAS seam", endpoint: "/api/storage/nas", purpose: "Configured NAS availability" },
      { label: "Google Drive seam", endpoint: "/api/storage/gdrive", purpose: "Configured Drive availability" },
      { label: "File inventory", endpoint: "/api/storage/files", purpose: "Authorized local file contract" },
      { label: "NatureOS artifacts", endpoint: "/api/natureos/storage/artifacts", purpose: "Artifact registry readiness" },
    ],
    links: [{ label: "MINDEX", href: "/fusarium/mindex" }, { label: "Stack Inventory", href: "/fusarium/stack-inventory" }],
  },
  containers: {
    id: "containers", title: "Compute Fabric", eyebrow: "Fusarium Platform · Runtime inventory", accent: "violet",
    summary: "Read-only runtime inventory for the services supporting DirtNet, MINDEX, MYCA/MAS, NLM, and environmental views.",
    boundary: "Start, stop, restart, build, exec, log mutation, image pull, and configuration actions are absent and remain separately gated.",
    contracts: [
      { label: "Docker inventory", endpoint: "/api/docker/containers", purpose: "Local container declarations" },
      { label: "MINDEX containers", endpoint: "/api/natureos/mindex/containers", purpose: "MINDEX-reported container state" },
      { label: "Platform services", endpoint: "/api/services/status", purpose: "Same-origin service inventory" },
    ],
    links: [{ label: "Mission Assurance", href: "/fusarium/monitoring" }, { label: "Stack Inventory", href: "/fusarium/stack-inventory" }],
  },
  monitoring: {
    id: "monitoring", title: "Mission Assurance", eyebrow: "Fusarium Platform · Runtime and source health", accent: "emerald",
    summary: "Separated health, provider, streaming, and service availability signals for the complete Fusarium pipeline.",
    boundary: "This is current reachability evidence, not an uptime guarantee. It creates no alert, acknowledgement, restart, or remediation action.",
    contracts: [
      { label: "Application health", endpoint: "/api/health", purpose: "Twins-host health" },
      { label: "Provider health", endpoint: "/api/health/providers", purpose: "Configured provider readiness" },
      { label: "Service status", endpoint: "/api/services/status", purpose: "Local service registry" },
      { label: "SSE health", endpoint: "/api/sse/health", purpose: "Streaming transport readiness" },
      { label: "MAS health", endpoint: "/api/mas/health", purpose: "Multi-agent service reachability" },
    ],
    links: [{ label: "Compute Fabric", href: "/fusarium/containers" }, { label: "API Gateway", href: "/fusarium/api" }],
  },
  "partner-mesh": {
    id: "partner-mesh", title: "Partner Mesh", eyebrow: "Platform · Partner boundary", accent: "amber",
    summary: "Read-only launchpad partner-mesh membership and readiness evidence.",
    boundary: "No invite, message, connector, federation, or external partner call is made. Membership is never inferred from catalog entries.",
    contracts: [
      { label: "Partner mesh", endpoint: "/api/fusarium/launchpad/partner-mesh", purpose: "Current authorized mesh records" },
      { label: "Operator state", endpoint: "/api/fusarium/operator/state", purpose: "Declared local partner and adapter state" },
    ],
    links: [{ label: "Adapters", href: "/fusarium/adapters" }, { label: "Settings", href: "/fusarium/settings" }],
  },
  adapters: {
    id: "adapters", title: "Adapters", eyebrow: "Platform · Integration boundary", accent: "cyan",
    summary: "Configured adapter declarations and provider readiness without connector execution.",
    boundary: "Configured does not mean connected. This surface does not contact Palantir, Lattice, Platform One, partner systems, or protected providers.",
    contracts: [
      { label: "Operator adapters", endpoint: "/api/fusarium/operator/state", purpose: "Runtime adapter declarations" },
      { label: "Provider health", endpoint: "/api/health/providers", purpose: "Same-origin provider readiness" },
      { label: "CREP services", endpoint: "/api/crep/services", purpose: "Environmental adapter readiness" },
    ],
    links: [{ label: "API Gateway", href: "/fusarium/api" }, { label: "Partner Mesh", href: "/fusarium/partner-mesh" }],
  },
  settings: {
    id: "settings", title: "Settings", eyebrow: "Platform · Policy and preferences", accent: "violet",
    summary: "Read-only view of effective NatureOS settings and Fusarium launchpad policy boundaries.",
    boundary: "No preference, identity, classification, data-boundary, export, or security setting can be changed here.",
    contracts: [
      { label: "NatureOS settings", endpoint: "/api/natureos/settings", purpose: "Effective authorized preferences" },
      { label: "Security policy", endpoint: "/api/fusarium/launchpad/settings/security", purpose: "Launchpad security boundary" },
      { label: "Data boundary", endpoint: "/api/fusarium/launchpad/settings/data-boundary", purpose: "Current handling constraints" },
      { label: "Operator state", endpoint: "/api/fusarium/operator/state", purpose: "Classification and auth mode" },
    ],
    links: [{ label: "Overview", href: "/fusarium" }, { label: "Partner Mesh", href: "/fusarium/partner-mesh" }],
  },
}

export function platformOperation(id: PlatformOperationId) {
  return PLATFORM_OPERATIONS[id]
}
