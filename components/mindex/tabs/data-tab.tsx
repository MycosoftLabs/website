"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Atom,
  Bot,
  BookOpen,
  Braces,
  Brain,
  Database,
  Dna,
  FileText,
  Globe,
  HardDrive,
  ImageIcon,
  Link2,
  Mic2,
  Radio,
  Search,
  Shield,
  Sparkles,
  Table2,
  Waves,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MYCAChatWidget } from "@/components/myca/MYCAChatWidget"
import { useMYCA } from "@/contexts/myca-context"

import type {
  ETLStatus,
  MindexConsole,
  MindexFieldDeviceSummary,
  MindexHealthAll,
  MINDEXStats,
  Observation,
  Taxon,
} from "./mindex-dashboard-types"
import type { LucideIcon } from "lucide-react"

type TableStatus = "live" | "partial" | "empty" | "pending"

type ColumnDef = {
  key: string
  label: string
  type: string
  meaning: string
}

type MindexTable = {
  id: string
  schema: string
  table: string
  label: string
  count: number | null
  status: TableStatus
  icon: LucideIcon
  description: string
  provenance: string
  rowMeaning: string
  relationships: string[]
  columns: ColumnDef[]
  rows: Array<Record<string, unknown>>
}

type MindexSearchBucket =
  | "taxa"
  | "observations"
  | "compounds"
  | "devices"
  | "earth"
  | "jobs"
  | "library"
  | "sources"

type MindexSearchHit = Record<string, unknown> & {
  id?: string | number
  bucket?: MindexSearchBucket
  title?: string
  subtitle?: string
  summary?: string
  source?: string
  canonical_name?: string
  common_name?: string
  taxon_name?: string
  name?: string
}

type MindexSearchResponse = {
  results?: Partial<Record<MindexSearchBucket, MindexSearchHit[]>>
  total?: number
  query?: string
  data_source?: string
  error?: string
  timestamp?: string
}

const EMPTY_COUNTS: Record<string, number> = {}
const EMPTY_EARTH_DOMAINS: Record<string, number> = {}
const EMPTY_ETL_JOBS: ETLStatus["jobs"] = []

const SEARCH_BUCKETS: MindexSearchBucket[] = ["taxa", "observations", "compounds", "devices", "earth", "jobs", "library", "sources"]

const SEARCH_BUCKET_LABELS: Record<MindexSearchBucket, string> = {
  taxa: "Species",
  observations: "Observations",
  compounds: "Chemistry",
  devices: "Devices",
  earth: "Mapped data",
  jobs: "Data refresh",
  library: "Library",
  sources: "Sources",
}

const SEARCH_BUCKET_TABLES: Partial<Record<MindexSearchBucket, string>> = {
  taxa: "core.taxon",
  observations: "core.observation",
  compounds: "chem.taxon_compound",
  devices: "device.registry",
  earth: "earth.domain_counts",
  jobs: "etl.job",
  sources: "core.taxon_external_id",
}

const BASE_COLUMNS: ColumnDef[] = [
  { key: "id", label: "ID", type: "uuid/text", meaning: "Stable identifier for opening or joining this row." },
  { key: "source", label: "Source", type: "text", meaning: "Original system or feed that produced this row." },
]

function countFrom(value: unknown): number | null {
  const count = Number(value)
  return Number.isFinite(count) ? count : null
}

function statusFrom(count: number | null, rows: Array<Record<string, unknown>>): TableStatus {
  if (rows.length > 0) return "live"
  if (count == null) return "pending"
  return count > 0 ? "partial" : "empty"
}

function formatCount(value: number | null | undefined): string {
  return value == null ? "--" : value.toLocaleString()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function textValue(value: unknown): string {
  if (value == null || value === "") return "--"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return `${value.length.toLocaleString()} items`
  return JSON.stringify(value)
}

function humanRelationshipLabel(value: string): string {
  const labels: Record<string, string> = {
    "core.taxon": "Species",
    "core.observation": "Observations",
    "core.observation_media": "Media",
    "core.taxon_external_id": "Public identifiers",
    "earth.domains": "Earth context",
    "device.telemetry": "Device signals",
    "bio.genome": "Genomes",
    "bio.genetic_sequence": "Genetic sequences",
    "bio.trait": "Traits",
    "chem.taxon_compound": "Chemistry",
    "chem.compound": "Compounds",
    "chem.reaction": "Reactions",
    "bio.publication": "Publications",
    "storage.nas_object": "Storage",
    "storage.node": "Device storage",
    "mwave.signal": "M-Wave signals",
    "mwave.correlation": "M-Wave correlations",
    "integrity.record": "Integrity records",
    "all MINDEX tables": "MINDEX data",
    "source systems": "Source systems",
    "data quality flags": "Data health",
  }
  return labels[value] ?? value.replace(/^[a-z]+\./, "").replace(/_/g, " ")
}

function recordSearchText(record: Record<string, unknown>): string {
  return Object.values(record)
    .map((value) => (typeof value === "object" ? JSON.stringify(value) : String(value ?? "")))
    .join(" ")
    .toLowerCase()
}

function statusClass(status: TableStatus): string {
  if (status === "live") return "border-green-500/40 text-green-200"
  if (status === "partial") return "border-cyan-500/40 text-cyan-200"
  if (status === "empty") return "border-amber-500/40 text-amber-200"
  return "border-purple-500/40 text-purple-200"
}

function observationRows(observations: Observation[]) {
  return observations.slice(0, 100).map((row) => {
    const raw = row as Observation & Record<string, unknown>
    const metadata = asRecord(row.metadata)
    const location = asRecord(row.location)
    const coords = Array.isArray(location.coordinates) ? location.coordinates : []
    return {
      id: row.id,
      source: row.source,
      source_id: raw.source_id ?? metadata.uri ?? "--",
      taxon_id: row.taxon_id ?? null,
      observer: raw.observer ?? "--",
      observed_at: row.observed_at,
      place: metadata.place_guess ?? "--",
      media_count: Array.isArray(row.media) ? row.media.length : 0,
      longitude: typeof coords[0] === "number" ? coords[0] : null,
      latitude: typeof coords[1] === "number" ? coords[1] : null,
      quality_grade: metadata.quality_grade ?? "--",
    }
  })
}

function taxonRows(taxa: Taxon[]) {
  return taxa.slice(0, 100).map((row) => ({
    id: row.id,
    canonical_name: row.canonical_name,
    rank: row.rank,
    kingdom: row.kingdom ?? "kingdom pending",
    source: row.source,
    obs_count: row.obs_count ?? 0,
    image_count: row.image_count ?? 0,
    genome_count: row.genome_count ?? 0,
    compound_link_count: row.compound_link_count ?? 0,
    updated_at: row.updated_at,
  }))
}

function sourceCountRows(values: Record<string, number> | undefined, sourceLabel: string) {
  return Object.entries(values ?? {}).map(([source, count], index) => ({
    id: `${sourceLabel}-${source}-${index}`,
    source,
    source_table: sourceLabel,
    row_count: count,
  }))
}

function metricRows(values: Record<string, unknown>) {
  return Object.entries(values).map(([metric, value], index) => ({
    id: `metric-${metric}-${index}`,
    metric,
    value,
  }))
}

function makeTable({
  id,
  schema,
  table,
  label,
  count,
  rows,
  status,
  icon,
  description,
  provenance,
  rowMeaning,
  relationships,
  columns,
}: Omit<MindexTable, "status"> & { status?: TableStatus }): MindexTable {
  return {
    id,
    schema,
    table,
    label,
    count,
    rows,
    status: status ?? statusFrom(count, rows),
    icon,
    description,
    provenance,
    rowMeaning,
    relationships,
    columns,
  }
}

function selectedRowTitle(row: Record<string, unknown> | null): string {
  if (!row) return "No row selected"
  for (const key of ["canonical_name", "name", "job", "metric", "domain", "id"]) {
    const value = row[key]
    if (value != null && value !== "") return textValue(value)
  }
  return "Selected row"
}

function rowSignals(row: Record<string, unknown> | null): string[] {
  if (!row) return ["Select a row to generate a focused analysis context."]
  const entries = Object.entries(row)
  const missing = entries
    .filter(([, value]) => value == null || value === "" || String(value).toLowerCase().includes("pending"))
    .map(([key]) => key)
  const populated = entries.filter(([, value]) => value != null && value !== "" && !String(value).toLowerCase().includes("pending"))

  return [
    `${populated.length.toLocaleString()} populated fields are visible in the selected row.`,
    missing.length > 0
      ? `${missing.slice(0, 4).join(", ")} do not have values in the current row payload.`
      : "No obvious pending fields are visible in this selected row.",
    "Use related tables to convert this record from a row into a traceable explanation.",
  ]
}

function compactRecord(record: Record<string, unknown> | null, limit = 18): string {
  if (!record) return "none"
  return Object.entries(record)
    .slice(0, limit)
    .map(([key, value]) => `${key}: ${textValue(value)}`)
    .join("\n")
}

function safeRowPayload(row: Record<string, unknown> | null): Record<string, string> | null {
  if (!row) return null
  return Object.fromEntries(Object.entries(row).slice(0, 24).map(([key, value]) => [key, textValue(value).slice(0, 500)]))
}

function isWeakMycaSummary(value: string): boolean {
  const lower = value.toLowerCase()
  return !value.trim() || lower.includes("unknown.unknown") || lower.includes("unknown total count")
}

function flattenSearchResults(response: MindexSearchResponse | null): MindexSearchHit[] {
  if (!response?.results) return []
  return SEARCH_BUCKETS.flatMap((bucket) =>
    (response.results?.[bucket] ?? []).map((hit) => ({
      ...hit,
      bucket: hit.bucket ?? bucket,
    })),
  )
}

function searchHitTitle(hit: MindexSearchHit): string {
  return textValue(hit.title ?? hit.canonical_name ?? hit.taxon_name ?? hit.name ?? hit.common_name ?? hit.id ?? "MINDEX record")
}

function searchHitSubtitle(hit: MindexSearchHit): string {
  const bucket = hit.bucket ? SEARCH_BUCKET_LABELS[hit.bucket] : "MINDEX"
  const subtitle = textValue(hit.subtitle ?? hit.common_name ?? hit.source ?? "")
  const source = hit.source && subtitle !== String(hit.source) ? ` / ${textValue(hit.source)}` : ""
  return subtitle === "--" ? bucket : `${bucket} / ${subtitle}${source}`
}

function searchHitSummary(hit: MindexSearchHit): string {
  const summary = textValue(hit.summary ?? hit.description ?? hit.place_guess ?? hit.observed_at ?? "")
  return summary === "--" ? "Related MINDEX record." : summary
}

export function DataSection({
  stats,
  console: consolePayload,
  healthAll,
  etlStatus,
  fieldDevices,
  taxa,
  observations,
}: {
  stats: MINDEXStats | null
  console?: MindexConsole | null
  healthAll: MindexHealthAll | null
  etlStatus: ETLStatus | null
  fieldDevices?: MindexFieldDeviceSummary | null
  taxa: Taxon[]
  observations: Observation[]
}) {
  const { consciousness, grounding, memoryEnabled } = useMYCA()
  const [query, setQuery] = useState("")
  const [selectedTableId, setSelectedTableId] = useState("core.observation")
  const [selectedRowIndex, setSelectedRowIndex] = useState(0)
  const [mycaSummary, setMycaSummary] = useState("")
  const [mycaSummaryError, setMycaSummaryError] = useState<string | null>(null)
  const [mycaSummaryLoading, setMycaSummaryLoading] = useState(false)
  const [globalSearch, setGlobalSearch] = useState<MindexSearchResponse | null>(null)
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false)
  const [globalSearchError, setGlobalSearchError] = useState<string | null>(null)
  const summaryAbortRef = useRef<AbortController | null>(null)

  const statsSnapshot = useMemo(
    () => (stats || consolePayload?.stats ? ({ ...(stats ?? {}), ...(consolePayload?.stats ?? {}) } as MINDEXStats) : null),
    [consolePayload?.stats, stats],
  )
  const coreCounts = consolePayload?.etl?.core_counts ?? EMPTY_COUNTS
  const etlJobs = consolePayload?.etl?.jobs ?? etlStatus?.jobs ?? EMPTY_ETL_JOBS
  const earthDomains = consolePayload?.earth?.domains ?? EMPTY_EARTH_DOMAINS
  const nas = consolePayload?.storage?.nas

  const tables = useMemo<MindexTable[]>(() => {
    const observationTableRows = observationRows(observations)
    const taxonTableRows = taxonRows(taxa)
    const fieldDeviceRows =
      fieldDevices?.devices.map((device) => ({
        id: device.id,
        registry_id: device.registry_id ?? "--",
        name: device.name,
        status: device.status ?? "status pending",
        source: device.source ?? "device registry",
        role: device.role ?? "--",
        last_seen: device.lastSeen ?? "--",
        location: device.location_label ?? "--",
      })) ?? []

    return [
      makeTable({
        id: "core.observation",
        schema: "core",
        table: "observation",
        label: "Observations",
        count: countFrom(statsSnapshot?.total_observations),
        icon: Globe,
        description: "Observed events with source IDs, timestamps, locations, media, and species context.",
        provenance: "iNaturalist and other nature records.",
        rowMeaning: "Observation rows describe sightings, evidence, time, place, and source identity for MINDEX biology records.",
        relationships: ["core.taxon", "core.observation_media", "core.taxon_external_id", "earth.domains", "device.telemetry"],
        columns: [
          ...BASE_COLUMNS,
          { key: "source_id", label: "Source ID", type: "text/url", meaning: "Upstream observation identifier." },
          { key: "taxon_id", label: "Taxon ID", type: "uuid/null", meaning: "Species/taxon row this observation resolves to." },
          { key: "observer", label: "Observer", type: "text", meaning: "Upstream observer identity where available." },
          { key: "observed_at", label: "Observed At", type: "timestamp", meaning: "When this row was observed." },
          { key: "place", label: "Place", type: "text", meaning: "Human-readable location." },
          { key: "media_count", label: "Media", type: "number", meaning: "Attached images/videos/audio count." },
          { key: "latitude", label: "Latitude", type: "number", meaning: "Geospatial coordinate." },
          { key: "longitude", label: "Longitude", type: "number", meaning: "Geospatial coordinate." },
        ],
        rows: observationTableRows,
      }),
      makeTable({
        id: "core.taxon",
        schema: "core",
        table: "taxon",
        label: "Taxa",
        count: countFrom(coreCounts.taxon ?? statsSnapshot?.total_taxa),
        icon: BookOpen,
        description: "Organism records used to build all-life species pages.",
        provenance: "iNaturalist, GBIF, MycoBank, FungiDB, GenBank, and other taxonomy sources.",
        rowMeaning: "One taxon row is a species or higher/lower rank organism identity. This is the anchor for observations, images, genomes, compounds, traits, and publications.",
        relationships: ["core.observation", "core.taxon_external_id", "bio.genome", "chem.taxon_compound", "bio.trait"],
        columns: [
          { key: "id", label: "ID", type: "uuid", meaning: "Taxon row ID." },
          { key: "canonical_name", label: "Canonical Name", type: "text", meaning: "Scientific name." },
          { key: "rank", label: "Rank", type: "text", meaning: "Taxonomic rank." },
          { key: "kingdom", label: "Kingdom", type: "text/null", meaning: "All-life kingdom/domain grouping." },
          { key: "source", label: "Source", type: "text", meaning: "Upstream taxonomy source." },
          { key: "obs_count", label: "Observations", type: "number", meaning: "Observation rows linked to this taxon." },
          { key: "image_count", label: "Images", type: "number", meaning: "Images linked to this taxon." },
          { key: "compound_link_count", label: "Compounds", type: "number", meaning: "Chemistry links for this taxon." },
        ],
        rows: taxonTableRows,
      }),
      makeTable({
        id: "core.taxon_external_id",
        schema: "core",
        table: "taxon_external_id",
        label: "Taxon External IDs",
        count: countFrom(statsSnapshot?.total_external_ids ?? coreCounts.taxon_external_id),
        icon: Link2,
        description: "Public identifiers that connect MINDEX records to outside reference sources.",
        provenance: "Taxonomy reference sources and public identifiers.",
        rowMeaning: "External ID rows are the bridge from MINDEX to iNaturalist, GBIF, GenBank, PubChem, ChemSpider, and other source systems.",
        relationships: ["core.taxon", "core.observation", "chem.compound", "bio.genetic_sequence"],
        columns: [
          { key: "source", label: "Source", type: "text", meaning: "External source name." },
          { key: "source_table", label: "Source Table", type: "text", meaning: "Aggregate represented here until row-level API exists." },
          { key: "row_count", label: "Rows", type: "number", meaning: "Loaded rows for this source." },
        ],
        rows: sourceCountRows(statsSnapshot?.taxa_by_source, "taxa_by_source"),
      }),
      makeTable({
        id: "core.observation_media",
        schema: "core",
        table: "observation_media",
        label: "Observation Media",
        count: countFrom(statsSnapshot?.observations_with_images),
        icon: ImageIcon,
        description: "Images, videos, and audio attached to observation rows.",
        provenance: "Observation photos, videos, and audio.",
        rowMeaning: "Media rows provide visual evidence and training assets. They should connect back to observations and taxa.",
        relationships: ["core.observation", "core.taxon", "storage.nas_object"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Media coverage field." },
          { key: "value", label: "Value", type: "number", meaning: "Current count or percentage." },
        ],
        rows: metricRows({
          observations_with_images: statsSnapshot?.observations_with_images ?? 0,
          taxa_with_images: consolePayload?.images?.taxa_with_images ?? 0,
          taxa_without_images: consolePayload?.images?.taxa_without_images ?? 0,
          image_coverage_percent: consolePayload?.images?.coverage_percent ?? 0,
        }),
      }),
      makeTable({
        id: "bio.genome",
        schema: "bio",
        table: "genome",
        label: "Genomes",
        count: countFrom(coreCounts.genome ?? statsSnapshot?.genome_records ?? healthAll?.counts?.genome),
        icon: Dna,
        description: "Genome metadata and sequence references for taxa.",
        provenance: "FungiDB, GenBank, and related genetics sources.",
        rowMeaning: "Genome rows explain the genetic evidence available for a taxon.",
        relationships: ["core.taxon", "bio.genetic_sequence", "bio.trait", "chem.taxon_compound"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Genomics table count." },
          { key: "value", label: "Value", type: "number", meaning: "Loaded rows." },
        ],
        rows: metricRows({
          genome: coreCounts.genome ?? statsSnapshot?.genome_records ?? 0,
          genetic_sequence: coreCounts.genetic_sequence ?? 0,
        }),
      }),
      makeTable({
        id: "bio.trait",
        schema: "bio",
        table: "trait",
        label: "Traits",
        count: countFrom(statsSnapshot?.trait_records),
        icon: FileText,
        description: "Traits, descriptions, biological characteristics, and profile facts.",
        provenance: "Mushroom.World, Wikipedia, publications, and profile enrichment sources.",
        rowMeaning: "Trait rows turn a species identity into descriptive biological information.",
        relationships: ["core.taxon", "bio.publication", "chem.taxon_compound"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Trait coverage field." },
          { key: "value", label: "Value", type: "number", meaning: "Loaded rows." },
        ],
        rows: metricRows({ trait_records: statsSnapshot?.trait_records ?? 0 }),
      }),
      makeTable({
        id: "bio.taxon_synonym",
        schema: "bio",
        table: "taxon_synonym",
        label: "Taxon Synonyms",
        count: countFrom(statsSnapshot?.synonym_records),
        icon: Braces,
        description: "Alternate scientific names and naming history for taxa.",
        provenance: "MycoBank and taxonomy enrichment.",
        rowMeaning: "Synonym rows prevent search and joins from missing species because a user or source used a different name.",
        relationships: ["core.taxon", "core.taxon_external_id"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Synonym coverage field." },
          { key: "value", label: "Value", type: "number", meaning: "Loaded rows." },
        ],
        rows: metricRows({ synonym_records: statsSnapshot?.synonym_records ?? 0 }),
      }),
      makeTable({
        id: "chem.taxon_compound",
        schema: "chem",
        table: "taxon_compound",
        label: "Taxon Compounds",
        count: countFrom(coreCounts.taxon_compound ?? healthAll?.counts?.taxon_compound),
        icon: Atom,
        description: "Compound links, molecular metadata, and source species relationships.",
        provenance: "PubChem, ChemSpider, and biological chemistry sources.",
        rowMeaning: "Compound link rows explain which chemicals are associated with which organisms and why.",
        relationships: ["core.taxon", "chem.compound", "chem.reaction", "bio.publication"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Chemistry coverage field." },
          { key: "value", label: "Value", type: "number", meaning: "Loaded rows." },
        ],
        rows: metricRows({
          taxon_compound: coreCounts.taxon_compound ?? 0,
          compound: coreCounts.compound ?? 0,
        }),
      }),
      makeTable({
        id: "earth.domain_counts",
        schema: "earth",
        table: "domain_counts",
        label: "Earth Domains",
        count: countFrom(consolePayload?.earth?.total_entities),
        icon: Waves,
        description: "Earth Simulator entity counts across vehicles, events, weather, emissions, and infrastructure domains.",
        provenance: "Earth Simulator and OEI feeds summarized by MINDEX console.",
        rowMeaning: "Earth domain rows show environmental context that can be correlated with observations, devices, and M-Wave events.",
        relationships: ["core.observation", "device.telemetry", "mwave.correlation"],
        columns: [
          { key: "domain", label: "Domain", type: "text", meaning: "Earth data domain." },
          { key: "count", label: "Count", type: "number", meaning: "Loaded entities in that domain." },
        ],
        rows: Object.entries(earthDomains).map(([domain, count]) => ({ id: domain, domain, count })),
      }),
      makeTable({
        id: "device.registry",
        schema: "device",
        table: "registry",
        label: "Device Registry",
        count: countFrom(fieldDevices?.count ?? healthAll?.counts?.telemetry_devices),
        icon: Radio,
        description: "Registered Mycosoft devices and field fleet status.",
        provenance: "Mycosoft device registry and field deployment records.",
        rowMeaning: "Device rows identify physical sensors and compute nodes that produce telemetry and local storage.",
        relationships: ["device.telemetry", "storage.node", "earth.domain_counts", "mwave.signal"],
        columns: [
          ...BASE_COLUMNS,
          { key: "registry_id", label: "Registry ID", type: "text", meaning: "Device registry identifier." },
          { key: "name", label: "Name", type: "text", meaning: "Device name." },
          { key: "status", label: "Status", type: "text", meaning: "Current network/telemetry state." },
          { key: "last_seen", label: "Last Seen", type: "timestamp", meaning: "Most recent device sighting." },
        ],
        rows: fieldDeviceRows,
      }),
      makeTable({
        id: "storage.nas",
        schema: "storage",
        table: "nas",
        label: "NAS Storage",
        count: countFrom(nas?.free_gb),
        icon: HardDrive,
        description: "Central MINDEX NAS status and capacity summary.",
        provenance: "MINDEX storage records.",
        rowMeaning: "Storage rows explain where images, archives, device backups, and training data can live.",
        relationships: ["core.observation_media", "device.registry", "integrity.record"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Storage capacity field." },
          { key: "value", label: "Value", type: "number/text", meaning: "Current value." },
        ],
        rows: metricRows({
          available: nas?.available ? "mounted" : "pending",
          total_gb: nas?.total_gb ?? null,
          used_gb: nas?.used_gb ?? null,
          free_gb: nas?.free_gb ?? null,
          usage_pct: nas?.usage_pct ?? null,
        }),
      }),
      makeTable({
        id: "integrity.ledger_anchor",
        schema: "integrity",
        table: "ledger_anchor",
        label: "Ledger Anchors",
        count: countFrom(healthAll?.counts?.ledger_anchors),
        icon: Shield,
        description: "Integrity anchors, hash-chain proofs, and ledger verification state.",
        provenance: "MINDEX integrity and ledger services.",
        rowMeaning: "Anchor rows prove that records were hashed, linked, and anchored to an integrity rail.",
        relationships: ["core.taxon", "core.observation", "chem.taxon_compound", "storage.nas"],
        columns: [
          { key: "metric", label: "Metric", type: "text", meaning: "Integrity coverage field." },
          { key: "value", label: "Value", type: "number/text", meaning: "Current count/state." },
        ],
        rows: metricRows({
          ledger_anchors: healthAll?.counts?.ledger_anchors ?? null,
          taxon_count_seen_by_health: healthAll?.counts?.taxon ?? null,
        }),
      }),
      makeTable({
        id: "etl.job",
        schema: "etl",
        table: "job",
        label: "Data Refresh Jobs",
        count: countFrom(etlJobs.length),
        icon: Database,
        description: "Refresh schedules that keep MINDEX data current.",
        provenance: "MINDEX data refresh scheduler.",
        rowMeaning: "Job rows explain which source produces or refreshes a dataset and how often it should run.",
        relationships: ["all MINDEX tables", "source systems"],
        columns: [
          { key: "job", label: "Job", type: "text", meaning: "Scheduler job name." },
          { key: "source", label: "Source", type: "text", meaning: "Source system." },
          { key: "priority", label: "Priority", type: "number", meaning: "Run priority." },
          { key: "interval_hours", label: "Interval", type: "number/null", meaning: "Current run cadence." },
        ],
        rows: etlJobs.map((job) => ({
          id: job.name,
          job: job.name,
          source: job.source,
          priority: job.priority ?? "--",
          interval_hours: job.interval_hours ?? "--",
        })),
      }),
    ]
  }, [consolePayload, coreCounts, earthDomains, etlJobs, fieldDevices, healthAll, nas, observations, statsSnapshot, taxa])

  const cleanQuery = query.trim()
  const needle = cleanQuery.toLowerCase()
  const hasGlobalSearchQuery = cleanQuery.length >= 2
  const tableMatches = useMemo(() => tables, [tables])
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? tables[0]
  const visibleRows = useMemo(
    () => selectedTable.rows.filter((row) => !needle || recordSearchText(row).includes(needle)),
    [needle, selectedTable],
  )
  const selectedRow = useMemo(() => visibleRows[selectedRowIndex] ?? visibleRows[0] ?? null, [selectedRowIndex, visibleRows])
  const visibleColumns = useMemo(
    () => selectedTable.columns.filter((column) =>
      visibleRows.some((row) => row[column.key] != null && row[column.key] !== ""),
    ),
    [selectedTable.columns, visibleRows],
  )
  const displayColumns = visibleColumns.length > 0 ? visibleColumns : selectedTable.columns
  const mycaSignals = useMemo(() => rowSignals(selectedRow), [selectedRow])
  const selectedTitle = selectedRowTitle(selectedRow)
  const mycaContext = hasGlobalSearchQuery ? `Search / ${cleanQuery}` : `${selectedTable.label} / ${selectedTitle}`
  const summaryRevision = `${selectedTable.id}:${selectedRowIndex}:${visibleRows.length}:${cleanQuery}`
  const selectedRowContext = useMemo(() => compactRecord(selectedRow), [selectedRow])
  const visibleRowSample = useMemo(
    () => visibleRows.slice(0, 5).map((row, index) => `row ${index + 1}\n${compactRecord(row, 8)}`).join("\n\n"),
    [visibleRows],
  )
  const tableCatalogContext = useMemo(
    () =>
      tables
        .map((table) => `${table.id} ${table.status} ${formatCount(table.count)} rows`)
        .join("; "),
    [tables],
  )
  const globalSearchHits = useMemo(() => flattenSearchResults(globalSearch), [globalSearch])
  const globalSearchContext = useMemo(
    () =>
      globalSearchHits
        .slice(0, 10)
        .map((hit) => `${hit.bucket ? SEARCH_BUCKET_LABELS[hit.bucket] : "MINDEX"}: ${searchHitTitle(hit)} - ${searchHitSummary(hit)}`)
        .join("\n"),
    [globalSearchHits],
  )
  const localMycaSummary = useMemo(() => {
    if (hasGlobalSearchQuery) {
      const matches = globalSearch?.total ?? globalSearchHits.length
      const top = globalSearchHits.slice(0, 3).map(searchHitTitle).join(", ")
      return [
        `MYCA is reading the MINDEX search for "${cleanQuery}".`,
        matches > 0
          ? `${matches.toLocaleString()} matching records are visible across MINDEX.`
          : "No matching records are visible yet in the current search view.",
        top ? `The strongest visible matches include ${top}.` : "As records load, MYCA will connect them to species, observations, chemistry, devices, and library data.",
      ].join(" ")
    }

    const countText =
      selectedTable.count == null
        ? "a count that is still being measured"
        : `${formatCount(selectedTable.count)} total rows`
    const selectedText =
      selectedTitle === "No row selected"
        ? "No individual row is selected yet."
        : `The selected record is ${selectedTitle}.`
    const related = selectedTable.relationships.map(humanRelationshipLabel).slice(0, 4).join(", ")

    return [
      `MYCA is looking at ${selectedTable.label}, with ${countText} and ${visibleRows.length.toLocaleString()} visible in the current view.`,
      selectedText,
      `These records come from ${selectedTable.provenance.replace(/[.\s]+$/g, "")}.`,
      related ? `Related areas include ${related}.` : "Related areas will appear as more context is available.",
    ].join(" ")
  }, [cleanQuery, globalSearch?.total, globalSearchHits, hasGlobalSearchQuery, selectedTable, selectedTitle, visibleRows.length])
  const harnessBadges = useMemo(
    () => [
      {
        label: consciousness?.is_conscious ? "Brain live" : "Brain linked",
        className: consciousness?.is_conscious
          ? "border-green-500/40 text-green-200"
          : "border-orange-500/35 text-orange-200",
        icon: Brain,
      },
      {
        label: memoryEnabled ? "Memory on" : "Memory ready",
        className: "border-cyan-500/40 text-cyan-200",
        icon: HardDrive,
      },
      {
        label: grounding?.is_grounded ? "Grounded" : "Grounding",
        className: grounding?.is_grounded ? "border-emerald-500/40 text-emerald-200" : "border-white/15 text-gray-400",
        icon: Radio,
      },
      {
        label: "Voice tools",
        className: "border-purple-500/40 text-purple-200",
        icon: Mic2,
      },
      {
        label: "MINDEX-bound",
        className: "border-orange-500/40 text-orange-200",
        icon: Shield,
      },
    ],
    [consciousness?.is_conscious, grounding?.is_grounded, memoryEnabled],
  )

  const getMycaContextText = useCallback(
    () =>
      [
        "[MINDEX Data Workbench Context]",
        "Surface: NatureOS MINDEX Data tab",
        "Purpose: MYCA is reading the selected data currently in front of the user.",
        "Harness: MAS MYCA MINDEX Data harness with brain, consciousness, persistent memory, bridge context, and voice tools enabled.",
        "Scope: stay bound to MINDEX Data. Use the selected table, selected row, visible filters, provenance, and related MINDEX datasets. Do not trigger Earth map controls or global app actions from this surface.",
        `Active view: ${selectedTable.label}`,
        `Visible status: ${selectedTable.status}`,
        `Total count: ${formatCount(selectedTable.count)}`,
        `Visible rows in current filter: ${visibleRows.length.toLocaleString()}`,
        `Search/filter query: ${query.trim() || "none"}`,
        `MINDEX-wide matches visible for this query: ${globalSearchHits.length.toLocaleString()}`,
        `Selected row: ${selectedTitle}`,
        `Source: ${selectedTable.provenance}`,
        `Row meaning: ${selectedTable.rowMeaning}`,
        `Related areas: ${selectedTable.relationships.map(humanRelationshipLabel).join(", ") || "none"}`,
        `Schema: ${selectedTable.columns.map((column) => `${column.key} (${column.type}) = ${column.meaning}`).join("; ")}`,
        "",
        "Selected row fields:",
        selectedRowContext,
        "",
        "Visible row sample:",
        visibleRowSample || "none",
        "",
        `Catalog summary: ${tableCatalogContext}`,
        "",
        "MINDEX-wide search matches:",
        globalSearchContext || "none",
        "",
        "Use this context to explain the visible data in simple human language.",
        "Store this as MINDEX data context for MYCA's persistent memory when the user talks with you.",
        "Do not mention technical implementation work, data refresh internals, routes, endpoints, joins, payloads, implementation details, hardware, GPUs, model/provider names, IP addresses, memory stores, internal frameworks, secrets, deployment details, or configuration.",
      ].join("\n"),
    [globalSearchContext, globalSearchHits.length, query, selectedTable, selectedTitle, selectedRowContext, tableCatalogContext, visibleRowSample, visibleRows.length],
  )

  const getMycaStructuredContext = useCallback(
    () => ({
      harness: "mas-myca-mindex-data",
      app: "mindex",
      platform: "mindex-data-myca-live",
      source_platform: "mindex-data-myca-live",
      surface: "mindex-data",
      surface_path: typeof window !== "undefined" ? window.location.pathname : undefined,
      chat_mode: "brain",
      mode: "brain",
      use_brain: true,
      allow_provider_fallbacks: true,
      include_memory_context: true,
      isolate_from_chat_memory: false,
      persistent_context: true,
      voice_tools_enabled: true,
      bridges_enabled: true,
      context_memory_topic: "MYCA sees MINDEX Data tab selections",
      capabilities_requested: [
        "mas_voice_orchestrator",
        "myca_brain",
        "myca_consciousness",
        "myca_persistent_memory",
        "myca_grounding",
        "myca_bridges",
        "myca_voice_tools",
      ],
      scope_guard: {
        allowed_surface: "mindex.data",
        allowed_focus: ["selected_table", "selected_row", "visible_filters", "provenance", "related_mindex_data"],
        restricted_actions: ["earth_map_control", "global_app_control", "credential_request", "deployment_or_configuration_guidance"],
      },
      selected_dataset: selectedTable.id,
      selected_schema: selectedTable.schema,
      selected_table: selectedTable.table,
      selected_label: selectedTable.label,
      selected_status: selectedTable.status,
      selected_count: selectedTable.count,
      visible_rows: visibleRows.length,
      search_query: query.trim(),
      selected_row_title: selectedTitle,
      selected_row: safeRowPayload(selectedRow),
      global_search: {
        query: query.trim(),
        total: globalSearch?.total ?? globalSearchHits.length,
        visible_results: globalSearchHits.slice(0, 12).map((hit) => ({
          bucket: hit.bucket,
          title: searchHitTitle(hit),
          subtitle: searchHitSubtitle(hit),
          summary: searchHitSummary(hit),
          source: hit.source,
          id: hit.id,
        })),
      },
      columns: selectedTable.columns.map((column) => ({
        key: column.key,
        label: column.label,
        type: column.type,
        meaning: column.meaning,
      })),
      relationships: selectedTable.relationships,
      related_areas: selectedTable.relationships.map(humanRelationshipLabel),
      provenance: selectedTable.provenance,
      quality_signals: mycaSignals,
      catalog: tables.map((table) => ({
        id: table.id,
        label: table.label,
        status: table.status,
        count: table.count,
      })),
    }),
    [globalSearch?.total, globalSearchHits, mycaSignals, query, selectedRow, selectedTable, selectedTitle, tables, visibleRows.length],
  )

  useEffect(() => {
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2) {
      setGlobalSearch(null)
      setGlobalSearchError(null)
      setGlobalSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setGlobalSearchLoading(true)
      setGlobalSearchError(null)

      void fetch(`/api/natureos/mindex/search?q=${encodeURIComponent(cleanQuery)}&limit=12`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (controller.signal.aborted) return
          if (!res.ok) {
            setGlobalSearch(null)
            setGlobalSearchError("MINDEX could not read every search source yet.")
            return
          }
          setGlobalSearch(data as MindexSearchResponse)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setGlobalSearch(null)
          setGlobalSearchError("MINDEX could not read every search source yet.")
        })
        .finally(() => {
          if (!controller.signal.aborted) setGlobalSearchLoading(false)
        })
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    summaryAbortRef.current?.abort()
    summaryAbortRef.current = controller
    setMycaSummaryLoading(true)
    setMycaSummaryError(null)
    setMycaSummary("")

    const fallbackTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setMycaSummary(localMycaSummary)
        setMycaSummaryLoading(false)
      }
    }, 6_500)

    const timer = window.setTimeout(() => {
      void fetch("/api/natureos/mindex/data-ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          revision: summaryRevision,
          context: getMycaStructuredContext(),
          context_text: getMycaContextText(),
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (controller.signal.aborted) return
          if (!res.ok || data.error) {
            setMycaSummaryError(null)
            setMycaSummary(localMycaSummary)
            return
          }
          const nextSummary = String(data.summary || "").trim()
          setMycaSummary(hasGlobalSearchQuery || isWeakMycaSummary(nextSummary) ? localMycaSummary : nextSummary)
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          setMycaSummaryError(null)
          setMycaSummary(localMycaSummary)
        })
        .finally(() => {
          window.clearTimeout(fallbackTimer)
          if (!controller.signal.aborted) setMycaSummaryLoading(false)
        })
    }, 650)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(fallbackTimer)
      controller.abort()
    }
  }, [getMycaContextText, getMycaStructuredContext, hasGlobalSearchQuery, localMycaSummary, summaryRevision])

  return (
    <div className="flex h-[calc(100dvh-168px)] min-h-[640px] flex-col overflow-hidden rounded-md border border-green-500/25 bg-black/45 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <div className="shrink-0 border-b border-white/10 bg-black/45 px-4 py-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,0.85fr)_minmax(420px,1.15fr)] xl:items-center">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Database className="h-5 w-5 text-green-300" />
              Data
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-gray-400">
              MINDEX database workbench: inspect tables, rows, schema, provenance, and AI interpretation in one place.
            </p>
          </div>
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSelectedRowIndex(0)
              }}
              placeholder="Search all MINDEX data"
              className="min-h-[44px] border-green-500/30 bg-black/60 pl-10 text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[282px_minmax(0,1fr)_360px]">
        <aside className="min-h-0 border-b border-white/10 bg-black/30 xl:border-b-0 xl:border-r">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Table2 className="h-4 w-4 text-cyan-300" />
                Tables
              </p>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
                {tableMatches.length.toLocaleString()}
              </Badge>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {tableMatches.map((table) => {
                const Icon = table.icon
                const active = table.id === selectedTable.id
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      setSelectedTableId(table.id)
                      setSelectedRowIndex(0)
                    }}
                    className={`grid w-full grid-cols-[22px_minmax(0,1fr)] gap-2 border-b border-white/10 px-3 py-3 text-left transition ${
                      active ? "bg-cyan-500/14" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="mt-1 h-4 w-4 text-cyan-300" />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{table.schema}.{table.table}</p>
                        <span className="shrink-0 font-mono text-xs text-white">{formatCount(table.count)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-gray-500">{table.label}</p>
                        <Badge variant="outline" className={statusClass(table.status)}>
                          {table.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col border-b border-white/10 bg-black/20 xl:border-b-0 xl:border-r">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-white">
                  {hasGlobalSearchQuery ? "Search results" : `${selectedTable.schema}.${selectedTable.table}`}
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-400">
                  {hasGlobalSearchQuery
                    ? "MINDEX-wide results across species, observations, chemistry, devices, mapped records, sources, and the sensor library."
                    : selectedTable.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasGlobalSearchQuery ? (
                  <>
                    <Badge variant="outline" className="border-green-500/40 text-green-200">
                      {globalSearchLoading ? "Reading" : `${(globalSearch?.total ?? globalSearchHits.length).toLocaleString()} matches`}
                    </Badge>
                    {globalSearch?.data_source ? (
                      <Badge variant="outline" className="border-white/15 text-gray-300">
                        {globalSearch.data_source === "live" ? "Live" : "Partial"}
                      </Badge>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className={statusClass(selectedTable.status)}>
                      {selectedTable.status}
                    </Badge>
                    <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                      {visibleRows.length.toLocaleString()} visible
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {hasGlobalSearchQuery ? (
            <section className="flex min-h-0 flex-1 flex-col">
              {globalSearchError ? (
                <p className="shrink-0 border-b border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-100">
                  {globalSearchError}
                </p>
              ) : null}

              {globalSearchLoading && globalSearchHits.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-gray-500">
                  Reading MINDEX records...
                </div>
              ) : null}

              {!globalSearchLoading && !globalSearchError && globalSearchHits.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                  <div className="max-w-xl rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-gray-300">
                    No MINDEX records are visible yet for this search.
                  </div>
                </div>
              ) : null}

              {globalSearchHits.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-black/95 text-xs uppercase tracking-[0.08em] text-gray-500">
                      <tr>
                        <th className="border-b border-white/10 px-3 py-2">Type</th>
                        <th className="border-b border-white/10 px-3 py-2">Record</th>
                        <th className="border-b border-white/10 px-3 py-2">Summary</th>
                        <th className="border-b border-white/10 px-3 py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchHits.slice(0, 40).map((hit, index) => {
                        const targetTableId = hit.bucket ? SEARCH_BUCKET_TABLES[hit.bucket] : undefined
                        const canOpenTable = Boolean(targetTableId && tables.some((table) => table.id === targetTableId))
                        return (
                          <tr
                            key={`${hit.bucket ?? "mindex"}-${hit.id ?? searchHitTitle(hit)}-${index}`}
                            onClick={() => {
                              if (!targetTableId) return
                              setSelectedTableId(targetTableId)
                              setSelectedRowIndex(0)
                            }}
                            className={`border-b border-white/5 transition ${
                              canOpenTable ? "cursor-pointer hover:bg-green-500/10" : "bg-white/[0.02]"
                            }`}
                          >
                            <td className="px-3 py-3">
                              <Badge variant="outline" className="border-green-500/35 text-green-200">
                                {hit.bucket ? SEARCH_BUCKET_LABELS[hit.bucket] : "MINDEX"}
                              </Badge>
                            </td>
                            <td className="max-w-[280px] px-3 py-3">
                              <p className="truncate font-medium text-white">{searchHitTitle(hit)}</p>
                              <p className="mt-1 truncate text-xs text-gray-500">{searchHitSubtitle(hit)}</p>
                            </td>
                            <td className="max-w-[420px] px-3 py-3 text-sm leading-5 text-gray-300">
                              <p className="line-clamp-2">{searchHitSummary(hit)}</p>
                            </td>
                            <td className="max-w-[180px] truncate px-3 py-3 text-xs text-gray-400">
                              {textValue(hit.source ?? hit.data_source ?? "--")}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-black/95 text-xs uppercase tracking-[0.08em] text-gray-500">
                    <tr>
                      {displayColumns.map((column) => (
                        <th key={column.key} className="border-b border-white/10 px-3 py-2">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, index) => (
                      <tr
                        key={`${selectedTable.id}-${index}`}
                        onClick={() => setSelectedRowIndex(index)}
                        className={`cursor-pointer border-b border-white/5 transition ${
                          index === selectedRowIndex ? "bg-purple-500/12" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        {displayColumns.map((column) => (
                          <td key={column.key} className="max-w-[260px] truncate px-3 py-2 font-mono text-xs text-white">
                            {textValue(row[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(displayColumns.length, 1)} className="px-3 py-12 text-center text-sm text-gray-500">
                          No rows match this table filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 border-t border-white/10 bg-black/35 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Schema</p>
                  <Badge variant="outline" className="border-white/15 text-gray-300">
                    {selectedTable.columns.length.toLocaleString()} columns
                  </Badge>
                </div>
                <div className="grid max-h-[118px] gap-2 overflow-auto md:grid-cols-2 xl:grid-cols-3">
                  {selectedTable.columns.map((column) => (
                    <div key={column.key} className="rounded border border-white/10 bg-white/[0.04] px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs text-white">{column.key}</p>
                        <span className="text-[10px] text-gray-500">{column.type}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-gray-400">{column.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>

        <aside className="flex min-h-0 flex-col bg-black/35">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Bot className="h-5 w-5 text-orange-300" />
                  MYCA analysis
                </h3>
                <p className="mt-1 text-sm text-gray-400">MYCA data reader for the table in front of you.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {harnessBadges.map(({ label, className, icon: Icon }) => (
                    <Badge key={label} variant="outline" className={`${className} gap-1.5 text-[10px]`}>
                      <Icon className="h-3 w-3" />
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Badge variant="outline" className="border-orange-500/40 text-orange-200">
                Persistent context
              </Badge>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
            <section className="rounded-md border border-white/10 bg-white/[0.045] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-orange-300" />
                Reading now
              </p>
              <p className="mt-1 break-words font-mono text-xs text-orange-100">{mycaContext}</p>
            </section>

            <section>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">MYCA readout</p>
              <div className="mt-2 space-y-2">
                <div className="min-h-[92px] rounded-md border border-orange-500/20 bg-black/35 p-3">
                  {mycaSummaryError && !mycaSummaryLoading ? (
                    <p className="text-xs leading-5 text-red-300">{mycaSummaryError}</p>
                  ) : null}
                  {!mycaSummaryError && mycaSummaryLoading && !mycaSummary ? (
                    <p className="flex items-center gap-2 text-xs leading-5 text-orange-200">
                      <Bot className="h-3.5 w-3.5" />
                      Reading selected MINDEX data...
                    </p>
                  ) : null}
                  {!mycaSummaryError && !mycaSummaryLoading && !mycaSummary ? (
                    <p className="text-xs leading-5 text-gray-500">Waiting for table context.</p>
                  ) : null}
                  {mycaSummary ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-100">{mycaSummary}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Where this comes from</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">{selectedTable.provenance}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTable.relationships.map((item) => (
                  <Badge key={item} variant="outline" className="border-orange-500/30 text-orange-200">
                    {humanRelationshipLabel(item)}
                  </Badge>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Selected row context</p>
              {hasGlobalSearchQuery ? (
                <div className="mt-2 max-h-[220px] overflow-auto rounded-md border border-white/10 bg-black/30 p-3">
                  {globalSearchHits.slice(0, 5).map((hit, index) => (
                    <div key={`${hit.bucket ?? "mindex"}-${hit.id ?? index}`} className="mb-3 last:mb-0">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-gray-500">{hit.bucket ? SEARCH_BUCKET_LABELS[hit.bucket] : "MINDEX"}</p>
                      <p className="mt-1 text-xs font-medium text-white">{searchHitTitle(hit)}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-4 text-gray-400">{searchHitSummary(hit)}</p>
                    </div>
                  ))}
                  {!globalSearchHits.length ? <p className="text-sm text-gray-500">No search result selected yet.</p> : null}
                </div>
              ) : selectedRow ? (
                <div className="mt-2 max-h-[220px] overflow-auto rounded-md border border-white/10 bg-black/30 p-3">
                  {Object.entries(selectedRow).map(([key, value]) => (
                    <div key={key} className="mb-2 last:mb-0">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-gray-500">{key}</p>
                      <p className="break-words font-mono text-xs text-white">{textValue(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No row selected.</p>
              )}
            </section>

            <section>
              <MYCAChatWidget
                className="h-[300px] min-h-[300px] border-orange-500/20 bg-black/35 shadow-none"
                title="MYCA Data"
                showHeader={true}
                actor="mindex-data-operator"
                source="web"
                wantAudio={true}
                enableFastIntent={false}
                placeholder="Ask MYCA about this MINDEX data"
                emptyMessage="Ask MYCA to explain the selected MINDEX row."
                getContextText={getMycaContextText}
                context={getMycaStructuredContext}
              />
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
