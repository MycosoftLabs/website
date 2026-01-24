/**
 * Incident Chain API Endpoint
 * 
 * API for accessing the cryptographic incident log chain.
 * Provides chain entries, verification, and statistics.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIncidentLogChain, getAgentActivity, getAgentActivityStats } from '@/lib/security/database';
import { 
  verifyChain, 
  getChainStats, 
  exportChainForAudit,
  getMerkleRoot,
} from '@/lib/security/incident-chain';

export const dynamic = 'force-dynamic';

/**
 * GET /api/security/incidents/chain
 * Get chain entries, stats, or perform verification
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const action = searchParams.get('action') || 'entries';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const incident_id = searchParams.get('incident_id') || undefined;
  const since = searchParams.get('since') || undefined;
  const format = (searchParams.get('format') || 'json') as 'json' | 'csv';
  
  try {
    switch (action) {
      case 'entries': {
        const entries = await getIncidentLogChain({ incident_id, limit, since });
        return NextResponse.json({ entries, count: entries.length });
      }
      
      case 'verify': {
        const result = await verifyChain();
        return NextResponse.json(result);
      }
      
      case 'stats': {
        const [chainStats, activityStats] = await Promise.all([
          getChainStats(),
          getAgentActivityStats(),
        ]);
        return NextResponse.json({ chain: chainStats, activity: activityStats });
      }
      
      case 'export': {
        const exported = await exportChainForAudit({
          since,
          until: searchParams.get('until') || undefined,
          format,
        });
        
        if (format === 'csv') {
          return new Response(exported, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="incident-chain-${new Date().toISOString().split('T')[0]}.csv"`,
            },
          });
        }
        
        return NextResponse.json(JSON.parse(exported));
      }
      
      case 'merkle': {
        const entries = await getIncidentLogChain({ limit });
        const hashes = entries.map(e => e.event_hash);
        const root = await getMerkleRoot(hashes);
        return NextResponse.json({
          merkle_root: root,
          entries_count: entries.length,
          first_sequence: entries[entries.length - 1]?.sequence_number || 0,
          last_sequence: entries[0]?.sequence_number || 0,
        });
      }
      
      case 'activity': {
        const activity = await getAgentActivity({
          agent_id: searchParams.get('agent_id') || undefined,
          incident_id: searchParams.get('incident_id') || undefined,
          action_type: searchParams.get('action_type') || undefined,
          limit,
          since,
        });
        return NextResponse.json({ activity, count: activity.length });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: entries, verify, stats, export, merkle, activity' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Chain API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chain request' },
      { status: 500 }
    );
  }
}
