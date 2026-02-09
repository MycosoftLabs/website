/**
 * Search Memory API - February 5, 2026
 * 
 * Main search memory endpoints for:
 * - Starting/managing search sessions
 * - Recording queries and interactions
 * - Getting session context
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';

/**
 * POST /api/search/memory
 * Start a new search session or get existing one
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    let endpoint = '/api/search/memory';
    let method = 'POST';

    switch (action) {
      case 'start':
        endpoint = '/api/search/memory/start';
        break;
      case 'query':
        endpoint = '/api/search/memory/query';
        break;
      case 'focus':
        endpoint = '/api/search/memory/focus';
        break;
      case 'click':
        endpoint = '/api/search/memory/click';
        break;
      case 'ai':
        endpoint = '/api/search/memory/ai';
        break;
      case 'widget':
        endpoint = '/api/search/memory/widget-interaction';
        method = 'POST';
        // Add query params for widget
        const params = new URLSearchParams({
          session_id: data.session_id,
          widget: data.widget,
          ...(data.species_id && { species_id: data.species_id })
        });
        endpoint = `/api/search/memory/widget-interaction?${params}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, query, focus, click, ai, widget' },
          { status: 400 }
        );
    }

    const response = await fetch(`${MAS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: action !== 'widget' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Search memory error:', error);
    return NextResponse.json(
      { error: 'Failed to process search memory request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/memory
 * Get search memory statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // If user_id provided, get active session
    if (userId) {
      const response = await fetch(
        `${MAS_API_URL}/api/search/memory/active/${userId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        return NextResponse.json({ active: false });
      }

      const result = await response.json();
      return NextResponse.json(result);
    }

    // Otherwise get stats
    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/stats`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get stats' },
        { status: response.status }
      );
    }

    const stats = await response.json();
    return NextResponse.json(stats);

  } catch (error) {
    console.error('Search memory error:', error);
    return NextResponse.json(
      { error: 'Failed to get search memory data' },
      { status: 500 }
    );
  }
}
