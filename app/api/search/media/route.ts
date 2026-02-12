/**
 * Media Search API Route - Feb 2026
 * 
 * Searches for fungi-related documentaries, movies, and TV shows.
 * Real-data only: TMDB API results, no curated/mock fallback.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TMDB_API_KEY = process.env.TMDB_API_KEY

interface MediaResult {
  id: string
  title: string
  type: "movie" | "tv" | "documentary"
  year: number
  rating: number
  posterUrl: string | null
  overview: string
  source: string
}

async function searchTMDB(query: string, limit: number): Promise<MediaResult[]> {
  if (!TMDB_API_KEY) return []
  
  try {
    // Search for multi (movies + TV) with fungi/mushroom keywords
    const searchTerms = `${query} fungi mushroom`
    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerms)}&include_adult=false`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    const results: MediaResult[] = (data.results || [])
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, limit)
      .map((item: any) => ({
        id: `tmdb-${item.id}`,
        title: item.title || item.name || "",
        type: item.media_type === "movie" ? "movie" : "tv",
        year: parseInt((item.release_date || item.first_air_date || "0").substring(0, 4)) || 0,
        rating: item.vote_average || 0,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        overview: item.overview || "",
        source: "TMDB",
      }))
    
    return results
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "fungi"
  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(parseInt(limitParam || "10"), 20)
  
  const results = await searchTMDB(query, limit)
  
  return NextResponse.json({
    query,
    results,
    total: results.length,
    source: "TMDB",
    message: TMDB_API_KEY ? undefined : "TMDB_API_KEY not configured",
    timestamp: new Date().toISOString(),
  })
}
