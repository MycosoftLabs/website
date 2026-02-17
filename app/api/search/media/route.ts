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

async function searchTMDB(query: string, limit: number): Promise<{ results: MediaResult[], error?: string }> {
  if (!TMDB_API_KEY) {
    return { results: [], error: "TMDB_API_KEY not configured" }
  }
  
  try {
    // Use query directly - TMDB works better with simple queries
    const searchTerms = query
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerms)}&include_adult=false`
    
    console.log('[Media API] Fetching TMDB:', searchTerms)
    
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(10000),  // Increase timeout to 10s
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Media API] TMDB error:', res.status, errorText)
      return { results: [], error: `TMDB API error: ${res.status}` }
    }
    
    const data = await res.json()
    console.log('[Media API] TMDB raw results:', data.results?.length || 0)
    
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
    
    return { results }
  } catch (err: any) {
    console.error('[Media API] TMDB fetch error:', err.message)
    return { results: [], error: `Fetch failed: ${err.message}` }
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "fungi"
  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(parseInt(limitParam || "10"), 20)
  
  const { results, error } = await searchTMDB(query, limit)
  
  return NextResponse.json({
    query,
    results,
    total: results.length,
    source: "TMDB",
    error: error,
    timestamp: new Date().toISOString(),
  })
}
