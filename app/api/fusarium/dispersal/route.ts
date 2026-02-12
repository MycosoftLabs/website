/**
 * FUSARIUM Dispersal API Route
 * February 12, 2026
 * 
 * Proxies spore dispersal modeling requests to MAS.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
const MAS_API_KEY = process.env.MAS_API_KEY || '';

export const dynamic = 'force-dynamic';

/**
 * GET current dispersal data for visualization
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (MAS_API_KEY) {
      headers['X-API-Key'] = MAS_API_KEY;
    }
    
    const queryString = searchParams.toString();
    const url = `${MAS_API_URL}/api/fusarium/dispersal${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`[FUSARIUM Dispersal] MAS returned ${response.status}`);
      return NextResponse.json(
        { error: `MAS API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[FUSARIUM Dispersal] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to MAS' },
      { status: 502 }
    );
  }
}

/**
 * POST to calculate spore dispersal forecast
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (MAS_API_KEY) {
      headers['X-API-Key'] = MAS_API_KEY;
    }
    
    const response = await fetch(`${MAS_API_URL}/api/fusarium/dispersal`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error(`[FUSARIUM Dispersal] MAS returned ${response.status}`);
      return NextResponse.json(
        { error: `MAS API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[FUSARIUM Dispersal POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to MAS' },
      { status: 502 }
    );
  }
}
