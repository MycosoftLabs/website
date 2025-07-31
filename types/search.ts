export interface SearchSuggestion {
  id: string
  title: string
  type: "fungi" | "article" | "compound" | "research" | "category"
  scientificName?: string
  url: string
  date?: string
  description?: string
  category?: string
}

export interface SearchResult {
  id: string
  title: string
  description: string
  type: "fungi" | "compound" | "paper" | "research"
  url: string
  source: "iNaturalist" | "MycoBank" | "FungiDB" | "Elsevier" | "ChemSpider" | "PubChem" | "Mycosoft"
  metadata?: {
    authors?: string[]
    year?: number
    journal?: string
    doi?: string
    formula?: string
    molecularWeight?: number
    sourceSpecies?: string[]
    biologicalActivity?: string[]
  }
}

export interface FungiSpecies {
  id: string
  commonName: string
  scientificName: string
  description: string
  taxonomy: {
    kingdom: string
    phylum: string
    subphylum?: string
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

export interface Compound {
  id: string
  name: string
  formula: string
  molecularWeight: number
  chemicalClass: string
  description: string
  structure?: {
    url: string
    smiles?: string
    inchi?: string
  }
  biologicalActivity: string[]
  safety?: {
    classification: string
    warnings: string[]
  }
  foundIn?: Array<{
    id: string
    scientificName: string
    commonName: string
  }>
  references?: Array<{
    doi: string
    title: string
    url: string
  }>
  properties?: Record<string, string>
}
