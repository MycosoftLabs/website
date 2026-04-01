/**
 * Memory API Route
 *
 * Proxies memory requests to MAS orchestrator.
 * Falls back to Supabase or empty responses when MAS is unreachable.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_URL = process.env.MAS_API_URL || process.env.MAS_ORCHESTRATOR_URL || 'http://localhost:8001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'health';

  // Try MAS first
  try {
    const response = await fetch(`${MAS_URL}/api/memory/${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // MAS unreachable
  }

  // Fallback responses by endpoint
  if (endpoint === 'health') {
    return NextResponse.json({
      status: 'degraded',
      message: 'Memory service running in local mode',
      mas_available: false,
      supabase_available: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
    });
  }

  if (endpoint === 'stats') {
    return NextResponse.json({
      total_memories: 0,
      total_conversations: 0,
      source: 'local-fallback',
    });
  }

  return NextResponse.json({
    data: [],
    source: 'local-fallback',
    message: 'Memory service reconnecting',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;
    const endpoint = action || 'read';

    // Try MAS first
    try {
      const response = await fetch(`${MAS_URL}/api/memory/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // MAS unreachable
    }

    // Fallback: store to Supabase if it's a write action
    if (endpoint === 'store' && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/myca_memories`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            ...payload,
            created_at: new Date().toISOString(),
          }),
        });
        if (supaRes.ok) {
          return NextResponse.json({ stored: true, source: 'supabase' });
        }
      } catch {
        // Supabase also failed
      }
    }

    // For read actions, return empty
    if (endpoint === 'read' || endpoint === 'search') {
      return NextResponse.json({
        results: [],
        source: 'local-fallback',
        message: 'Memory service reconnecting',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Memory service temporarily unavailable',
    });
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to process memory request' },
      { status: 500 }
    );
  }
}
