/**
 * Location Search API Route - Feb 2026
 * 
 * Returns observation locations for searched species.
 * Uses iNaturalist API for real-time observation data with geolocation.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface LocationResult {
  id: string
  speciesName: string
  commonName: string
  lat: number
  lng: number
  observedAt: string
  imageUrl: string | null
  isToxic: boolean
  placeName: string
  source: string
}

async function searchINaturalistObservations(query: string, limit: number): Promise<LocationResult[]> {
  try {
    // First get taxon ID for the query
    const taxonRes = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&rank=species,genus&iconic_taxa=Fungi&per_page=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    if (!taxonRes.ok) return []
    const taxonData = await taxonRes.json()
    
    if (!taxonData.results?.[0]?.id) {
      // If no specific taxon found, search general fungi observations
      return await searchGeneralFungiObservations(query, limit)
    }
    
    const taxonId = taxonData.results[0].id
    const taxonName = taxonData.results[0].name
    const commonName = taxonData.results[0].preferred_common_name || taxonName
    
    // Now get observations for this taxon with geo data
    const obsRes = await fetch(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&has[]=geo&per_page=${limit}&order=desc&order_by=observed_on`,
      { signal: AbortSignal.timeout(8000) }
    )
    
    if (!obsRes.ok) return []
    const obsData = await obsRes.json()
    
    return (obsData.results || []).map((obs: any) => ({
      id: `inat-obs-${obs.id}`,
      speciesName: obs.taxon?.name || taxonName,
      commonName: obs.taxon?.preferred_common_name || commonName,
      lat: obs.geojson?.coordinates?.[1] || obs.location?.split(",")[0] || 0,
      lng: obs.geojson?.coordinates?.[0] || obs.location?.split(",")[1] || 0,
      observedAt: obs.observed_on || obs.created_at || new Date().toISOString(),
      imageUrl: obs.photos?.[0]?.url?.replace("square", "medium") || null,
      isToxic: false, // Would need toxicity database to determine
      placeName: obs.place_guess || "Unknown location",
      source: "iNaturalist",
    }))
  } catch (error) {
    console.error("iNaturalist location search error:", error)
    return []
  }
}

async function searchGeneralFungiObservations(query: string, limit: number): Promise<LocationResult[]> {
  try {
    // Search observations with text query in the fungi iconic taxon
    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?q=${encodeURIComponent(query)}&iconic_taxa=Fungi&has[]=geo&per_page=${limit}&order=desc&order_by=observed_on`,
      { signal: AbortSignal.timeout(8000) }
    )
    
    if (!res.ok) return []
    const data = await res.json()
    
    return (data.results || []).map((obs: any) => ({
      id: `inat-obs-${obs.id}`,
      speciesName: obs.taxon?.name || "Unknown species",
      commonName: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
      lat: obs.geojson?.coordinates?.[1] || 0,
      lng: obs.geojson?.coordinates?.[0] || 0,
      observedAt: obs.observed_on || obs.created_at || new Date().toISOString(),
      imageUrl: obs.photos?.[0]?.url?.replace("square", "medium") || null,
      isToxic: false,
      placeName: obs.place_guess || "Unknown location",
      source: "iNaturalist",
    }))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "fungi"
  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(parseInt(limitParam || "20"), 50)
  
  const results = await searchINaturalistObservations(query, limit)
  
  // Calculate bounding box for map display
  let bounds = null
  if (results.length > 0) {
    const lats = results.map((r) => r.lat).filter((l) => l !== 0)
    const lngs = results.map((r) => r.lng).filter((l) => l !== 0)
    if (lats.length > 0 && lngs.length > 0) {
      bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      }
    }
  }
  
  return NextResponse.json({
    query,
    results,
    total: results.length,
    bounds,
    source: "iNaturalist",
    timestamp: new Date().toISOString(),
  })
}
