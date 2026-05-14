/**
 * MINDEX Enrichment API - February 5, 2026
 * 
 * Enriches MINDEX database with search data:
 * - Records user interest in taxa from search
 * - Tracks query analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { masServiceHeaders, resolveVerifiedIdentity } from '@/lib/auth/verified-identity';

const MAS_API_URL = process.env.MAS_API_URL || 'http://localhost:8001';

interface EnrichRequest {
  query: string;
  user_id?: string;
  taxon_ids?: number[];
}

/**
 * POST /api/search/mindex-enrich
 * Enrich MINDEX with search query and results
 */
export async function POST(request: NextRequest) {
  try {
    const body: EnrichRequest = await request.json();
    const identity = await resolveVerifiedIdentity();

    if (!body.query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/enrich`,
      {
        method: 'POST',
        headers: masServiceHeaders({
          'Content-Type': 'application/json',
        }, identity),
        body: JSON.stringify({
          query: body.query,
          user_id: identity.userId,
          auth_trust_level: identity.authTrustLevel,
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
