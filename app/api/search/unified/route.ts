/**
 * Unified Search API Route - Feb 2026
 *
 * MINDEX-FIRST architecture:
 * 1. PRIMARY: Query MINDEX API (192.168.0.189:8000) for species, compounds, sequences, research
 * 2. SECONDARY: iNaturalist for live observation data and species not in MINDEX
 * 3. MERGE: MINDEX results first, iNaturalist additive, deduplicate by scientific name
 *
 * NO MOCK DATA - all results from real sources.
 */

import { NextRequest, NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

// ---------------------------------------------------------------------------
// MINDEX queries (PRIMARY)
// ---------------------------------------------------------------------------

async function searchMindexUnified(query: string, limit: number) {
  try {
    // Use MINDEX unified-search endpoint which searches taxa, compounds, genetics in parallel
    const res = await fetch(
      `${MINDEX_API_URL}/api/mindex/unified-search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) {
      console.error("MINDEX unified-search failed:", res.status)
      return { taxa: [], compounds: [], genetics: [] }
    }
    const data = await res.json()
    return {
      taxa: data.results?.taxa || [],
      compounds: data.results?.compounds || [],
      genetics: data.results?.genetics || [],
    }
  } catch (error) {
    console.error("MINDEX unified search error:", error)
    return { taxa: [], compounds: [], genetics: [] }
  }
}

async function transformMindexTaxa(taxa: any[]) {
  return taxa.map((t: any) => ({
    id: `mindex-${t.id}`,
    scientificName: t.scientific_name || t.name || "",
    commonName: t.common_name || t.preferred_common_name || "",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "",
      class: "",
      order: "",
      family: "",
      genus: "",
    },
    description: t.description || `Species: ${t.scientific_name || t.name}`,
    photos: t.image_url ? [{
      id: String(t.id),
      url: t.image_url,
      medium_url: t.image_url,
      large_url: t.image_url,
      attribution: "MINDEX",
    }] : [],
    observationCount: t.observation_count || 0,
    rank: t.rank || "species",
    _source: "MINDEX",
  }))
}

async function transformMindexCompounds(compounds: any[]) {
  return compounds.map((c: any) => ({
    id: `mindex-cmp-${c.id}`,
    name: c.name || c.compound_name || "",
    formula: c.formula || c.molecular_formula || "",
    molecularWeight: Number(c.molecular_weight || 0),
    smiles: c.smiles || "",
    structure: c.smiles || "",  // Widget expects "structure"
    inchi: c.inchi || "",
    cas: c.cas_number || "",
    description: c.description || "",
    bioactivity: c.bioactivity || [],
    biologicalActivity: c.bioactivity || [],  // Widget expects "biologicalActivity"
    sources: c.source_species || [],
    sourceSpecies: c.source_species || [],  // Widget expects "sourceSpecies"
    chemicalClass: c.chemical_class || "",
    _source: "MINDEX",
  }))
}

async function transformMindexGenetics(sequences: any[]) {
  return sequences.map((s: any) => ({
    id: `mindex-seq-${s.id}`,
    accession: s.accession || s.genbank_id || "",
    speciesName: s.species_name || s.taxon_name || "",
    // GeneticsResult interface uses geneRegion and sequenceLength (not gene/length)
    geneRegion: s.gene || s.region || "",
    sequenceLength: s.sequence_length || s.length || (s.sequence?.length || 0),
    gcContent: s.gc_content ?? undefined,
    source: s.source || "GenBank",
    _source: "MINDEX",
  }))
}

// REMOVED: Old individual search functions replaced by unified search above

async function searchMindexResearch(query: string, limit: number) {
  try {
    // TODO: Create /api/mindex/research/search endpoint in MINDEX API
    // For now, return empty until the research endpoint is created
    const res = await fetch(
      `${MINDEX_API_URL}/api/mindex/research?search=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(2500) }
    )
    if (!res.ok) {
      // Endpoint may not exist yet - this is expected
      return []
    }
    const data = await res.json()
    const research = data.data || data.results || data || []
    return Array.isArray(research) ? research.map((r: any) => ({
      id: `mindex-res-${r.id}`,
      title: r.title || "",
      authors: r.authors || [],
      journal: r.journal || r.source || "",
      year: r.year || r.publication_year || 0,
      doi: r.doi || "",
      abstract: r.abstract || "",
      relatedSpecies: r.related_species || [],
      _source: "MINDEX",
    })) : []
  } catch (error) {
    // Don't log error for 404 - endpoint may not exist yet
    return []
  }
}

// ---------------------------------------------------------------------------
// iNaturalist (SECONDARY / additive)
// ---------------------------------------------------------------------------

async function searchINaturalist(query: string, limit: number) {
  try {
    const data = await searchFungi(query)
    if (!data?.results) return []
    return data.results
      .filter(
        (r: any) =>
          (r.iconic_taxon_name === "Fungi" || r.ancestor_ids?.includes(47170)) &&
          (r.preferred_common_name || r.name)
      )
      .slice(0, limit)
      .map((r: any) => {
        // Parse real taxonomy from ancestor array (never hardcode empty strings)
        const taxonomy: Record<string, string> = {
          kingdom: "Fungi", phylum: "", class: "", order: "", family: "", genus: "",
        }
        for (const a of r.ancestors || []) {
          const rank = (a.rank || "").toLowerCase()
          if (rank === "phylum") taxonomy.phylum = a.name
          else if (rank === "class") taxonomy.class = a.name
          else if (rank === "order") taxonomy.order = a.name
          else if (rank === "family") taxonomy.family = a.name
          else if (rank === "genus") taxonomy.genus = a.name
        }
        // Infer genus from binomial name if still empty
        if (!taxonomy.genus && r.name?.includes(" ")) taxonomy.genus = r.name.split(" ")[0]

        return {
          id: `inat-${r.id}`,
          scientificName: r.name || "",
          commonName: r.preferred_common_name || r.name || "",
          taxonomy,
          description: r.wikipedia_summary?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
            || `A species of fungus (${r.name})`,
          photos: r.default_photo
            ? [
                {
                  id: String(r.default_photo.id || r.id),
                  url: r.default_photo.square_url || "",
                  medium_url: r.default_photo.medium_url || r.default_photo.square_url || "",
                  large_url: r.default_photo.large_url || r.default_photo.medium_url || "",
                  attribution: r.default_photo.attribution || "iNaturalist",
                },
              ]
            : [],
          observationCount: r.observations_count || 0,
          rank: r.rank || "species",
          _source: "iNaturalist",
        }
      })
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Compound → producing-fungi lookup
// ---------------------------------------------------------------------------

/**
 * Many fungal compounds don't share their name with any species.
 * When a query returns 0 species results but has a compound match, we look up
 * the fungi that PRODUCE that compound and return those as the species results.
 *
 * Sources:
 *   1. Curated map — reliable, covers the most important fungal bioactives
 *   2. Genus extraction — "psilocybin" → stem "psilocyb" → genus "Psilocybe"
 */

// ---------------------------------------------------------------------------
// Species intelligence: common name → scientific name + key bioactives
// ---------------------------------------------------------------------------

/**
 * Maps common names / synonyms to scientific names.
 * Used to translate "Reishi" → "Ganoderma lucidum" for targeted NCBI/PubChem searches.
 */
const SPECIES_NAMES: Record<string, string> = {
  // Medicinal
  "reishi":             "Ganoderma lucidum",
  "lingzhi":            "Ganoderma lucidum",
  "ganoderma":          "Ganoderma lucidum",
  "lion's mane":        "Hericium erinaceus",
  "lions mane":         "Hericium erinaceus",
  "hericium":           "Hericium erinaceus",
  "turkey tail":        "Trametes versicolor",
  "trametes":           "Trametes versicolor",
  "chaga":              "Inonotus obliquus",
  "inonotus":           "Inonotus obliquus",
  "maitake":            "Grifola frondosa",
  "hen of the woods":   "Grifola frondosa",
  "grifola":            "Grifola frondosa",
  "cordyceps":          "Cordyceps militaris",
  "caterpillar fungus": "Cordyceps militaris",
  "shiitake":           "Lentinula edodes",
  "lentinula":          "Lentinula edodes",
  "oyster mushroom":    "Pleurotus ostreatus",
  "pleurotus":          "Pleurotus ostreatus",
  "king oyster":        "Pleurotus eryngii",
  // Culinary
  "button mushroom":    "Agaricus bisporus",
  "cremini":            "Agaricus bisporus",
  "portobello":         "Agaricus bisporus",
  "agaricus":           "Agaricus bisporus",
  "chanterelle":        "Cantharellus cibarius",
  "cantharellus":       "Cantharellus cibarius",
  "porcini":            "Boletus edulis",
  "cep":                "Boletus edulis",
  "boletus":            "Boletus edulis",
  "morel":              "Morchella esculenta",
  "morchella":          "Morchella esculenta",
  "truffle":            "Tuber melanosporum",
  "black truffle":      "Tuber melanosporum",
  "tuber":              "Tuber melanosporum",
  // Psychoactive / toxic
  "magic mushroom":     "Psilocybe cubensis",
  "golden teacher":     "Psilocybe cubensis",
  "psilocybe":          "Psilocybe cubensis",
  "fly agaric":         "Amanita muscaria",
  "fly amanita":        "Amanita muscaria",
  "death cap":          "Amanita phalloides",
  // Other
  "enoki":              "Flammulina velutipes",
  "nameko":             "Pholiota nameko",
  "black ear":          "Auricularia auricula-judae",
  "wood ear":           "Auricularia auricula-judae",
  "snow fungus":        "Tremella fuciformis",
  "tremella":           "Tremella fuciformis",
}

/**
 * Maps species names (common or scientific) to their key bioactive compounds.
 * These are the most well-characterised compounds for each species.
 */
const SPECIES_COMPOUNDS: Record<string, string[]> = {
  // Reishi / Ganoderma
  "reishi":                 ["Ganoderic acid A", "Ganoderic acid B", "Lucidenic acid A"],
  "ganoderma":              ["Ganoderic acid A", "Lucidenic acid A", "Ganoderean"],
  "ganoderma lucidum":      ["Ganoderic acid A", "Ganoderic acid B", "Lucidenic acid A", "Beta-D-glucan"],
  "lingzhi":                ["Ganoderic acid A", "Lucidenic acid A"],
  // Lion's Mane
  "lion's mane":            ["Hericenone A", "Erinacine A"],
  "lions mane":             ["Hericenone A", "Erinacine A"],
  "hericium erinaceus":     ["Hericenone A", "Erinacine A", "Hericenone E"],
  "hericium":               ["Hericenone A", "Erinacine A"],
  // Turkey Tail
  "turkey tail":            ["Polysaccharide K", "Polysaccharide P"],
  "trametes versicolor":    ["Polysaccharide K", "Polysaccharide P", "Coriolan"],
  "trametes":               ["Polysaccharide K"],
  // Chaga
  "chaga":                  ["Betulinic acid", "Inotodiol", "Ergosterol"],
  "inonotus obliquus":      ["Betulinic acid", "Inotodiol", "Lanosterol"],
  "inonotus":               ["Betulinic acid", "Inotodiol"],
  // Cordyceps
  "cordyceps":              ["Cordycepin", "Adenosine"],
  "cordyceps militaris":    ["Cordycepin", "Adenosine", "Cordymin"],
  // Maitake
  "maitake":                ["D-Fraction", "Beta-D-glucan"],
  "grifola frondosa":       ["D-Fraction", "Grifolin", "Beta-D-glucan"],
  "grifola":                ["Grifolin", "D-Fraction"],
  // Shiitake
  "shiitake":               ["Lentinan", "Eritadenine", "Lenthionine"],
  "lentinula edodes":       ["Lentinan", "Eritadenine", "Lenthionine"],
  "lentinula":              ["Lentinan", "Eritadenine"],
  // Oyster
  "oyster mushroom":        ["Lovastatin", "Pleuran", "Pleurotolysine"],
  "pleurotus ostreatus":    ["Lovastatin", "Pleuran", "Pleurotolysine"],
  "pleurotus":              ["Lovastatin", "Pleuran"],
  // Amanita
  "amanita muscaria":       ["Muscimol", "Ibotenic acid", "Muscarine"],
  "fly agaric":             ["Muscimol", "Ibotenic acid"],
  "amanita phalloides":     ["Alpha-amanitin", "Phalloidin", "Amatoxin"],
  "death cap":              ["Alpha-amanitin", "Phalloidin"],
  "amanita":                ["Muscimol", "Muscarine", "Alpha-amanitin"],
  // Psilocybe
  "psilocybe cubensis":     ["Psilocybin", "Psilocin", "Baeocystin"],
  "psilocybe":              ["Psilocybin", "Psilocin", "Baeocystin"],
  "magic mushroom":         ["Psilocybin", "Psilocin"],
  // Boletus / Porcini
  "boletus edulis":         ["Boletic acid", "Variegatic acid", "Ergothioneine"],
  "porcini":                ["Boletic acid", "Variegatic acid"],
  "boletus":                ["Boletic acid", "Variegatic acid"],
  // Chanterelle
  "cantharellus cibarius":  ["Cantharellol", "Ergothioneine"],
  "chanterelle":            ["Cantharellol"],
  // Morel
  "morchella esculenta":    ["Morchellin", "Morchellamide"],
  "morel":                  ["Morchellin"],
  // Truffle
  "tuber melanosporum":     ["Bis(methylthio)methane", "Androstenol"],
  "truffle":                ["Bis(methylthio)methane"],
  // Enoki
  "flammulina velutipes":   ["Flammutoxin", "Proflamin", "Eritadenine"],
  "enoki":                  ["Flammutoxin", "Proflamin"],
  // Snow fungus
  "tremella fuciformis":    ["Tremella polysaccharide", "Beta-glucuronoxylomannan"],
  "tremella":               ["Tremella polysaccharide"],
}

/**
 * Resolve a query to a scientific name if it matches a known species common name.
 */
function resolveScientificName(query: string): string | null {
  const q = query.toLowerCase().trim()
  for (const [key, name] of Object.entries(SPECIES_NAMES)) {
    if (q === key || q.includes(key) || key.includes(q)) return name
  }
  return null
}

/**
 * Get key bioactive compounds for a species query.
 * Returns compound names to fetch from PubChem.
 */
function getCompoundNamesForSpecies(query: string, scientificName?: string | null): string[] {
  const q = query.toLowerCase().trim()
  const sci = (scientificName || "").toLowerCase().trim()

  for (const [key, compounds] of Object.entries(SPECIES_COMPOUNDS)) {
    if (q === key || q.includes(key) || key.includes(q)) return compounds
    if (sci && (sci === key || sci.includes(key) || key.includes(sci))) return compounds
  }
  return []
}

/**
 * Fetch a compound from PubChem and return it in CompoundResult shape.
 * Lightweight version for the unified search (only fetches essential properties).
 */
async function fetchCompoundLite(name: string): Promise<any | null> {
  try {
    const encName = encodeURIComponent(name.trim())
    const propsRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encName}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,XLogP,Complexity/JSON`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" } }
    )
    if (!propsRes.ok) return null
    const propsData = await propsRes.json()
    const props = propsData?.PropertyTable?.Properties?.[0]
    if (!props) return null

    return {
      id: `pubchem-${props.CID}`,
      name,
      formula: props.MolecularFormula || "",
      molecularWeight: Number(props.MolecularWeight || 0),
      chemicalClass: "",
      sourceSpecies: [],
      biologicalActivity: [],
      structure: props.CanonicalSMILES || "",
      smiles: props.CanonicalSMILES || "",
      _source: "PubChem",
      _cid: props.CID,
    }
  } catch {
    return null
  }
}

/**
 * Fetch key bioactive compounds for a species.
 * Runs fetches in parallel; returns at most 4 results to keep latency low.
 */
async function searchCompoundsForSpecies(query: string, scientificName?: string | null): Promise<any[]> {
  const names = getCompoundNamesForSpecies(query, scientificName)
  if (!names.length) return []

  // Fetch top 4 in parallel (PubChem can handle this without rate-limit issues)
  const results = await Promise.all(names.slice(0, 4).map(n => fetchCompoundLite(n)))
  return results.filter(Boolean)
}

/**
 * Run a species-targeted NCBI genetics search using the scientific name.
 * Far more accurate than searching for a common name like "Reishi".
 */
async function searchGeneticsForSpecies(scientificName: string, limit: number): Promise<any[]> {
  if (!scientificName) return []
  const HEADERS = { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" }

  try {
    // NCBI does NOT index ITS via [Gene] — search by title keyword.
    // Two-pass: ITS/ribosomal title search first, general organism search as fallback.
    const itsQuery  = `${scientificName}[Organism] AND (internal transcribed spacer[Title] OR ITS[Title] OR ribosomal[Title])`
    const genQuery  = `${scientificName}[Organism]`

    const runSearch = async (q: string) => {
      const r = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nucleotide&term=${encodeURIComponent(q)}&retmax=${limit}&retmode=json`,
        { signal: AbortSignal.timeout(8000), headers: HEADERS }
      )
      if (!r.ok) return []
      const d = await r.json()
      return (d.esearchresult?.idlist || []) as string[]
    }

    let ids = await runSearch(itsQuery)
    if (!ids.length) ids = await runSearch(genQuery)
    if (!ids.length) return []

    await new Promise(r => setTimeout(r, 350))
    const sumRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=nucleotide&id=${ids.join(",")}&retmode=json`,
      { signal: AbortSignal.timeout(8000), headers: HEADERS }
    )
    if (!sumRes.ok) return []
    const sumData = await sumRes.json()
    const uids: string[] = sumData.result?.uids || []

    return uids.slice(0, limit).map((uid: string) => {
      const item = sumData.result[uid] || {}
      const accession: string = item.accessionversion || item.caption || uid
      const title: string = item.title || ""
      const geneMatch = title.match(/\b(ITS[12]?|LSU|SSU|18S|28S|5\.8S|RPB[12]|TEF1)\b/i)
      return {
        id: `ncbi-${uid}`,
        accession,
        speciesName: item.organism || scientificName,
        geneRegion: geneMatch ? geneMatch[1].toUpperCase() : "",
        sequenceLength: parseInt(item.slen || "0", 10),
        source: "GenBank",
        _source: "NCBI",
      }
    })
  } catch {
    return []
  }
}

const COMPOUND_TO_FUNGI: Record<string, string> = {
  // Psilocybin family
  psilocybin:    "Psilocybe",
  psilocin:      "Psilocybe",
  baeocystin:    "Psilocybe",
  norbaeocystin: "Psilocybe",
  aeruginascin:  "Psilocybe",
  // Amanita toxins & actives
  muscarine:     "Amanita",
  muscimol:      "Amanita muscaria",
  "ibotenic acid":"Amanita muscaria",
  ibotenic:      "Amanita muscaria",
  amatoxin:      "Amanita phalloides",
  "alpha-amanitin":"Amanita phalloides",
  phalloidin:    "Amanita phalloides",
  virotoxin:     "Amanita",
  // Ganoderma / Reishi
  ganoderic:     "Ganoderma",
  ganodermic:    "Ganoderma",
  "ganoderic acid":"Ganoderma",
  "ganodermic acid":"Ganoderma",
  lucidenic:     "Ganoderma",
  lanostan:      "Ganoderma",
  // Cordyceps
  cordycepin:    "Cordyceps",
  // Hericium (Lion's Mane)
  hericenone:    "Hericium",
  erinacine:     "Hericium",
  // Lentinus / Shiitake
  lentinan:      "Lentinula edodes",
  eritadenine:   "Lentinula edodes",
  // Trametes / Turkey Tail
  psk:           "Trametes versicolor",
  krestin:       "Trametes versicolor",
  // Ergot
  ergotamine:    "Claviceps",
  ergot:         "Claviceps",
  lysergic:      "Claviceps",
  // Inonotus / Chaga
  inotodiol:     "Inonotus obliquus",
  betulinic:     "Inonotus obliquus",
  // Cantharellus
  cantharellol:  "Cantharellus",
  // Tuber / Truffle
  bis:           "Tuber",
  // Pleurotus / Oyster
  pleuran:       "Pleurotus",
  lovastatin:    "Aspergillus terreus",
}

/**
 * Attempt to derive a genus name from a compound name by stripping common
 * chemical suffixes, then try it as an iNaturalist taxon search.
 * "psilocybin" → "psilocyb" → closest match is "Psilocybe"
 */
function extractGenusFromCompound(name: string): string | null {
  const n = name.toLowerCase().trim()
  // Strip common chemical suffixes
  const stripped = n
    .replace(/(in|ine|ol|ate|ic|ide|yl|oid|al|ane|ene|one|oate|ate|in|ate|ite|ase|ene)$/, "")
    .trim()
  if (stripped.length < 4) return null
  // Capitalize first letter — may match a genus
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

async function searchFungiForCompound(compoundName: string, limit: number): Promise<any[]> {
  const n = compoundName.toLowerCase().trim()

  // 1. Exact curated match
  let searchTerm: string | null = null
  for (const [key, genus] of Object.entries(COMPOUND_TO_FUNGI)) {
    if (n.includes(key) || key.includes(n)) {
      searchTerm = genus
      break
    }
  }

  // 2. Genus extraction fallback
  if (!searchTerm) {
    searchTerm = extractGenusFromCompound(compoundName)
    if (!searchTerm) return []
  }

  // 3. Search iNaturalist for the genus/species
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(searchTerm)}&rank=species,genus&per_page=${limit}&is_active=true&iconic_taxa=Fungi`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const results = (data.results || [])
      .filter((r: any) => r.iconic_taxon_name === "Fungi" || r.ancestor_ids?.includes(47170))
      .slice(0, limit)
      .map((r: any) => {
        const taxonomy: Record<string, string> = {
          kingdom: "Fungi", phylum: "", class: "", order: "", family: "", genus: "",
        }
        for (const a of r.ancestors || []) {
          const rank = (a.rank || "").toLowerCase()
          if (rank === "phylum") taxonomy.phylum = a.name
          else if (rank === "class") taxonomy.class = a.name
          else if (rank === "order") taxonomy.order = a.name
          else if (rank === "family") taxonomy.family = a.name
          else if (rank === "genus") taxonomy.genus = a.name
        }
        if (!taxonomy.genus && r.name?.includes(" ")) taxonomy.genus = r.name.split(" ")[0]

        return {
          id: `inat-${r.id}`,
          scientificName: r.name || "",
          commonName: r.preferred_common_name || r.name || "",
          taxonomy,
          description: r.wikipedia_summary?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
            || `A species that produces ${compoundName}`,
          photos: r.default_photo
            ? [{
                id: String(r.default_photo.id || r.id),
                url: r.default_photo.square_url || "",
                medium_url: r.default_photo.medium_url || r.default_photo.square_url || "",
                large_url: r.default_photo.large_url || r.default_photo.medium_url || "",
                attribution: r.default_photo.attribution || "iNaturalist",
              }]
            : [],
          observationCount: r.observations_count || 0,
          rank: r.rank || "species",
          // Mark as compound-derived so the widget can add context
          _source: "iNaturalist",
          _derivedFromCompound: compoundName,
        }
      })
    return results
  } catch {
    return []
  }
}

async function searchINaturalistLiveObservations(query: string, limit: number) {
  try {
    const params = new URLSearchParams({
      taxon_name: query,
      "has[]": "geo",
      per_page: String(limit),
      order: "desc",
      order_by: "observed_on",
      photos: "true",
      quality_grade: "research,needs_id",
    })
    const res = await fetch(`https://api.inaturalist.org/v1/observations?${params.toString()}`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((obs: any) => ({
      id: `inat-obs-${obs.id}`,
      species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown species",
      location: obs.place_guess || "Unknown location",
      date: obs.observed_on || obs.created_at?.split("T")?.[0] || "",
      imageUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
      lat: obs.geojson?.coordinates?.[1],
      lng: obs.geojson?.coordinates?.[0],
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Research papers from OpenAlex (additive when MINDEX research is empty)
// ---------------------------------------------------------------------------

// Use CrossRef API (highly reliable, free, no API key needed)
async function searchCrossRefResearch(query: string, limit: number) {
  try {
    const searchQuery = `${query} fungi mushroom`
    const res = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&rows=${limit}&sort=relevance&filter=type:journal-article`,
      { 
        signal: AbortSignal.timeout(8000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mycosoft/1.0 (https://mycosoft.com; mailto:dev@mycosoft.org)'
        }
      }
    )
    if (!res.ok) {
      console.error(`CrossRef API error: ${res.status}`)
      return []
    }
    const data = await res.json()
    const items = data?.message?.items || []
    return items.slice(0, limit).map((w: any) => ({
      id: w.DOI || `crossref-${Math.random().toString(36).slice(2)}`,
      title: Array.isArray(w.title) ? w.title[0] : (w.title || ""),
      authors: (w.author || []).slice(0, 5).map((a: any) => 
        a.given && a.family ? `${a.given} ${a.family}` : (a.name || "Unknown")
      ),
      journal: w["container-title"]?.[0] || w.publisher || "",
      year: w["published-print"]?.["date-parts"]?.[0]?.[0] || 
            w["published-online"]?.["date-parts"]?.[0]?.[0] || 
            w.created?.["date-parts"]?.[0]?.[0] || 0,
      citationCount: w["is-referenced-by-count"] || 0,
      doi: w.DOI || "",
      url: w.URL || (w.DOI ? `https://doi.org/${w.DOI}` : ""),
      abstract: w.abstract?.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 300) || "",
      relatedSpecies: [],
      _source: "CrossRef",
    }))
  } catch (error) {
    console.error("CrossRef search error:", error)
    return []
  }
}

// ---------------------------------------------------------------------------
// NCBI E-utilities direct genetics search (fallback when MINDEX has no genetics)
// ---------------------------------------------------------------------------

function _extractGeneRegion(title: string): string {
  const m = title.match(/\b(ITS[12]?|LSU|SSU|RPB[12]|TEF1|COI|18S|28S|5\.8S)\b/i)
  return m ? m[1].toUpperCase() : ""
}

async function searchNCBIGenetics(query: string, limit: number): Promise<any[]> {
  try {
    const term = `${query}[Organism] AND fungi[filter]`
    const esearchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nucleotide&term=${encodeURIComponent(term)}&retmax=${limit}&retmode=json`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" },
      }
    )
    if (!esearchRes.ok) return []
    const esearchData = await esearchRes.json()
    const ids: string[] = esearchData.esearchresult?.idlist || []
    if (!ids.length) return []

    // Wait for NCBI rate limit (3 req/s without API key)
    await new Promise((r) => setTimeout(r, 350))

    const esummaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=nucleotide&id=${ids.join(",")}&retmode=json`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" },
      }
    )
    if (!esummaryRes.ok) return []
    const esummaryData = await esummaryRes.json()
    const uids: string[] = esummaryData.result?.uids || []

    return uids.slice(0, limit).map((uid: string) => {
      const item = esummaryData.result[uid] || {}
      const accession: string = item.accessionversion || item.caption || uid
      return {
        id: `ncbi-${uid}`,
        accession,
        speciesName: item.organism || query,
        geneRegion: _extractGeneRegion(item.title || ""),
        sequenceLength: parseInt(item.slen || "0", 10),
        gcContent: undefined,
        source: "GenBank",
        _source: "NCBI",
      }
    })
  } catch {
    return []
  }
}

// Fallback: OpenAlex API (may be slow/blocked in some networks)
async function searchOpenAlexResearch(query: string, limit: number) {
  try {
    const searchQuery = `${query} fungi mushroom`
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per_page=${limit}&sort=cited_by_count:desc`,
      { 
        signal: AbortSignal.timeout(5000), // Shorter timeout since it's a fallback
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mycosoft (https://mycosoft.com; mailto:dev@mycosoft.org)'
        }
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).slice(0, limit).map((w: any) => ({
      id: w.id || `oalex-${Math.random().toString(36).slice(2)}`,
      title: w.title || "",
      authors: (w.authorships || []).slice(0, 5).map((a: any) => a.author?.display_name || "Unknown"),
      journal: w.primary_location?.source?.display_name || w.host_venue?.display_name || "",
      year: w.publication_year || 0,
      citationCount: w.cited_by_count || 0,
      doi: (w.doi || "").replace("https://doi.org/", ""),
      url: w.doi || w.id || "",
      abstract: w.abstract_inverted_index
        ? reconstructAbstractText(w.abstract_inverted_index)
        : "",
      relatedSpecies: [],
      _source: "OpenAlex",
    }))
  } catch (error) {
    // Silent fail - CrossRef is primary
    return []
  }
}

// Helper to reconstruct abstract from OpenAlex inverted index
function reconstructAbstractText(invertedIndex: Record<string, number[]>): string {
  if (!invertedIndex || typeof invertedIndex !== 'object') return ""
  try {
    const words: [string, number][] = []
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words.push([word, pos])
      }
    }
    words.sort((a, b) => a[1] - b[1])
    const text = words.map(w => w[0]).join(' ')
    return text.length > 300 ? text.slice(0, 300) + '...' : text
  } catch {
    return ""
  }
}

// ---------------------------------------------------------------------------
// AI answer
// ---------------------------------------------------------------------------

async function getAIAnswer(query: string, origin: string) {
  try {
    const res = await fetch(`${origin}/api/search/ai?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return undefined
    const data = await res.json()
    if (!data?.result?.answer) return undefined
    return {
      text: data.result.answer,
      confidence: data.result.confidence || 0.8,
      sources: [data.result.source || "ai"],
    }
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateSpecies(primary: any[], secondary: any[]): any[] {
  const seen = new Set<string>()
  const results: any[] = []

  // MINDEX results first (primary)
  for (const item of primary) {
    const key = (item.scientificName || "").toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      results.push(item)
    }
  }

  // iNaturalist additions (secondary -- only if not already in MINDEX)
  for (const item of secondary) {
    const key = (item.scientificName || "").toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      results.push(item)
    }
  }

  return results
}

function ensureUniqueIds(arr: any[], prefix: string): any[] {
  const seen = new Set<string>()
  let counter = 0
  return arr
    .map((item) => {
      if (!item.id) item.id = `${prefix}-${item.scientificName || item.name || ++counter}`
      return item
    })
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const startTime = performance.now()

  const { searchParams } = request.nextUrl
  const query = searchParams.get("q")?.trim()
  const typesStr = searchParams.get("types") || "species,compounds,genetics,research"
  const types = typesStr.split(",").map((t) => t.trim())
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
  const includeAI = searchParams.get("ai") === "true"

  if (!query || query.length < 2) {
    return NextResponse.json({
      query: query || "",
      results: { species: [], compounds: [], genetics: [], research: [] },
      totalCount: 0,
      timing: { total: 0, mindex: 0 },
      source: "live",
    })
  }

  try {
    const mindexStart = performance.now()

    // Resolve scientific name + detect compound queries
    const scientificName = resolveScientificName(query)
    const queryLower = query.toLowerCase()
    const isKnownCompound = Object.keys(COMPOUND_TO_FUNGI).some(k => queryLower.includes(k) || k.includes(queryLower))

    // Run ALL searches in parallel — species, compounds, genetics simultaneously
    const [
      mindexResults,
      mindexResearch,
      inatSpecies,
      liveResults,
      crossRefResearch,
      openAlexResearch,
      ncbiSequencesRaw,        // generic NCBI (works for species name queries)
      speciesGeneticsRaw,      // targeted NCBI by resolved scientific name
      speciesCompoundsRaw,     // PubChem compounds for this specific species
      compoundFungiRaw,        // fungi that produce this compound (for compound queries)
      aiAnswer,
    ] = await Promise.all([
      searchMindexUnified(query, limit),
      types.includes("research") ? searchMindexResearch(query, limit) : Promise.resolve([]),
      types.includes("species") ? searchINaturalist(query, Math.min(limit, 10)) : Promise.resolve([]),
      types.includes("species") ? searchINaturalistLiveObservations(query, Math.min(limit, 12)) : Promise.resolve([]),
      types.includes("research") ? searchCrossRefResearch(query, limit) : Promise.resolve([]),
      types.includes("research") ? searchOpenAlexResearch(query, Math.min(limit, 5)) : Promise.resolve([]),
      // Generic NCBI genetics (works for scientific name queries like "Amanita muscaria")
      types.includes("genetics") ? searchNCBIGenetics(query, Math.min(limit, 8)) : Promise.resolve([]),
      // Targeted genetics: when "Reishi" → search "Ganoderma lucidum[Organism] AND ITS[Gene]"
      (types.includes("genetics") && scientificName)
        ? searchGeneticsForSpecies(scientificName, Math.min(limit, 8))
        : Promise.resolve([]),
      // Species-specific compounds: "Reishi" → ganoderic acid, lucidenic acid from PubChem
      (types.includes("compounds") && (scientificName || getCompoundNamesForSpecies(query).length > 0))
        ? searchCompoundsForSpecies(query, scientificName)
        : Promise.resolve([]),
      // Compound→fungi: for "psilocybin" → Psilocybe species
      types.includes("species")
        ? searchFungiForCompound(query, Math.min(limit, 8))
        : Promise.resolve([]),
      includeAI ? getAIAnswer(query, new URL(request.url).origin) : Promise.resolve(undefined),
    ])

    // Merge NCBI sequences: generic + species-targeted (deduplicate by accession)
    const ncbiSeqMap = new Map<string, any>()
    for (const s of [...(speciesGeneticsRaw || []), ...(ncbiSequencesRaw || [])]) {
      if (s.accession && !ncbiSeqMap.has(s.accession)) ncbiSeqMap.set(s.accession, s)
    }
    const ncbiSequences: any[] = Array.from(ncbiSeqMap.values())

    // Transform MINDEX results to website format
    const mindexSpecies = await transformMindexTaxa(mindexResults.taxa)
    const mindexCompounds = await transformMindexCompounds(mindexResults.compounds)
    const mindexSequences = await transformMindexGenetics(mindexResults.genetics)

    const mindexTime = performance.now() - mindexStart

    // Build a map of NCBI data keyed by numeric UID (accession without version suffix)
    // so we can enrich MINDEX records that are missing gene/length metadata.
    const ncbiByAccNum = new Map<string, any>()
    for (const n of ncbiSequences) {
      // ncbi id is `ncbi-{uid}` — strip prefix to get raw UID
      const uid = String(n.id).replace(/^ncbi-/, "")
      ncbiByAccNum.set(uid, n)
      if (n.accession) ncbiByAccNum.set(n.accession.replace(/\.\d+$/, ""), n)
    }

    // Enrich MINDEX genetics records from NCBI where fields are missing
    const enrichedMindex = mindexSequences.map((m: any) => {
      const needsEnrich = !m.geneRegion && !m.sequenceLength
      if (!needsEnrich) return m
      // Try to find matching NCBI record by accession number (strip .version)
      const accBase = m.accession?.replace(/\.\d+$/, "") || ""
      const ncbi = ncbiByAccNum.get(m.accession) || ncbiByAccNum.get(accBase)
      if (!ncbi) return m
      return {
        ...m,
        geneRegion: ncbi.geneRegion || m.geneRegion,
        sequenceLength: ncbi.sequenceLength || m.sequenceLength,
      }
    })

    // Merge: MINDEX primary (enriched), iNaturalist secondary
    // Use pre-fetched compound-fungi results if species is empty (ran in parallel)
    const compoundFungi: any[] = compoundFungiRaw || []
    const inatSpeciesAll = inatSpecies.length > 0 || mindexSpecies.length > 0
      ? inatSpecies
      : compoundFungi  // Use compound-derived fungi when no direct species match

    const species = ensureUniqueIds(
      deduplicateSpecies(mindexSpecies, inatSpeciesAll),
      "sp"
    ).slice(0, limit)

    // Merge compounds: MINDEX first, then species-specific from PubChem, then NCBI-derived
    const speciesCompounds: any[] = speciesCompoundsRaw || []
    const mindexCompoundNames = new Set(mindexCompounds.map((c: any) => (c.name || "").toLowerCase()))
    // Only add species compounds not already present from MINDEX
    const newSpeciesCompounds = speciesCompounds.filter(
      (c: any) => !mindexCompoundNames.has((c.name || "").toLowerCase())
    )
    let compounds = ensureUniqueIds(
      [...mindexCompounds, ...newSpeciesCompounds],
      "cmp"
    ).slice(0, limit)

    // When this was a compound query (e.g. "Ganodermic acid"), attach compoundFungi as sourceSpecies
    // so Chemistry widget shows "Found In — Ganoderma lucidum, etc."
    if (compoundFungi.length > 0 && compounds.length > 0) {
      const fungiNames = compoundFungi.map((f: any) => f.scientificName).filter(Boolean)
      compounds = compounds.map((c: any) => ({
        ...c,
        sourceSpecies: (c.sourceSpecies?.length ? c.sourceSpecies : fungiNames) as string[],
      }))
    }

    // Genetics: NCBI results come first (they have geneRegion + sequenceLength populated).
    // MINDEX records with incomplete metadata are appended only if not already represented.
    const ncbiAccSet = new Set(ncbiSequences.map((n: any) => n.accession).filter(Boolean))
    const mindexNotInNcbi = enrichedMindex.filter((m: any) => !ncbiAccSet.has(m.accession))
    const genetics = ensureUniqueIds([...ncbiSequences, ...mindexNotInNcbi], "gen").slice(0, limit)

    // Research: MINDEX first, CrossRef primary, OpenAlex additive
    const allResearch = [...mindexResearch, ...crossRefResearch, ...openAlexResearch]
    const research = ensureUniqueIds(allResearch, "res").slice(0, limit)

    const totalCount = species.length + compounds.length + genetics.length + research.length

    // ── MINDEX auto-store: fire-and-forget background ingestion for EVERYTHING ──
    // This ensures every search result gets stored in MINDEX so future searches
    // hit the DB instead of external APIs.
    const origin = new URL(request.url).origin

    // 1. Species (from iNaturalist and compound-derived fungi)
    const speciesToIngest = species
      .filter((s: any) => String(s.id).startsWith("inat-"))
      .map((s: any) => ({ id: String(s.id), name: s.scientificName }))
      .slice(0, 15)
    if (speciesToIngest.length > 0) {
      void fetch(`${origin}/api/mindex/species/ingest-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: speciesToIngest }),
      }).catch(() => {})
    }

    // 2. Genetics (NCBI accessions)
    const accessionsToPrime = genetics
      .map((g: any) => g.accession)
      .filter((a: string) => !!a)
      .slice(0, 10)
    if (accessionsToPrime.length > 0) {
      void fetch(`${origin}/api/mindex/genetics/ingest-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessions: accessionsToPrime }),
      }).catch(() => {})
    }

    // 3. Compounds from PubChem — store any external-source compounds in MINDEX
    //    so next search for "psilocybin" hits DB directly
    const compoundsToStore = compounds.filter((c: any) => c._source === "MINDEX" ? false : true)
    for (const c of compoundsToStore.slice(0, 5)) {
      void fetch(`${origin}/api/mindex/compounds/detail?name=${encodeURIComponent(c.name)}`, {
        cache: "no-store",
      }).catch(() => {})  // hitting detail triggers storeCompoundInBackground inside the route
    }

    // 4. Compound→species relationships: if this was a compound search that
    //    resolved producing-fungi, store that relationship so MINDEX knows
    //    "psilocybin → Psilocybe" for future queries.
    if (compoundFungi.length > 0 && compounds.length > 0) {
      const compoundName = compounds[0]?.name || query
      void fetch(`${origin}/api/mindex/compounds/detail?name=${encodeURIComponent(compoundName)}`, {
        cache: "no-store",
      }).catch(() => {})
    }

    return NextResponse.json(
      {
        query,
        results: { species, compounds, genetics, research },
        totalCount,
        timing: {
          total: Math.round(performance.now() - startTime),
          mindex: Math.round(mindexTime),
        },
        source: "live",
        live_results: liveResults,
        research_sources: {
          mindex: mindexResearch.length > 0,
          crossref: crossRefResearch.length > 0,
          openalex: openAlexResearch.length > 0,
          mindex_note: mindexResearch.length === 0 
            ? "MINDEX research endpoint pending implementation. Using CrossRef and OpenAlex." 
            : undefined,
        },
        ...(aiAnswer ? { aiAnswer } : {}),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("Unified search error:", error)
    return NextResponse.json(
      {
        query,
        results: { species: [], compounds: [], genetics: [], research: [] },
        totalCount: 0,
        timing: { total: Math.round(performance.now() - startTime), mindex: 0 },
        source: "fallback",
        error: "Search service temporarily unavailable",
      },
      { status: 200 }
    )
  }
}
