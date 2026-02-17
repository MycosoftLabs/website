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
      { signal: AbortSignal.timeout(10000) }
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
    molecularWeight: c.molecular_weight || 0,
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
      .map((r: any) => ({
        id: `inat-${r.id}`,
        scientificName: r.name || "",
        commonName: r.preferred_common_name || r.name || "",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "",
          class: "",
          order: "",
          family: "",
          genus: "",
        },
        description: r.wikipedia_summary || `A species of fungus (${r.name})`,
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
      }))
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
      signal: AbortSignal.timeout(5000),
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

    // Run MINDEX unified search + iNaturalist + CrossRef (primary) + OpenAlex (fallback) in parallel
    const [
      mindexResults,
      mindexResearch,
      inatSpecies,
      liveResults,
      crossRefResearch,
      openAlexResearch,
      aiAnswer,
    ] = await Promise.all([
      searchMindexUnified(query, limit),
      types.includes("research") ? searchMindexResearch(query, limit) : Promise.resolve([]),
      types.includes("species") ? searchINaturalist(query, Math.min(limit, 10)) : Promise.resolve([]),
      types.includes("species") ? searchINaturalistLiveObservations(query, Math.min(limit, 12)) : Promise.resolve([]),
      types.includes("research") ? searchCrossRefResearch(query, limit) : Promise.resolve([]),
      types.includes("research") ? searchOpenAlexResearch(query, Math.min(limit, 5)) : Promise.resolve([]), // OpenAlex as fallback with lower limit
      includeAI ? getAIAnswer(query, new URL(request.url).origin) : Promise.resolve(undefined),
    ])

    // Transform MINDEX results to website format
    const mindexSpecies = await transformMindexTaxa(mindexResults.taxa)
    const mindexCompounds = await transformMindexCompounds(mindexResults.compounds)
    const mindexSequences = await transformMindexGenetics(mindexResults.genetics)

    // NCBI genetics: always run so we have geneRegion + sequenceLength.
    // MINDEX records often have gene=null and sequence_length=0 (DB not fully populated).
    // NCBI esummary fills those fields reliably from live NCBI data.
    const ncbiSequences = types.includes("genetics")
      ? await searchNCBIGenetics(query, Math.min(limit, 10))
      : []

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
    const species = ensureUniqueIds(
      deduplicateSpecies(mindexSpecies, inatSpecies),
      "sp"
    ).slice(0, limit)

    const compounds = ensureUniqueIds(mindexCompounds, "cmp").slice(0, limit)

    // Genetics: NCBI results come first (they have geneRegion + sequenceLength populated).
    // MINDEX records with incomplete metadata are appended only if not already represented.
    const ncbiAccSet = new Set(ncbiSequences.map((n: any) => n.accession).filter(Boolean))
    const mindexNotInNcbi = enrichedMindex.filter((m: any) => !ncbiAccSet.has(m.accession))
    const genetics = ensureUniqueIds([...ncbiSequences, ...mindexNotInNcbi], "gen").slice(0, limit)

    // Research: MINDEX first, CrossRef primary, OpenAlex additive
    const allResearch = [...mindexResearch, ...crossRefResearch, ...openAlexResearch]
    const research = ensureUniqueIds(allResearch, "res").slice(0, limit)

    const totalCount = species.length + compounds.length + genetics.length + research.length

    // Background ingest: store all returned genetics accessions in MINDEX so
    // future detail lookups are instant. Fire-and-forget, never blocks response.
    const accessionsToPrime = genetics
      .map((g: any) => g.accession)
      .filter((a: string) => !!a)
      .slice(0, 10)
    if (accessionsToPrime.length > 0) {
      const origin = new URL(request.url).origin
      void fetch(`${origin}/api/mindex/genetics/ingest-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessions: accessionsToPrime }),
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
