/**
 * Episodic Memory API Route - February 5, 2026
 * 
 * Proxy endpoint for episodic memory retrieval.
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || 'http://192.168.0.188:8001';

interface Episode {
  id: string;
  event_type: string;
  description: string;
  importance: number;
  context?: Record<string, unknown>;
  timestamp: string;
  agent_id?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id') || 'myca_brain';
  const limit = parseInt(searchParams.get('limit') || '20');
  const eventType = searchParams.get('event_type');
  
  try {
    const response = await fetch(`${MAS_ORCHESTRATOR_URL}/api/memory/recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        layer: 'episodic',
        limit: limit,
        filters: eventType ? { event_type: eventType } : undefined,
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`Memory recall API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform memory records to episodes format
    const episodes: Episode[] = (data.memories || data.records || []).map((record: any, index: number) => ({
      id: record.id || `episode-${index}`,
      event_type: record.metadata?.event_type || record.type || 'system_event',
      description: record.value || record.content || record.description || 'Event recorded',
      importance: record.metadata?.importance || record.importance || 0.5,
      context: record.metadata?.context || record.context,
      timestamp: record.created_at || record.timestamp || new Date().toISOString(),
      agent_id: record.agent_id || agentId,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        episodes,
        total: episodes.length,
        agent_id: agentId,
      },
    });
  } catch (error) {
    console.error('Episodes API error:', error);
    
    // Return demo episodes for fallback
    const demoEpisodes: Episode[] = [
      {
        id: 'ep-1',
        event_type: 'conversation',
        description: 'Voice conversation with Morgan about lab temperature settings',
        importance: 0.7,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        agent_id: 'myca_brain',
      },
      {
        id: 'ep-2',
        event_type: 'tool_execution',
        description: 'Executed Mindex smell classification for sample #42',
        importance: 0.8,
        context: { tool: 'mindex_classify', result: 'success' },
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        agent_id: 'myca_brain',
      },
      {
        id: 'ep-3',
        event_type: 'agent_invocation',
        description: 'Delegated research task to ScientificAdvisor agent',
        importance: 0.6,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        agent_id: 'myca_brain',
      },
    ];
    
    return NextResponse.json({
      success: true,
      data: {
        episodes: demoEpisodes,
        total: demoEpisodes.length,
        agent_id: agentId,
        demo: true,
      },
    });
  }
}
