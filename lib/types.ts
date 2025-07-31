export interface Species {
  id: string
  name: string
  scientificName: string
  commonName?: string
  description: string
  habitat: string
  edibility: "edible" | "poisonous" | "inedible" | "unknown"
  images: string[]
  characteristics: {
    capShape?: string
    capColor?: string
    gillAttachment?: string
    stemShape?: string
    sporePrint?: string
    habitat?: string
    season?: string
  }
  taxonomy: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
    species: string
  }
  distribution: string[]
  references: string[]
  lastUpdated: string
  verified: boolean
}

export interface DeviceLocation {
  id: string
  name: string
  location: [number, number] // [longitude, latitude]
  status: "active" | "inactive"
  sporeCount?: number
}

export interface SporeDataPoint {
  id: string
  speciesName: string
  latitude: number
  longitude: number
  concentration: number
  timestamp: string
  status: "active" | "inactive"
}

export interface SearchResult {
  id: string
  title: string
  type: "species" | "compound" | "paper" | "device"
  description: string
  url: string
  relevance: number
  metadata?: {
    scientificName?: string
    commonName?: string
    edibility?: string
    habitat?: string
    authors?: string[]
    publishedDate?: string
    journal?: string
    deviceType?: string
    status?: string
  }
}

export interface Compound {
  id: string
  name: string
  formula: string
  molecularWeight: number
  description: string
  sources: string[]
  properties: {
    melting_point?: string
    boiling_point?: string
    solubility?: string
    color?: string
    odor?: string
  }
  bioactivity: {
    antimicrobial?: boolean
    antioxidant?: boolean
    cytotoxic?: boolean
    psychoactive?: boolean
  }
  references: string[]
}

export interface Paper {
  id: string
  title: string
  authors: string[]
  abstract: string
  journal: string
  publishedDate: string
  doi?: string
  url?: string
  keywords: string[]
  citations: number
}

export interface Device {
  id: string
  name: string
  type: string
  description: string
  status: "active" | "inactive" | "maintenance"
  location?: DeviceLocation
  specifications: Record<string, any>
  lastUpdated: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DatabaseConnection {
  isConnected: boolean
  error?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: "user" | "admin" | "researcher"
  verified: boolean
}

export interface AncestryNode {
  id: string
  name: string
  scientificName: string
  rank: string
  parentId?: string
  children: string[]
  metadata: {
    commonNames: string[]
    description?: string
    imageUrl?: string
  }
}
