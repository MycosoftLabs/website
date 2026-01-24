/**
 * Incident Chain - Cryptographic Integrity System
 * 
 * Provides blockchain-style immutable logging for security incidents.
 * Uses SHA-256 hashing and Merkle tree anchoring for tamper-evident logs.
 * 
 * Features:
 * - SHA-256 hashing for each event
 * - Chain linking (each entry references previous hash)
 * - Merkle root anchoring for batch verification
 * - Tamper detection and integrity verification
 * - Compliance with NIST 800-53 AU controls
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import {
  createIncidentLogEntry,
  createAgentActivity,
  getIncidentLogChain,
  getAgentActivity,
  verifyLogChainIntegrity,
  getChainState,
  type IncidentLogChainEntry,
  type AgentIncidentActivity,
} from './database';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface IncidentChainConfig {
  merkleAnchorInterval: number;  // Number of entries before creating Merkle anchor
  enableAutoVerification: boolean;
  complianceMode: 'standard' | 'fedramp' | 'nist-high' | 'cmmc-l2';
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
}

export interface MerkleProof {
  root: string;
  proof: Array<{ hash: string; position: 'left' | 'right' }>;
  leaf: string;
  valid: boolean;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  errors: string[];
  latestHash: string;
  merkleRoot: string | null;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const defaultConfig: IncidentChainConfig = {
  merkleAnchorInterval: 100,  // Create Merkle root every 100 entries
  enableAutoVerification: true,
  complianceMode: 'cmmc-l2',
};

let config: IncidentChainConfig = { ...defaultConfig };

/**
 * Configure the incident chain system
 */
export function configureIncidentChain(newConfig: Partial<IncidentChainConfig>): void {
  config = { ...config, ...newConfig };
  console.log('[IncidentChain] Configuration updated:', config);
}

// ═══════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Generate SHA-256 hash of data
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate hash of two concatenated hashes (for Merkle tree)
 */
export async function hashPair(left: string, right: string): Promise<string> {
  return sha256(left + right);
}

// ═══════════════════════════════════════════════════════════════
// MERKLE TREE
// ═══════════════════════════════════════════════════════════════

/**
 * Build a Merkle tree from a list of hashes
 */
export async function buildMerkleTree(hashes: string[]): Promise<MerkleNode> {
  if (hashes.length === 0) {
    return { hash: '0'.repeat(64) };
  }
  
  if (hashes.length === 1) {
    return { hash: hashes[0], data: hashes[0] };
  }
  
  // Create leaf nodes
  let currentLevel: MerkleNode[] = hashes.map(h => ({ hash: h, data: h }));
  
  // Build tree bottom-up
  while (currentLevel.length > 1) {
    const nextLevel: MerkleNode[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || currentLevel[i]; // Duplicate last if odd
      
      const parentHash = await hashPair(left.hash, right.hash);
      nextLevel.push({
        hash: parentHash,
        left,
        right: currentLevel[i + 1] ? right : undefined,
      });
    }
    
    currentLevel = nextLevel;
  }
  
  return currentLevel[0];
}

/**
 * Get the Merkle root from a list of hashes
 */
export async function getMerkleRoot(hashes: string[]): Promise<string> {
  const tree = await buildMerkleTree(hashes);
  return tree.hash;
}

/**
 * Generate a Merkle proof for a specific hash
 */
export async function generateMerkleProof(
  hashes: string[],
  targetHash: string
): Promise<MerkleProof> {
  const root = await getMerkleRoot(hashes);
  const targetIndex = hashes.indexOf(targetHash);
  
  if (targetIndex === -1) {
    return { root, proof: [], leaf: targetHash, valid: false };
  }
  
  const proof: Array<{ hash: string; position: 'left' | 'right' }> = [];
  let currentLevel = hashes;
  let currentIndex = targetIndex;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || currentLevel[i];
      
      // If this pair contains our target
      if (i === currentIndex || i + 1 === currentIndex) {
        if (currentIndex % 2 === 0) {
          // Target is on the left, sibling is on the right
          if (currentLevel[i + 1]) {
            proof.push({ hash: right, position: 'right' });
          }
        } else {
          // Target is on the right, sibling is on the left
          proof.push({ hash: left, position: 'left' });
        }
      }
      
      nextLevel.push(await hashPair(left, right));
    }
    
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return { root, proof, leaf: targetHash, valid: true };
}

/**
 * Verify a Merkle proof
 */
export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  if (!proof.valid || proof.proof.length === 0) {
    return proof.proof.length === 0 && proof.leaf === proof.root;
  }
  
  let currentHash = proof.leaf;
  
  for (const step of proof.proof) {
    if (step.position === 'left') {
      currentHash = await hashPair(step.hash, currentHash);
    } else {
      currentHash = await hashPair(currentHash, step.hash);
    }
  }
  
  return currentHash === proof.root;
}

// ═══════════════════════════════════════════════════════════════
// INCIDENT CHAIN OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Log an incident event to the chain
 */
export async function logIncidentEvent(params: {
  incident_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  reporter_type: IncidentLogChainEntry['reporter_type'];
  reporter_id: string;
  reporter_name: string;
  merkle_root?: string;
}): Promise<IncidentLogChainEntry> {
  const entry = await createIncidentLogEntry({
    incident_id: params.incident_id,
    event_type: params.event_type,
    event_data: params.event_data,
    reporter_type: params.reporter_type,
    reporter_id: params.reporter_id,
    reporter_name: params.reporter_name,
    merkle_root: params.merkle_root || null,
  });
  
  // Check if we need to create a Merkle anchor
  const state = getChainState();
  if (state.sequence % config.merkleAnchorInterval === 0) {
    console.log(`[IncidentChain] Creating Merkle anchor at sequence ${state.sequence}`);
    await createMerkleAnchor();
  }
  
  return entry;
}

/**
 * Log agent activity
 */
export async function logAgentAction(params: {
  agent_id: string;
  agent_name: string;
  agent_category: AgentIncidentActivity['agent_category'];
  incident_id: string | null;
  action_type: AgentIncidentActivity['action_type'];
  action_data: Record<string, unknown>;
  severity: AgentIncidentActivity['severity'];
}): Promise<AgentIncidentActivity> {
  return createAgentActivity({
    agent_id: params.agent_id,
    agent_name: params.agent_name,
    agent_category: params.agent_category,
    incident_id: params.incident_id,
    action_type: params.action_type,
    action_data: params.action_data,
    severity: params.severity,
  });
}

/**
 * Create a Merkle anchor for the current chain state
 */
export async function createMerkleAnchor(): Promise<string> {
  const entries = await getIncidentLogChain({ limit: config.merkleAnchorInterval });
  const hashes = entries.map(e => e.event_hash);
  const merkleRoot = await getMerkleRoot(hashes);
  
  console.log(`[IncidentChain] Merkle root created: ${merkleRoot.substring(0, 16)}...`);
  
  // In production, this would be anchored to MINDEX ledger
  // For now, we log it
  await logIncidentEvent({
    incident_id: 'system',
    event_type: 'action',
    event_data: {
      action: 'merkle_anchor',
      merkle_root: merkleRoot,
      entries_count: entries.length,
      first_sequence: entries[entries.length - 1]?.sequence_number || 0,
      last_sequence: entries[0]?.sequence_number || 0,
    },
    reporter_type: 'system',
    reporter_id: 'incident-chain',
    reporter_name: 'Incident Chain System',
    merkle_root: merkleRoot,
  });
  
  return merkleRoot;
}

/**
 * Verify the integrity of the entire chain
 */
export async function verifyChain(): Promise<ChainVerificationResult> {
  const entries = await getIncidentLogChain({ limit: 10000 });
  const result = await verifyLogChainIntegrity(entries);
  
  // Get latest Merkle root
  const merkleEntry = entries.find(e => e.merkle_root !== null);
  
  return {
    valid: result.valid,
    totalEntries: entries.length,
    verifiedEntries: result.verified_count,
    errors: result.errors,
    latestHash: entries[0]?.event_hash || '0'.repeat(64),
    merkleRoot: merkleEntry?.merkle_root || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get chain statistics
 */
export async function getChainStats(): Promise<{
  total_entries: number;
  entries_last_hour: number;
  entries_last_day: number;
  latest_hash: string;
  latest_sequence: number;
  last_merkle_anchor: string | null;
  integrity_verified: boolean;
}> {
  const state = getChainState();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  const allEntries = await getIncidentLogChain({ limit: 10000 });
  const hourEntries = allEntries.filter(e => e.created_at >= hourAgo);
  const dayEntries = allEntries.filter(e => e.created_at >= dayAgo);
  
  // Find latest Merkle anchor
  const merkleEntry = allEntries.find(e => e.merkle_root !== null);
  
  // Quick integrity check (just verify chain links, not full hash recomputation)
  let integrityOk = true;
  for (let i = 0; i < Math.min(10, allEntries.length - 1); i++) {
    if (allEntries[i].previous_hash !== allEntries[i + 1].event_hash) {
      integrityOk = false;
      break;
    }
  }
  
  return {
    total_entries: allEntries.length,
    entries_last_hour: hourEntries.length,
    entries_last_day: dayEntries.length,
    latest_hash: state.lastHash,
    latest_sequence: state.sequence,
    last_merkle_anchor: merkleEntry?.merkle_root || null,
    integrity_verified: integrityOk,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Export chain for compliance audit
 */
export async function exportChainForAudit(options: {
  since?: string;
  until?: string;
  format: 'json' | 'csv';
}): Promise<string> {
  const entries = await getIncidentLogChain({ limit: 10000, since: options.since });
  
  // Filter by until date if provided
  let filtered = entries;
  if (options.until) {
    filtered = entries.filter(e => e.created_at <= options.until!);
  }
  
  if (options.format === 'csv') {
    const headers = [
      'sequence_number',
      'event_hash',
      'previous_hash',
      'event_type',
      'reporter_type',
      'reporter_id',
      'reporter_name',
      'created_at',
      'merkle_root',
    ].join(',');
    
    const rows = filtered.map(e => [
      e.sequence_number,
      e.event_hash,
      e.previous_hash,
      e.event_type,
      e.reporter_type,
      e.reporter_id,
      `"${e.reporter_name}"`,
      e.created_at,
      e.merkle_root || '',
    ].join(','));
    
    return [headers, ...rows].join('\n');
  }
  
  return JSON.stringify({
    export_date: new Date().toISOString(),
    compliance_mode: config.complianceMode,
    entries: filtered,
    verification: await verifyChain(),
  }, null, 2);
}

// Export types
export type { IncidentLogChainEntry, AgentIncidentActivity };
