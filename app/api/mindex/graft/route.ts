/**
 * Data Grafting API
 * 
 * Automatically ingests external data found during search into MINDEX.
 * This ensures that any new information discovered (from iNaturalist, LLM, etc.)
 * is stored in MINDEX for faster future retrieval.
 * 
 * Grafting process:
 * 1. Validate incoming data
 * 2. Transform to MINDEX schema
 * 3. Check for duplicates
 * 4. Insert/update in MINDEX
 * 5. Log for audit
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 15

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

// =============================================================================
// TYPES
// =============================================================================

interface GraftRequest {
  source: "inaturalist" | "openalex" | "wikipedia" | "llm" | "gbif" | "chemspider" | "user"
  dataType: "taxon" | "observation" | "compound" | "research" | "image"
  data: Record<string, unknown>
  confidence: number // 0-1
  dedupe?: boolean // Default true - check for existing records
}

interface GraftResult {
  success: boolean
  grafted: boolean // Was data actually inserted (false if duplicate)
  recordId?: string
  message: string
  dedupeMatch?: string // ID of matching existing record
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateTaxonData(data: Record<string, unknown>): boolean {
  return !!(data.scientific_name || data.scientificName || data.canonical_name)
}

function validateObservationData(data: Record<string, unknown>): boolean {
  return !!(data.taxon_name || data.taxonName || data.species) && 
         !!(data.lat || data.latitude) && 
         !!(data.lng || data.longitude)
}

function validateCompoundData(data: Record<string, unknown>): boolean {
  return !!(data.name || data.formula)
}

function validateResearchData(data: Record<string, unknown>): boolean {
  return !!(data.title) && !!(data.doi || data.url || data.source)
}

function validateData(dataType: string, data: Record<string, unknown>): boolean {
  switch (dataType) {
    case "taxon": return validateTaxonData(data)
    case "observation": return validateObservationData(data)
    case "compound": return validateCompoundData(data)
    case "research": return validateResearchData(data)
    case "image": return !!(data.url) && !!(data.taxon_id || data.taxonId || data.species)
    default: return false
  }
}

// =============================================================================
// TRANSFORMATION
// =============================================================================

function transformTaxonData(data: Record<string, unknown>, source: string) {
  return {
    canonical_name: data.scientific_name || data.scientificName || data.canonical_name,
    common_name: data.common_name || data.commonName,
    rank: data.rank || "species",
    description: data.description || data.summary,
    source,
    external_id: data.id || data.externalId,
    metadata: {
      grafted: true,
      graft_source: source,
      graft_timestamp: new Date().toISOString(),
      original_data: data,
    },
  }
}

function transformObservationData(data: Record<string, unknown>, source: string) {
  return {
    taxon_name: data.taxon_name || data.taxonName || data.species,
    latitude: data.lat || data.latitude,
    longitude: data.lng || data.longitude,
    observed_at: data.observed_at || data.observedAt || data.date,
    location_name: data.location || data.place || data.location_name,
    quality_grade: data.quality_grade || data.quality || "needs_id",
    source,
    external_id: data.id || data.externalId,
    photo_url: data.photo_url || data.photoUrl || data.image,
    observer: data.observer || data.user,
    metadata: {
      grafted: true,
      graft_source: source,
      graft_timestamp: new Date().toISOString(),
    },
  }
}

function transformCompoundData(data: Record<string, unknown>, source: string) {
  return {
    name: data.name,
    formula: data.formula,
    molecular_weight: data.molecular_weight || data.molecularWeight,
    smiles: data.smiles,
    inchi: data.inchi,
    inchikey: data.inchikey || data.inchiKey,
    source,
    external_id: data.id || data.chemspider_id || data.pubchem_id,
    metadata: {
      grafted: true,
      graft_source: source,
      graft_timestamp: new Date().toISOString(),
    },
  }
}

function transformResearchData(data: Record<string, unknown>, source: string) {
  return {
    title: data.title,
    authors: data.authors,
    journal: data.journal,
    year: data.year,
    doi: data.doi,
    abstract: data.abstract,
    url: data.url,
    source,
    metadata: {
      grafted: true,
      graft_source: source,
      graft_timestamp: new Date().toISOString(),
    },
  }
}

function transformData(dataType: string, data: Record<string, unknown>, source: string): Record<string, unknown> {
  switch (dataType) {
    case "taxon": return transformTaxonData(data, source)
    case "observation": return transformObservationData(data, source)
    case "compound": return transformCompoundData(data, source)
    case "research": return transformResearchData(data, source)
    default: return { ...data, source, grafted: true }
  }
}

// =============================================================================
// MINDEX API CALLS
// =============================================================================

async function checkDuplicate(dataType: string, data: Record<string, unknown>): Promise<string | null> {
  try {
    let endpoint = ""
    let searchParam = ""

    switch (dataType) {
      case "taxon":
        endpoint = "/api/taxa"
        searchParam = `q=${encodeURIComponent(String(data.canonical_name))}&limit=1`
        break
      case "compound":
        endpoint = "/api/compounds"
        searchParam = `search=${encodeURIComponent(String(data.name))}&limit=1`
        break
      case "observation":
        // Check by external ID if available
        if (data.external_id) {
          endpoint = "/api/observations"
          searchParam = `external_id=${encodeURIComponent(String(data.external_id))}&limit=1`
        }
        break
      default:
        return null
    }

    if (!endpoint || !searchParam) return null

    const res = await fetch(`${MINDEX_API_URL}${endpoint}?${searchParam}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const result = await res.json()
    const items = result.data || result.results || result

    if (Array.isArray(items) && items.length > 0) {
      return items[0].id || items[0].uuid || null
    }

    return null
  } catch {
    return null
  }
}

async function insertToMindex(dataType: string, data: Record<string, unknown>): Promise<{ id?: string; error?: string }> {
  try {
    let endpoint = ""

    switch (dataType) {
      case "taxon":
        endpoint = "/api/taxa"
        break
      case "observation":
        endpoint = "/api/observations"
        break
      case "compound":
        endpoint = "/api/compounds"
        break
      case "research":
        // Research might go to a different endpoint
        endpoint = "/api/knowledge/research"
        break
      default:
        return { error: `Unsupported data type: ${dataType}` }
    }

    const res = await fetch(`${MINDEX_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return { error: `MINDEX API error: ${res.status} - ${errorText}` }
    }

    const result = await res.json()
    return { id: result.id || result.uuid || "grafted" }
  } catch (error) {
    return { error: `Failed to insert: ${error}` }
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  let body: GraftRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate required fields
  if (!body.source || !body.dataType || !body.data) {
    return NextResponse.json({
      success: false,
      grafted: false,
      message: "Missing required fields: source, dataType, data",
    }, { status: 400 })
  }

  // Validate confidence threshold
  const confidence = body.confidence ?? 0.5
  if (confidence < 0.3) {
    return NextResponse.json({
      success: false,
      grafted: false,
      message: "Confidence too low for grafting (minimum 0.3)",
    })
  }

  // Validate data structure
  if (!validateData(body.dataType, body.data)) {
    return NextResponse.json({
      success: false,
      grafted: false,
      message: `Invalid data structure for type: ${body.dataType}`,
    }, { status: 400 })
  }

  // Transform data to MINDEX schema
  const transformedData = transformData(body.dataType, body.data, body.source)

  // Check for duplicates (unless disabled)
  const shouldDedupe = body.dedupe !== false
  let dedupeMatch: string | null = null

  if (shouldDedupe) {
    dedupeMatch = await checkDuplicate(body.dataType, transformedData)
    if (dedupeMatch) {
      return NextResponse.json({
        success: true,
        grafted: false,
        dedupeMatch,
        message: `Duplicate found, skipping graft. Existing record: ${dedupeMatch}`,
      })
    }
  }

  // Insert into MINDEX
  const insertResult = await insertToMindex(body.dataType, transformedData)

  if (insertResult.error) {
    return NextResponse.json({
      success: false,
      grafted: false,
      message: insertResult.error,
    }, { status: 500 })
  }

  // Log successful graft (would go to audit log in production)
  console.log(`[GRAFT] ${body.dataType} from ${body.source}: ${insertResult.id}`)

  return NextResponse.json({
    success: true,
    grafted: true,
    recordId: insertResult.id,
    message: `Successfully grafted ${body.dataType} from ${body.source}`,
  })
}

/**
 * Batch graft multiple records
 */
export async function PUT(request: NextRequest) {
  let body: { items: GraftRequest[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({
      success: false,
      message: "No items to graft",
    }, { status: 400 })
  }

  // Limit batch size
  const items = body.items.slice(0, 50)
  const results: GraftResult[] = []
  let graftedCount = 0

  for (const item of items) {
    // Validate
    if (!item.source || !item.dataType || !item.data) {
      results.push({
        success: false,
        grafted: false,
        message: "Missing required fields",
      })
      continue
    }

    if (!validateData(item.dataType, item.data)) {
      results.push({
        success: false,
        grafted: false,
        message: `Invalid data structure for type: ${item.dataType}`,
      })
      continue
    }

    // Transform
    const transformed = transformData(item.dataType, item.data, item.source)

    // Check duplicate
    const existingId = await checkDuplicate(item.dataType, transformed)
    if (existingId) {
      results.push({
        success: true,
        grafted: false,
        dedupeMatch: existingId,
        message: "Duplicate found",
      })
      continue
    }

    // Insert
    const insertResult = await insertToMindex(item.dataType, transformed)
    if (insertResult.error) {
      results.push({
        success: false,
        grafted: false,
        message: insertResult.error,
      })
    } else {
      graftedCount++
      results.push({
        success: true,
        grafted: true,
        recordId: insertResult.id,
        message: "Grafted successfully",
      })
    }
  }

  return NextResponse.json({
    success: true,
    totalItems: items.length,
    graftedCount,
    results,
  })
}

/**
 * Get graft statistics
 */
export async function GET() {
  // In production, this would query MINDEX for grafted record stats
  return NextResponse.json({
    status: "active",
    supportedSources: ["inaturalist", "openalex", "wikipedia", "llm", "gbif", "chemspider", "user"],
    supportedTypes: ["taxon", "observation", "compound", "research", "image"],
    minConfidence: 0.3,
    maxBatchSize: 50,
  })
}
