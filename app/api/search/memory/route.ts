/**
 * Search Memory API - February 5, 2026
 * 
 * Main search memory endpoints for:
 * - Starting/managing search sessions
 * - Recording queries and interactions
 * - Getting session context
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  masServiceHeaders,
  requireOwnerOrSuperuserIdentity,
  resolveScopedUserId,
  resolveVerifiedIdentity,
} from '@/lib/auth/verified-identity';

const MAS_API_URL = process.env.MAS_API_URL || 'http://localhost:8001';

/**
 * POST /api/search/memory
 * Start a new search session or get existing one
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identity = await resolveVerifiedIdentity();
    const { action, ...data } = body;
    const scopedUser = resolveScopedUserId(identity, data.user_id);
    if (scopedUser.denied) return scopedUser.denied;
    const payload = {
      ...data,
      user_id: scopedUser.userId,
      auth_trust_level: identity.authTrustLevel,
    };

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
          session_id: payload.session_id,
          widget: payload.widget,
          user_id: payload.user_id,
          ...(payload.species_id && { species_id: payload.species_id })
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
      headers: masServiceHeaders({
        'Content-Type': 'application/json',
      }, identity),
      body: action !== 'widget' ? JSON.stringify(payload) : undefined,
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
    const identity = await resolveVerifiedIdentity();
    const userScope = resolveScopedUserId(identity, searchParams.get('user_id'));
    if (userScope.denied) return userScope.denied;
    const wantsStats = searchParams.get('stats') === 'true';

    if (wantsStats) {
      const authError = requireOwnerOrSuperuserIdentity(identity);
      if (authError) return authError;
      const response = await fetch(
        `${MAS_API_URL}/api/search/memory/stats`,
        { method: 'GET', headers: masServiceHeaders({}, identity) }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to get stats' },
          { status: response.status }
        );
      }

      const stats = await response.json();
      return NextResponse.json(stats);
    }

    const response = await fetch(
      `${MAS_API_URL}/api/search/memory/active/${encodeURIComponent(userScope.userId)}`,
      { method: 'GET', headers: masServiceHeaders({}, identity) }
    );

    if (!response.ok) {
      return NextResponse.json({ active: false });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Search memory error:', error);
    return NextResponse.json(
      { error: 'Failed to get search memory data' },
      { status: 500 }
    );
  }
}
