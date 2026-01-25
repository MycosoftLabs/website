/**
 * Chain Repair API
 * 
 * Utility endpoint for repairing and verifying the incident log chain.
 * This rebuilds the chain links and recalculates hashes.
 * 
 * IMPORTANT: This should only be used during development/migration.
 * In production, the chain should be immutable.
 * 
 * @version 1.0.0
 * @date January 25, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/security/chain-repair
 * Verify chain integrity and report issues
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  try {
    // Fetch all entries in order
    const { data: entries, error } = await supabase
      .from('incident_log_chain')
      .select('*')
      .order('sequence_number', { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!entries || entries.length === 0) {
      return NextResponse.json({ 
        message: 'No chain entries found',
        entriesTotal: 0,
        valid: true,
      });
    }
    
    // Verify each entry
    const issues: Array<{
      sequence: number;
      issue: string;
      expectedPrevHash?: string;
      actualPrevHash?: string;
    }> = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (i === 0) {
        // Genesis block should have all zeros previous hash
        if (entry.previous_hash && entry.previous_hash !== '0'.repeat(64)) {
          issues.push({
            sequence: entry.sequence_number,
            issue: 'Genesis block has non-zero previous hash',
            actualPrevHash: entry.previous_hash?.slice(0, 16) + '...',
          });
        }
      } else {
        const prevEntry = entries[i - 1];
        
        // Check if previous_hash matches
        if (entry.previous_hash !== prevEntry.event_hash) {
          issues.push({
            sequence: entry.sequence_number,
            issue: 'Chain link broken - previous_hash does not match',
            expectedPrevHash: prevEntry.event_hash?.slice(0, 16) + '...',
            actualPrevHash: entry.previous_hash?.slice(0, 16) + '...',
          });
        }
      }
      
      // Verify hash format
      if (!entry.event_hash || entry.event_hash.length !== 64) {
        issues.push({
          sequence: entry.sequence_number,
          issue: 'Invalid event_hash format',
        });
      }
    }
    
    return NextResponse.json({
      entriesTotal: entries.length,
      valid: issues.length === 0,
      issuesFound: issues.length,
      issues: issues.slice(0, 20), // First 20 issues
      firstEntry: {
        sequence: entries[0].sequence_number,
        hash: entries[0].event_hash?.slice(0, 16) + '...',
      },
      lastEntry: {
        sequence: entries[entries.length - 1].sequence_number,
        hash: entries[entries.length - 1].event_hash?.slice(0, 16) + '...',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/chain-repair
 * Repair the chain by recalculating hashes and links
 * 
 * Body:
 * - action: 'repair' | 'reset-sequence' | 'verify'
 * - dryRun: boolean (default: true) - if true, don't actually modify
 */
export async function POST(request: NextRequest) {
  // Check if allowed
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_CHAIN_REPAIR) {
    return NextResponse.json(
      { error: 'Chain repair disabled in production' },
      { status: 403 }
    );
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { action = 'verify', dryRun = true } = body;
    
    if (action === 'verify') {
      // Just verify, same as GET
      return GET(request);
    }
    
    if (action === 'repair') {
      // Fetch all entries in order
      const { data: entries, error } = await supabase
        .from('incident_log_chain')
        .select('*')
        .order('sequence_number', { ascending: true });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      if (!entries || entries.length === 0) {
        return NextResponse.json({ message: 'No entries to repair' });
      }
      
      const repairs: Array<{
        sequence: number;
        oldHash: string;
        newHash: string;
        oldPrevHash: string;
        newPrevHash: string;
      }> = [];
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const prevHash = i === 0 ? '0'.repeat(64) : entries[i - 1].event_hash;
        
        // Calculate correct hash
        const hashInput = JSON.stringify({
          sequence_number: entry.sequence_number,
          incident_id: entry.incident_id,
          event_type: entry.event_type,
          event_data: entry.event_data,
          reporter_type: entry.reporter_type,
          reporter_id: entry.reporter_id,
          created_at: entry.created_at,
          previous_hash: prevHash,
        });
        
        const correctHash = crypto.createHash('sha256').update(hashInput).digest('hex');
        
        // Check if repair needed
        const needsRepair = entry.event_hash !== correctHash || entry.previous_hash !== prevHash;
        
        if (needsRepair) {
          repairs.push({
            sequence: entry.sequence_number,
            oldHash: entry.event_hash?.slice(0, 16) + '...',
            newHash: correctHash.slice(0, 16) + '...',
            oldPrevHash: entry.previous_hash?.slice(0, 16) + '...',
            newPrevHash: prevHash.slice(0, 16) + '...',
          });
          
          if (!dryRun) {
            // Actually update
            const { error: updateError } = await supabase
              .from('incident_log_chain')
              .update({
                event_hash: correctHash,
                previous_hash: prevHash,
              })
              .eq('id', entry.id);
            
            if (updateError) {
              console.error(`[Chain Repair] Failed to update entry ${entry.sequence_number}:`, updateError);
            }
            
            // Update our local copy for next iteration
            entries[i].event_hash = correctHash;
            entries[i].previous_hash = prevHash;
          }
        }
      }
      
      return NextResponse.json({
        action: 'repair',
        dryRun,
        entriesTotal: entries.length,
        entriesRepaired: repairs.length,
        repairs: repairs.slice(0, 20), // First 20 repairs
        message: dryRun 
          ? `${repairs.length} entries would be repaired. Set dryRun=false to apply.`
          : `${repairs.length} entries repaired.`,
      });
    }
    
    if (action === 'reset-sequence') {
      // Reset sequence numbers to be continuous
      const { data: entries, error } = await supabase
        .from('incident_log_chain')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      if (!entries || entries.length === 0) {
        return NextResponse.json({ message: 'No entries to reset' });
      }
      
      const updates: Array<{ id: string; oldSeq: number; newSeq: number }> = [];
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const newSeq = i + 1;
        
        if (entry.sequence_number !== newSeq) {
          updates.push({
            id: entry.id,
            oldSeq: entry.sequence_number,
            newSeq,
          });
          
          if (!dryRun) {
            await supabase
              .from('incident_log_chain')
              .update({ sequence_number: newSeq })
              .eq('id', entry.id);
          }
        }
      }
      
      return NextResponse.json({
        action: 'reset-sequence',
        dryRun,
        entriesTotal: entries.length,
        sequencesReset: updates.length,
        updates: updates.slice(0, 20),
        message: dryRun 
          ? `${updates.length} sequences would be reset. Set dryRun=false to apply.`
          : `${updates.length} sequences reset.`,
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
