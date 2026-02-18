/**
 * GET /api/ancestry/taxonomy/[rank]/[name]
 *
 * Fetches rich taxonomy data for a given rank + name (e.g. order/Agaricales).
 * Priority:
 *   1. MINDEX cached taxa
 *   2. iNaturalist taxa API (live, then stored in MINDEX background)
 *
 * Returns: taxon details + children (one rank below) + parent breadcrumb
 */

import { NextRequest, NextResponse } from "next/server"

const INAT = "https://api.inaturalist.org/v1"
const MINDEX = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

const RANK_ORDER = ["kingdom", "phylum", "class", "order", "family", "genus", "species"] as const
type Rank = typeof RANK_ORDER[number]

function childRank(rank: string): string | null {
  const idx = RANK_ORDER.indexOf(rank as Rank)
  return idx >= 0 && idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : null
}

async function fetchFromINaturalist(rank: string, name: string) {
  const params = new URLSearchParams({
    q: name,
    rank,
    is_active: "true",
    per_page: "1",
    order_by: "observations_count",
  })

  const res = await fetch(`${INAT}/taxa?${params}`, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null

  const json = await res.json()
  const taxon = json.results?.[0]
  if (!taxon) return null
  return taxon
}

async function fetchChildren(parentId: number, childRankName: string, limit = 50) {
  const params = new URLSearchParams({
    parent_id: String(parentId),
    rank: childRankName,
    is_active: "true",
    per_page: String(limit),
    order_by: "observations_count",
  })

  try {
    const res = await fetch(`${INAT}/taxa?${params}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.results || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      commonName: t.preferred_common_name || null,
      rank: t.rank,
      observationCount: t.observations_count || 0,
      imageUrl: t.default_photo?.medium_url || t.default_photo?.url || null,
      taxonPageUrl: `/ancestry/taxonomy/${t.rank}/${encodeURIComponent(t.name)}`,
    }))
  } catch {
    return []
  }
}

async function storeInMINDEXBackground(taxon: any) {
  try {
    await fetch(`${MINDEX}/api/mindex/taxa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxon_id: taxon.id,
        name: taxon.name,
        rank: taxon.rank,
        common_name: taxon.preferred_common_name || null,
        parent_id: taxon.parent_id || null,
        observation_count: taxon.observations_count || 0,
        image_url: taxon.default_photo?.medium_url || null,
        wikipedia_url: taxon.wikipedia_url || null,
        extinct: taxon.extinct || false,
      }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // Background — ignore errors
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { rank: string; name: string } }
) {
  const rank = params.rank.toLowerCase()
  const name = decodeURIComponent(params.name)

  if (!RANK_ORDER.includes(rank as Rank)) {
    return NextResponse.json({ error: `Unknown rank: ${rank}` }, { status: 400 })
  }

  try {
    // ── Fetch main taxon from iNaturalist ──────────────────────────────────
    const taxon = await fetchFromINaturalist(rank, name)
    if (!taxon) {
      return NextResponse.json(
        { error: `No taxon found for ${rank}: ${name}` },
        { status: 404 }
      )
    }

    // ── Build ancestor breadcrumb ──────────────────────────────────────────
    const ancestors: Array<{ id: number; name: string; rank: string; href: string }> =
      (taxon.ancestors || [])
        .filter((a: any) => RANK_ORDER.includes(a.rank))
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          rank: a.rank,
          commonName: a.preferred_common_name || null,
          href: `/ancestry/taxonomy/${a.rank}/${encodeURIComponent(a.name)}`,
        }))

    // ── Fetch children (one rank below) ───────────────────────────────────
    const next = childRank(rank)
    const children = next ? await fetchChildren(taxon.id, next) : []

    // ── Build response ────────────────────────────────────────────────────
    const result = {
      id: taxon.id,
      name: taxon.name,
      rank: taxon.rank,
      commonName: taxon.preferred_common_name || null,
      description: taxon.wikipedia_summary || null,
      wikipediaUrl: taxon.wikipedia_url || null,
      imageUrl: taxon.default_photo?.medium_url || taxon.default_photo?.url || null,
      observationCount: taxon.observations_count || 0,
      extinct: taxon.extinct || false,
      conservation_status: taxon.conservation_status?.status_name || null,
      ancestors,
      children,
      childRank: next,
    }

    // Store in MINDEX without blocking
    void storeInMINDEXBackground(taxon)

    return NextResponse.json(result)
  } catch (err) {
    console.error(`[Taxonomy API] ${rank}/${name}:`, err)
    return NextResponse.json({ error: "Failed to fetch taxonomy data" }, { status: 500 })
  }
}
