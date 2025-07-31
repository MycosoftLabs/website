export interface FungiSpecies {
  id: string
  commonName: string
  scientificName: string
  description: string
  taxonomy: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
    species: string
  }
  characteristics?: {
    habitat?: string[]
    season?: string[]
    edibility?: string
    ecology?: string
  }
  compounds?: Array<{
    id: string
    name: string
    concentration?: string
  }>
  images: Array<{
    url: string
    medium_url?: string
    large_url?: string
    attribution: string
    license_code?: string
    type?: "primary" | "specimen"
    source_url?: string
  }>
  references: Array<{
    title: string
    url: string
    type: "article" | "database" | "book"
  }>
  lastUpdated: string
  interactions?: string[]
  conservationStatus?: string
  wikipedia_summary?: string
  iNaturalistId?: string
  type?: string
}
