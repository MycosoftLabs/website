/**
 * Search History API - February 5, 2026
 * 
 * Get user's search history from memory
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.187:8000';

/**
 * GET /api/search/history
 * Get a user's search history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = searchParams.get('limit') || '10';

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/history?user_id=${encodeURIComponent(userId)}&limit=${limit}`,
      { method: 'GET' }
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
