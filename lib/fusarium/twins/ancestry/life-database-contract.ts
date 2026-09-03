export type LifeSourceState = "loading" | "available" | "empty" | "unavailable" | "unauthorized"

export interface LifeRecordCoverage {
  observations: number
  images: number
  video: number
  audio: number
  genomes: number
  compounds: number
  interactions: number
  publications: number
  characteristics: number
}

export interface LifeSpeciesRecord {
  id: number | string
  uuid?: string
  scientific_name: string
  common_name: string | null
  family: string
  kingdom?: string | null
  description: string | null
  image_url: string | null
  characteristics: string[]
  habitat: string | null
  edibility?: string | null
  observations_count?: number
  wikipedia_url?: string | null
  rank?: string
  source?: string
  lineage?: string[] | null
  coverage?: LifeRecordCoverage
  photo_attribution?: string | null
  photo_license?: string | null
}

export interface LifeCatalogResponse {
  species: LifeSpeciesRecord[]
  total: number
  page: number
  pages: number
  source: string
  source_state?: "available" | "empty" | "unavailable"
  message?: string
  database_stats?: { total_taxa?: number; per_page?: number }
}

export const LIFE_KINGDOMS = [
  { value: "all", label: "All life" },
  { value: "Fungi", label: "Fungi" },
  { value: "Plantae", label: "Plants" },
  { value: "Animalia", label: "Animals" },
  { value: "Bacteria", label: "Bacteria" },
  { value: "Archaea", label: "Archaea" },
  { value: "Protista", label: "Protists" },
  { value: "Viruses", label: "Viruses" },
] as const

export function lifeRecordId(record: LifeSpeciesRecord) {
  return record.uuid || String(record.id)
}

export function compactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}
