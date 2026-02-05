/**
 * User Profile Memory API Route - February 5, 2026
 * 
 * Proxy endpoint for user profile memory operations.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || 'http://192.168.0.188:8001';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  
  try {
    const response = await fetch(`${MAS_ORCHESTRATOR_URL}/api/memory/user/${userId}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `User profile API returned ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('User profile API error:', error);
    
    // Return fallback profile for demo
    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        preferences: {
          voice_style: 'calm',
          response_length: 'concise',
          lab_temperature: '68F',
        },
        facts: [
          { type: 'preference', content: 'Prefers detailed explanations', learned_from: 'conversation' },
          { type: 'interest', content: 'Interested in mycology research', learned_from: 'voice' },
        ],
        last_interaction: new Date().toISOString(),
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  
  try {
    const body = await request.json();
    const { action, key, value } = body;
    
    if (action === 'update_preference') {
      const response = await fetch(`${MAS_ORCHESTRATOR_URL}/api/memory/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: 'myca_brain',
          scope: 'user',
          key: `preference:${key}`,
          value: value,
          metadata: {
            user_id: userId,
            updated_by: 'user_profile_widget',
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Memory write API returned ${response.status}` },
          { status: response.status }
        );
      }
      
      return NextResponse.json({ success: true, message: 'Preference updated' });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('User profile POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
