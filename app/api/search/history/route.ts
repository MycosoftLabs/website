/**
 * Search History API - February 5, 2026
 * 
 * Get user's search history from memory
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  masServiceHeaders,
  resolveScopedUserId,
  resolveVerifiedIdentity,
} from '@/lib/auth/verified-identity';

const MAS_API_URL = process.env.MAS_API_URL || 'http://localhost:8001';

/**
 * GET /api/search/history
 * Get a user's search history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identity = await resolveVerifiedIdentity();
    const scopedUser = resolveScopedUserId(identity, searchParams.get('user_id'));
    const limit = searchParams.get('limit') || '10';

    if (scopedUser.denied) return scopedUser.denied;

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/history?user_id=${encodeURIComponent(scopedUser.userId)}&limit=${limit}`,
      { method: 'GET', headers: masServiceHeaders({}, identity) }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to get history: ${error}` },
        { status: response.status }
      );
    }

    const history = await response.json();
    return NextResponse.json(history);

  } catch (error) {
    console.error('Search history error:', error);
    return NextResponse.json(
      { error: 'Failed to get search history' },
      { status: 500 }
    );
  }
}
