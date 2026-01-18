/**
 * API Route: Semantic Search with Vector Embeddings
 * 
 * Performs semantic search using Supabase pgvector
 */

import { NextRequest, NextResponse } from 'next/server'
import { semanticSearch } from '@/lib/supabase/embeddings'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { query, table = 'documents', limit = 10, threshold = 0.7 } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      )
    }

    const results = await semanticSearch(table as 'documents' | 'species', query, limit, threshold)

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const table = searchParams.get('table') || 'documents'
  const limit = parseInt(searchParams.get('limit') || '10')
  const threshold = parseFloat(searchParams.get('threshold') || '0.7')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    const results = await semanticSearch(table as 'documents' | 'species', query, limit, threshold)

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
