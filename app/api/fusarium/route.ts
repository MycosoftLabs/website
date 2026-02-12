/**
 * FUSARIUM API Route
 * February 12, 2026
 * 
 * Proxies FUSARIUM requests to MAS API.
 * Used by Earth2 FUSARIUM extension and CREP dashboard.
 * 
 * Endpoints:
 * - GET /api/fusarium?action=health - Health check
 * - GET /api/fusarium?action=species - Fungal species distribution
 * - GET /api/fusarium?action=dispersal - Spore dispersal data
 * - GET /api/fusarium?action=risk-zones - Agricultural risk zones
 * - GET /api/fusarium?action=threats - Active threat alerts
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
const MAS_API_KEY = process.env.MAS_API_KEY || '';

export const dynamic = 'force-dynamic';

/**
 * Proxy GET requests to MAS FUSARIUM API
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';
  
  // Build MAS API URL
  let masEndpoint = '';
  const queryParams = new URLSearchParams();
  
  switch (action) {
    case 'health':
      masEndpoint = '/api/fusarium/health';
      break;
      
    case 'species':
      masEndpoint = '/api/fusarium/species';
      // Forward bounding box params
      ['min_lat', 'max_lat', 'min_lon', 'max_lon', 'species_name', 'pathogenic_only', 'limit'].forEach(param => {
        const value = searchParams.get(param);
        if (value) queryParams.set(param, value);
      });
      break;
      
    case 'dispersal':
      masEndpoint = '/api/fusarium/dispersal';
      // Forward dispersal params
      ['min_lat', 'max_lat', 'min_lon', 'max_lon', 'time'].forEach(param => {
        const value = searchParams.get(param);
        if (value) queryParams.set(param, value);
      });
      break;
      
    case 'risk-zones':
      masEndpoint = '/api/fusarium/risk-zones';
      // Forward risk zone params
      ['min_lat', 'max_lat', 'min_lon', 'max_lon', 'crop', 'threat_level'].forEach(param => {
        const value = searchParams.get(param);
        if (value) queryParams.set(param, value);
      });
      break;
      
    case 'threats':
      masEndpoint = '/api/fusarium/threats';
      // Forward threat params
      ['severity', 'category', 'limit'].forEach(param => {
        const value = searchParams.get(param);
        if (value) queryParams.set(param, value);
      });
      break;
      
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (MAS_API_KEY) {
      headers['X-API-Key'] = MAS_API_KEY;
    }
    
    const queryString = queryParams.toString();
    const url = `${MAS_API_URL}${masEndpoint}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`[FUSARIUM API] MAS returned ${response.status}`);
      return NextResponse.json(
        { error: `MAS API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[FUSARIUM API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to MAS' },
      { status: 502 }
    );
  }
}

/**
 * Proxy POST requests to MAS FUSARIUM API
 * Used for dispersal modeling requests
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'dispersal';
  
  let masEndpoint = '';
  
  switch (action) {
    case 'dispersal':
      masEndpoint = '/api/fusarium/dispersal';
      break;
      
    case 'report-threat':
      masEndpoint = '/api/fusarium/threats/report';
      break;
      
    default:
      return NextResponse.json(
        { error: `Unknown POST action: ${action}` },
        { status: 400 }
      );
  }
  
  try {
    const body = await request.json();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (MAS_API_KEY) {
      headers['X-API-Key'] = MAS_API_KEY;
    }
    
    const response = await fetch(`${MAS_API_URL}${masEndpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error(`[FUSARIUM API] MAS returned ${response.status}`);
      return NextResponse.json(
        { error: `MAS API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[FUSARIUM API] POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to MAS' },
      { status: 502 }
    );
  }
}
