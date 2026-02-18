/**
 * Species Background Ingest API - Feb 2026
 *
 * POST { species: Array<{ id: string; name: string }> }
 *
 * Accepts species results from a search and fetches full data for each one
 * from iNaturalist (taxonomy, photos, description, ancestors), then stores in
 * MINDEX. Fire-and-forget — responds immediately with { queued: N }.
 *
 * Called automatically by the unified search after every species search result,
 * so that every species a user sees eventually has full cached detail.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")
const MINDEX_TAXA = `${MINDEX_API_URL}/api/mindex/taxa`
const INAT_BASE = "https://api.inaturalist.org/v1"
const INAT_HEADERS = { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" }

const mindexHeaders = () => ({
  "X-API-Key": env.mindexApiKey || "",
  "Content-Type": "application/json",
})

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)) }

function parseTaxonomy(ancestors: any[], taxonName: string) {
  const t: Record<string, string | null> = {
    kingdom: "Fungi", phylum: null, class: null, order: null, family: null, genus: null,
  }
  for (const a of ancestors || []) {
    const rank = (a.rank || "").toLowerCase()
    if (rank === "phylum") t.phylum = a.name
    else if (rank === "class") t.class = a.name
    else if (rank === "order") t.order = a.name
    else if (rank === "family") t.family = a.name
    else if (rank === "genus") t.genus = a.name
  }
  if (!t.genus && taxonName?.includes(" ")) t.genus = taxonName.split(" ")[0]
  return t
}

async function ingestOneSpecies(inatId: number, scientificName: string): Promise<void> {
  try {
    // Fetch full taxon data with ancestors and photos
    const res = await fetch(
      `${INAT_BASE}/taxa/${inatId}?include=ancestors`,
      { signal: AbortSignal.timeout(12000), headers: INAT_HEADERS }
    )
    if (!res.ok) return
    const d = await res.json()
    const taxon = d?.results?.[0]
    if (!taxon) return

    const taxonomy = parseTaxonomy(taxon.ancestors || [], taxon.name)
    const photo = taxon.taxon_photos?.[0]?.photo || taxon.default_photo
    const description = taxon.wikipedia_summary
      ? taxon.wikipedia_summary.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : null

    // Try to store in MINDEX (409 on duplicate — safe to ignore)
    await fetch(MINDEX_TAXA, {
      method: "POST",
      headers: mindexHeaders(),
      body: JSON.stringify({
        scientific_name: taxon.name,
        common_name: taxon.preferred_common_name || null,
        rank: taxon.rank || "species",
        description,
        image_url: photo?.medium_url || photo?.square_url || null,
        observation_count: taxon.observations_count || 0,
        taxonomy_json: JSON.stringify(taxonomy),
        inat_id: inatId,
        wikipedia_url: taxon.wikipedia_url || null,
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })
  } catch { /* silent — background work */ }
}

async function processSpecies(speciesList: Array<{ id: string; name: string }>) {
  for (const sp of speciesList) {
    const inatMatch = String(sp.id).match(/^inat-(\d+)$/)
    const inatId = inatMatch ? parseInt(inatMatch[1]) : null
    if (!inatId) continue

    try {
      await ingestOneSpecies(inatId, sp.name)
      await delay(300) // polite delay between iNaturalist requests
    } catch { /* never block the loop */ }
  }
}

export async function POST(request: NextRequest) {
  let body: { species?: Array<{ id: string; name: string }> }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const speciesList = (body.species || []).slice(0, 15)
  if (!speciesList.length) return NextResponse.json({ queued: 0 })

  void processSpecies(speciesList)
  return NextResponse.json({ queued: speciesList.length, status: "processing" })
}
