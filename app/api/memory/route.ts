/**
 * Memory API Route - February 3, 2026
 * Proxies memory requests to the MAS orchestrator.
 * Integrates with AI Studio, NatureOS, CREP, and all dashboards.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || 'http://192.168.0.188:8001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'health';

  try {
    const response = await fetch(MAS_URL + '/api/memory/' + endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to memory service' },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    const endpoint = action || 'read';
    
    const response = await fetch(MAS_URL + '/api/memory/' + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to process memory request' },
      { status: 500 }
    );
  }
}
