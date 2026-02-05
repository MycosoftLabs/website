/**
 * Brain Context API Route - February 5, 2026
 * 
 * Proxy endpoint for user-specific brain context retrieval.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || 'http://192.168.0.188:8001';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const limit = searchParams.get('limit') || '10';
  
  try {
    const url = new URL(`${MAS_ORCHESTRATOR_URL}/voice/brain/context/${userId}`);
    if (query) url.searchParams.set('query', query);
    url.searchParams.set('limit', limit);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Brain context API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Brain context API error:', error);
    
    // Return fallback context for demo
    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        profile: {
          preferences: {
            voice_style: 'calm',
            response_length: 'concise',
          },
        },
        recent_memories: [],
        context_summary: `User profile for ${userId}`,
      },
    });
  }
}
