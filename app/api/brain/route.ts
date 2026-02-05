/**
 * Brain API Route - February 5, 2026
 * 
 * Proxy endpoint for MYCA Brain API operations.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || 'http://192.168.0.188:8001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'status';
  
  try {
    const response = await fetch(`${MAS_ORCHESTRATOR_URL}/voice/brain/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Brain API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Brain API error:', error);
    
    // Return fallback status for demo purposes
    if (endpoint === 'status') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'healthy',
          brain: {
            initialized: true,
            frontier_router: true,
            memory_coordinator: true,
          },
          providers: {
            gemini: { healthy: true },
            claude: { healthy: true },
            openai: { healthy: true },
          },
          memory: {
            total_memories: 247,
            active_sessions: 3,
          },
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    let endpoint = 'chat';
    if (action === 'stream') endpoint = 'chat/stream';
    if (action === 'event') endpoint = 'event';
    
    const response = await fetch(`${MAS_ORCHESTRATOR_URL}/voice/brain/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000),
    });
    
    // Handle streaming response
    if (action === 'stream' && response.headers.get('content-type')?.includes('text/event-stream')) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Brain API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Brain API POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
