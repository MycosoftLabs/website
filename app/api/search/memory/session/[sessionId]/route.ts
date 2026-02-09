/**
 * Search Session API - February 5, 2026
 * 
 * Individual session endpoints:
 * - GET: Get session context
 * - POST: End session
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/search/memory/session/[sessionId]
 * Get context for a specific search session
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/context/${sessionId}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      const error = await response.text();
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      );
    }

    const context = await response.json();
    return NextResponse.json(context);

  } catch (error) {
    console.error('Session context error:', error);
    return NextResponse.json(
      { error: 'Failed to get session context' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search/memory/session/[sessionId]
 * End a search session and get summary
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/end/${sessionId}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      const error = await response.text();
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      );
    }

    const summary = await response.json();
    return NextResponse.json(summary);

  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
