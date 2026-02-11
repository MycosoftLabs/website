/**
 * Brain Status API Route - February 9, 2026
 *
 * GET /api/brain/status - Proxies to MAS voice/brain/status and returns
 * a shape compatible with useBrainStatus() (BrainStatus).
 */

import { NextResponse } from 'next/server';

const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.MAS_API_URL || 'http://192.168.0.188:8001';

function mapToBrainStatus(masData: Record<string, unknown>): Record<string, unknown> {
  const memory = (masData.memory as Record<string, unknown>) || {};
  const layers = (memory.layers as Record<string, { count?: number; sizeBytes?: number }>) || {};
  const layerDefaults = { count: 0, sizeBytes: 0 };
  return {
    isActive: (masData.status as string) === 'healthy',
    memoryLoad: typeof memory.total_memories === 'number' ? Math.min(100, memory.total_memories / 50) : 0,
    activeContexts: (memory.active_sessions as number) ?? (memory.active_conversations as number) ?? 0,
    lastActivity: (masData.timestamp as string) ?? new Date().toISOString(),
    healthScore: (masData.status as string) === 'healthy' ? 1 : 0,
    layers: {
      ephemeral: layers.ephemeral ?? layerDefaults,
      session: layers.session ?? layerDefaults,
      working: layers.working ?? layerDefaults,
      semantic: layers.semantic ?? layerDefaults,
      episodic: layers.episodic ?? layerDefaults,
      system: layers.system ?? layerDefaults,
    },
  };
}

export async function GET() {
  try {
    const response = await fetch(`${MAS_ORCHESTRATOR_URL}/voice/brain/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const fallback = mapToBrainStatus({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        memory: { total_memories: 0, active_sessions: 0 },
      });
      return NextResponse.json(fallback);
    }

    const data = await response.json();
    const payload = (data.data ?? data) as Record<string, unknown>;
    const status = mapToBrainStatus(payload);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Brain status API error:', error);
    const fallback = mapToBrainStatus({
      status: 'unavailable',
      timestamp: new Date().toISOString(),
      memory: { total_memories: 0, active_sessions: 0 },
    });
    return NextResponse.json(fallback);
  }
}
