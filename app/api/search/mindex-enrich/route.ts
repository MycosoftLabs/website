/**
 * MINDEX Enrichment API - February 5, 2026
 * 
 * Enriches MINDEX database with search data:
 * - Records user interest in taxa from search
 * - Tracks query analytics
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.187:8000';

interface EnrichRequest {
  query: string;
  user_id: string;
  taxon_ids?: number[];
}

/**
 * POST /api/search/mindex-enrich
 * Enrich MINDEX with search query and results
 */
export async function POST(request: NextRequest) {
  try {
    const body: EnrichRequest = await request.json();

    if (!body.query || !body.user_id) {
      return NextResponse.json(
        { error: 'query and user_id are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/enrich`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: body.query,
          user_id: body.user_id,
          taxon_ids: body.taxon_ids || [],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('MINDEX enrichment failed:', error);
      // Don't fail the request, just log the error
      return NextResponse.json({
        success: false,
        error: 'Enrichment failed but search continues',
      });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('MINDEX enrichment error:', error);
    // Don't fail the search due to enrichment issues
    return NextResponse.json({
      success: false,
      error: 'Enrichment unavailable',
    });
  }
}
