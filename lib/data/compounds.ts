// Comprehensive mapping of fungal compounds from mycosoft.org/compounds
export const COMPOUND_MAPPING = {
  // Hericium erinaceus compounds
  "hericenone-b": {
    id: "CS123456",
    name: "Hericenone B",
    formula: "C27H32O5",
    molecularWeight: 436.54,
    chemicalClass: "Cyathane diterpenoid",
    description: "A cyathane diterpenoid that promotes nerve growth factor (NGF) synthesis",
    sourceSpecies: ["Hericium erinaceus"],
    biologicalActivity: ["NGF synthesis promotion", "Neurite outgrowth stimulation", "Neuroprotective effects"],
    references: [
      {
        doi: "10.1016/j.bmc.2008.08.037",
        title:
          "Hericenones and erinacines: stimulators of nerve growth factor (NGF) biosynthesis in Hericium erinaceus",
      },
    ],
  },

  // Ganoderma lucidum compounds
  "ganoderic-acid": {
    id: "CS345671",
    name: "Ganoderic Acid",
    formula: "C30H44O7",
    molecularWeight: 516.67,
    chemicalClass: "Triterpene",
    description: "A triterpenoid with immunomodulating properties",
    sourceSpecies: ["Ganoderma lucidum"],
    biologicalActivity: ["Immunomodulation", "Anti-inflammatory", "Hepatoprotective"],
  },

  // Psilocybe compounds
  psilocybin: {
    id: "CS789012",
    name: "Psilocybin",
    formula: "C12H17N2O4P",
    molecularWeight: 284.25,
    chemicalClass: "Tryptamine alkaloid",
    description: "A naturally occurring psychedelic compound",
    sourceSpecies: ["Psilocybe cubensis", "Psilocybe semilanceata"],
    biologicalActivity: ["Serotonin receptor agonist", "Neuroplasticity promotion"],
    legalStatus: "Schedule I controlled substance in most countries",
  },

  // Amanita muscaria compounds
  muscimol: {
    id: "CS789013",
    name: "Muscimol",
    formula: "C4H6N2O2",
    molecularWeight: 114.1,
    chemicalClass: "Amino acid derivative",
    description: "Primary psychoactive compound in Amanita muscaria",
    sourceSpecies: ["Amanita muscaria"],
    biologicalActivity: ["GABA receptor agonist", "CNS effects"],
  },

  // Trametes versicolor compounds
  psk: {
    id: "CS456781",
    name: "Polysaccharide-K (PSK)",
    formula: "Complex polysaccharide",
    molecularWeight: 100000,
    chemicalClass: "Protein-bound polysaccharide",
    description: "An immunomodulating complex from Turkey Tail mushroom",
    sourceSpecies: ["Trametes versicolor"],
    biologicalActivity: ["Immune system enhancement", "Anti-tumor activity", "Infection resistance"],
  },

  // Cordyceps compounds
  cordycepin: {
    id: "CS234561",
    name: "Cordycepin",
    formula: "C10H13N5O3",
    molecularWeight: 251.24,
    chemicalClass: "Nucleoside analog",
    description: "A bioactive nucleoside with various therapeutic properties",
    sourceSpecies: ["Cordyceps militaris", "Cordyceps sinensis"],
    biologicalActivity: ["Anti-tumor activity", "Anti-inflammatory", "Immunomodulation"],
  },

  // Inonotus obliquus compounds
  "betulinic-acid": {
    id: "CS567891",
    name: "Betulinic Acid",
    formula: "C30H48O3",
    molecularWeight: 456.7,
    chemicalClass: "Triterpene",
    description: "A bioactive triterpene with anti-cancer properties",
    sourceSpecies: ["Inonotus obliquus"],
    biologicalActivity: ["Anti-tumor activity", "Anti-inflammatory", "Anti-viral"],
  },

  // Pleurotus ostreatus compounds
  lovastatin: {
    id: "CS901234",
    name: "Lovastatin",
    formula: "C24H36O5",
    molecularWeight: 404.55,
    chemicalClass: "Statin",
    description: "A naturally occurring statin compound",
    sourceSpecies: ["Pleurotus ostreatus"],
    biologicalActivity: ["Cholesterol reduction", "HMG-CoA reductase inhibition"],
  },

  // Lentinula edodes compounds
  lentinan: {
    id: "CS345678",
    name: "Lentinan",
    formula: "Complex polysaccharide",
    molecularWeight: 500000,
    chemicalClass: "Beta-glucan",
    description: "A high-molecular-weight polysaccharide",
    sourceSpecies: ["Lentinula edodes"],
    biologicalActivity: ["Immune system modulation", "Anti-tumor activity"],
  },

  // Grifola frondosa compounds
  grifolan: {
    id: "CS456789",
    name: "Grifolan",
    formula: "Complex polysaccharide",
    molecularWeight: 800000,
    chemicalClass: "Beta-glucan",
    description: "A bioactive beta-glucan from Maitake",
    sourceSpecies: ["Grifola frondosa"],
    biologicalActivity: ["Immune system enhancement", "Anti-tumor effects"],
  },

  // Agaricus blazei compounds
  blazein: {
    id: "CS567890",
    name: "Blazein",
    formula: "C27H46O3",
    molecularWeight: 418.65,
    chemicalClass: "Steroid",
    description: "A bioactive steroid compound",
    sourceSpecies: ["Agaricus blazei"],
    biologicalActivity: ["Anti-tumor activity", "Immunomodulation"],
  },

  // Add more compounds from mycosoft.org/compounds...
}

// Helper types
export interface Compound {
  id: string
  name: string
  formula: string
  molecularWeight: number
  chemicalClass: string
  description: string
  sourceSpecies: string[]
  biologicalActivity: string[]
  references?: Array<{
    doi: string
    title: string
  }>
  legalStatus?: string
}

// Helper functions for compound lookup
export function findCompoundById(id: string): Compound | undefined {
  return Object.values(COMPOUND_MAPPING).find((compound) => compound.id === id)
}

export function findCompoundsBySpecies(speciesName: string): Compound[] {
  return Object.values(COMPOUND_MAPPING).filter((compound) => compound.sourceSpecies.includes(speciesName))
}

export function searchCompounds(query: string): Compound[] {
  const normalizedQuery = query.toLowerCase()
  return Object.values(COMPOUND_MAPPING).filter(
    (compound) =>
      compound.name.toLowerCase().includes(normalizedQuery) ||
      compound.description.toLowerCase().includes(normalizedQuery) ||
      compound.chemicalClass.toLowerCase().includes(normalizedQuery) ||
      compound.biologicalActivity.some((activity) => activity.toLowerCase().includes(normalizedQuery)) ||
      compound.sourceSpecies.some((species) => species.toLowerCase().includes(normalizedQuery)),
  )
}

export function getCompoundsByClass(chemicalClass: string): Compound[] {
  return Object.values(COMPOUND_MAPPING).filter((compound) => compound.chemicalClass === chemicalClass)
}

// Get all unique chemical classes
export function getChemicalClasses(): string[] {
  return Array.from(new Set(Object.values(COMPOUND_MAPPING).map((compound) => compound.chemicalClass)))
}

// Get compounds with specific biological activity
export function getCompoundsByActivity(activity: string): Compound[] {
  return Object.values(COMPOUND_MAPPING).filter((compound) =>
    compound.biologicalActivity.some((act) => act.toLowerCase().includes(activity.toLowerCase())),
  )
}

// Get all source species
export function getSourceSpecies(): string[] {
  return Array.from(new Set(Object.values(COMPOUND_MAPPING).flatMap((compound) => compound.sourceSpecies)))
}

// =============================================================================
// MINDEX API INTEGRATION
// =============================================================================

const MINDEX_API_URL = process.env.NEXT_PUBLIC_MINDEX_API_URL || "http://localhost:8000"

export interface MINDEXCompound {
  id: string
  name: string
  iupac_name?: string
  formula?: string
  molecular_weight?: number
  smiles?: string
  inchi?: string
  inchikey?: string
  chemspider_id?: number
  pubchem_id?: number
  chemical_class?: string
  compound_type?: string
  source: string
  metadata: Record<string, unknown>
  activities?: Array<{
    activity_id: string
    activity_name: string
    category?: string
    potency?: string
    evidence_level?: string
  }>
  species_count?: number
}

export interface CompoundSearchResult {
  data: MINDEXCompound[]
  limit: number
  offset: number
  total?: number
}

/**
 * Fetch compounds from MINDEX API with fallback to static data
 */
export async function fetchCompounds(options?: {
  skip?: number
  limit?: number
  search?: string
  chemicalClass?: string
  compoundType?: string
}): Promise<CompoundSearchResult> {
  const params = new URLSearchParams()
  if (options?.skip) params.set("skip", options.skip.toString())
  if (options?.limit) params.set("limit", options.limit.toString())
  if (options?.search) params.set("search", options.search)
  if (options?.chemicalClass) params.set("chemical_class", options.chemicalClass)
  if (options?.compoundType) params.set("compound_type", options.compoundType)
  
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/compounds?${params.toString()}`)
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn("Failed to fetch from MINDEX API, using static data:", error)
  }
  
  // Fallback to static data
  let compounds = Object.values(COMPOUND_MAPPING).map(c => ({
    id: c.id,
    name: c.name,
    formula: c.formula,
    molecular_weight: c.molecularWeight,
    chemical_class: c.chemicalClass,
    compound_type: c.chemicalClass,
    source: "static",
    metadata: { sourceSpecies: c.sourceSpecies, biologicalActivity: c.biologicalActivity },
  }))
  
  // Apply search filter
  if (options?.search) {
    const query = options.search.toLowerCase()
    compounds = compounds.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.chemical_class?.toLowerCase().includes(query)
    )
  }
  
  // Apply chemical class filter  
  if (options?.chemicalClass) {
    compounds = compounds.filter(c => c.chemical_class === options.chemicalClass)
  }
  
  // Apply pagination
  const skip = options?.skip || 0
  const limit = options?.limit || 100
  const paginated = compounds.slice(skip, skip + limit)
  
  return {
    data: paginated as unknown as MINDEXCompound[],
    limit,
    offset: skip,
    total: compounds.length,
  }
}

/**
 * Fetch a single compound by ID from MINDEX API
 */
export async function fetchCompoundById(id: string): Promise<MINDEXCompound | null> {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/compounds/${id}`)
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn("Failed to fetch compound from MINDEX API:", error)
  }
  
  // Fallback to static data
  const staticCompound = findCompoundById(id)
  if (staticCompound) {
    return {
      id: staticCompound.id,
      name: staticCompound.name,
      formula: staticCompound.formula,
      molecular_weight: staticCompound.molecularWeight,
      chemical_class: staticCompound.chemicalClass,
      source: "static",
      metadata: { 
        sourceSpecies: staticCompound.sourceSpecies, 
        biologicalActivity: staticCompound.biologicalActivity,
        description: staticCompound.description,
      },
    }
  }
  
  return null
}

/**
 * Fetch compounds for a specific species from MINDEX API
 */
export async function fetchCompoundsForSpecies(taxonId: string): Promise<MINDEXCompound[]> {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/compounds/for-taxon/${taxonId}`)
    
    if (response.ok) {
      const data = await response.json()
      return data.compounds || []
    }
  } catch (error) {
    console.warn("Failed to fetch compounds for species:", error)
  }
  
  return []
}

/**
 * Search ChemSpider directly via MINDEX API
 */
export async function searchChemSpider(query: string, searchType: string = "name", maxResults: number = 10) {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/compounds/chemspider/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, search_type: searchType, max_results: maxResults }),
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn("ChemSpider search failed:", error)
  }
  
  return { query, search_type: searchType, results: [], total_count: 0 }
}

/**
 * Enrich a compound with ChemSpider data
 */
export async function enrichCompoundFromChemSpider(options: {
  compound_id?: string
  compound_name?: string
  chemspider_id?: number
  smiles?: string
  inchikey?: string
}) {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/compounds/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn("ChemSpider enrichment failed:", error)
  }
  
  return { success: false, message: "Failed to enrich compound" }
}

/**
 * Get all biological activities
 */
export async function fetchBiologicalActivities() {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/compounds/activities`)
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn("Failed to fetch biological activities:", error)
  }
  
  // Return fallback static list
  return [
    { id: "1", name: "Antibacterial", category: "antimicrobial" },
    { id: "2", name: "Antifungal", category: "antimicrobial" },
    { id: "3", name: "Antiviral", category: "antimicrobial" },
    { id: "4", name: "Anticancer", category: "oncology" },
    { id: "5", name: "Immunomodulating", category: "immunology" },
    { id: "6", name: "Neuroprotective", category: "neurology" },
    { id: "7", name: "Neurotrophic", category: "neurology" },
    { id: "8", name: "Psychoactive", category: "neurology" },
    { id: "9", name: "Anti-inflammatory", category: "general" },
    { id: "10", name: "Antioxidant", category: "general" },
  ]
}