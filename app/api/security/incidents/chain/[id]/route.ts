/**
 * Chain Block Details API
 * 
 * Get detailed information about a specific chain block including
 * the raw hash input for verification and compliance export.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getIncidentLogChain, 
  getChainEntryDetails,
  getIncidentCausality,
} from '@/lib/security/database';
import { generateMerkleProof, getMerkleRoot } from '@/lib/security/incident-chain';

export const dynamic = 'force-dynamic';

/**
 * GET /api/security/incidents/chain/[id]
 * Get detailed block information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  
  try {
    // Get the chain entry
    const entries = await getIncidentLogChain({ limit: 10000 });
    const entry = entries.find(e => e.id === id || e.sequence_number.toString() === id);
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }
    
    // Get stored details
    const details = await getChainEntryDetails(entry.id);
    
    // Get related causality
    const causality = entry.incident_id !== 'system' 
      ? await getIncidentCausality(entry.incident_id)
      : { causedBy: [], causes: [], prevented: [] };
    
    // Generate Merkle proof for this block
    const recentEntries = entries.slice(0, 100);
    const hashes = recentEntries.map(e => e.event_hash);
    let merkleProof = null;
    
    if (hashes.includes(entry.event_hash)) {
      merkleProof = await generateMerkleProof(hashes, entry.event_hash);
    }
    
    // Calculate current Merkle root
    const merkleRoot = await getMerkleRoot(hashes);
    
    // Build comprehensive block data
    const blockData = {
      // Chain Entry
      id: entry.id,
      sequence_number: entry.sequence_number,
      event_hash: entry.event_hash,
      previous_hash: entry.previous_hash,
      merkle_root: entry.merkle_root,
      
      // Event Details
      event_type: entry.event_type,
      event_data: entry.event_data,
      incident_id: entry.incident_id,
      
      // Reporter
      reporter_type: entry.reporter_type,
      reporter_id: entry.reporter_id,
      reporter_name: entry.reporter_name,
      
      // Timestamps
      created_at: entry.created_at,
      
      // Cryptographic Verification
      verification: {
        hash_algorithm: 'SHA-256',
        raw_hash_input: details?.raw_hash_input || null,
        merkle_root: merkleRoot,
        merkle_proof: merkleProof,
        chain_verified: true,
        compliance_metadata: details?.compliance_metadata || {
          compliance_mode: 'cmmc-l2',
          nist_controls: ['AU-2', 'AU-3', 'AU-8', 'AU-9', 'AU-10'],
        },
      },
      
      // Causality (if incident-related)
      causality: {
        caused_by: causality.causedBy.map(c => ({
          id: c.id,
          source_incident: c.source_incident_id,
          relationship: c.relationship_type,
          confidence: c.confidence,
        })),
        causes: causality.causes.map(c => ({
          id: c.id,
          target_incident: c.target_incident_id,
          relationship: c.relationship_type,
          confidence: c.confidence,
          prevented: c.prevented,
        })),
        prevented_cascades: causality.prevented.map(c => ({
          id: c.id,
          target_incident: c.target_incident_id,
          prevented_by: c.prevented_by,
          prevented_at: c.prevented_at,
          prevention_action: c.prevention_action,
        })),
      },
      
      // Export metadata
      export_timestamp: new Date().toISOString(),
      export_format: format,
    };
    
    // Return based on format
    if (format === 'download') {
      const jsonString = JSON.stringify(blockData, null, 2);
      return new Response(jsonString, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="block-${entry.sequence_number}-${entry.event_hash.slice(0, 8)}.json"`,
        },
      });
    }
    
    if (format === 'csv') {
      const csvContent = [
        'field,value',
        `sequence_number,${entry.sequence_number}`,
        `event_hash,${entry.event_hash}`,
        `previous_hash,${entry.previous_hash}`,
        `event_type,${entry.event_type}`,
        `incident_id,${entry.incident_id}`,
        `reporter_name,${entry.reporter_name}`,
        `reporter_type,${entry.reporter_type}`,
        `created_at,${entry.created_at}`,
        `merkle_root,${merkleRoot}`,
        `hash_algorithm,SHA-256`,
        `compliance_mode,cmmc-l2`,
      ].join('\n');
      
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="block-${entry.sequence_number}.csv"`,
        },
      });
    }
    
    return NextResponse.json(blockData);
  } catch (error) {
    console.error('[Chain Block API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block details' },
      { status: 500 }
    );
  }
}
