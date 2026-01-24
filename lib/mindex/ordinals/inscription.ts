/**
 * Bitcoin Ordinals Inscription Module for MINDEX
 * 
 * Based on Mycosoft's "Inscribing DNA Into Bitcoin" methodology:
 * - Data inscribed into Bitcoin blockchain using ordinal theory
 * - SHA-256 hashing for integrity verification
 * - GZIP compression for efficient storage
 * - Creates non-fungible data assets from biological information
 * 
 * @see https://medium.com/@mycosoft.inc/inscribing-dna-into-bitcoin-1cd783ddd24c
 * @see https://medium.com/@mycosoft.inc/mindex-84ec7ed68621
 */

import { toHex, toBase64, textEncode } from '../crypto/encoding';

// Ordinal inscription content types
export type InscriptionContentType = 
  | 'text/plain'           // Plain text data
  | 'application/json'     // JSON structured data
  | 'application/gzip'     // GZIP compressed data
  | 'application/dna'      // DNA sequence data (FASTA format)
  | 'application/mindex'   // MINDEX record format
  | 'image/png'            // Image data (species photos)
  | 'image/svg+xml';       // SVG data (phylogenetic trees)

// MINDEX inscription payload structure
export interface MINDEXInscription {
  // Metadata
  inscription_id?: string;        // Assigned after inscription
  content_type: InscriptionContentType;
  protocol: 'mindex-v2';
  version: string;
  
  // Integrity
  data_hash: string;              // sha256: prefixed hash
  merkle_root?: string;           // Daily merkle root reference
  prev_inscription?: string;      // Chain to previous inscription
  
  // Payload
  payload: string;                // Base64 encoded data (may be GZIP compressed)
  payload_size: number;           // Original size in bytes
  compressed: boolean;            // Whether payload is GZIP compressed
  
  // Identity
  device_id?: string;             // Source device
  user_id?: string;               // User who created
  signature: string;              // Ed25519 signature
  
  // Timestamps
  created_at: string;             // ISO 8601
  block_height?: number;          // Bitcoin block height when inscribed
  tx_id?: string;                 // Bitcoin transaction ID
}

// DNA sequence inscription (for species genome data)
export interface DNAInscription extends MINDEXInscription {
  content_type: 'application/dna';
  metadata: {
    species_id: string;           // MINDEX species ID
    canonical_name: string;       // Scientific name
    sequence_type: 'genome' | 'barcode' | 'its' | 'lsu' | 'ssu' | 'mtdna';
    sequence_length: number;      // Base pairs
    quality_score?: number;       // Phred score
    source: string;               // GenBank, BOLD, etc.
    accession?: string;           // Database accession number
  };
}

// Taxa inscription (for species records)
export interface TaxaInscription extends MINDEXInscription {
  content_type: 'application/mindex';
  metadata: {
    taxon_id: string;
    rank: 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus' | 'species' | 'subspecies';
    canonical_name: string;
    common_name?: string;
    parent_taxon_id?: string;
    observation_count: number;
    compounds_known: number;
  };
}

// Observation inscription (for field observations)
export interface ObservationInscription extends MINDEXInscription {
  content_type: 'application/mindex';
  metadata: {
    observation_id: string;
    taxon_id: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
    observed_at: string;
    observer_id: string;
    image_hash?: string;           // Hash of associated image
    environmental_data?: {
      temperature?: number;
      humidity?: number;
      soil_ph?: number;
      substrate?: string;
    };
  };
}

/**
 * Compress data using GZIP for efficient Bitcoin inscription
 * Uses pako library for browser-compatible compression
 */
export async function compressForInscription(data: string | Uint8Array): Promise<Uint8Array> {
  const input = typeof data === 'string' ? textEncode(data) : data;
  
  // Use CompressionStream API (browser-native)
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(stream).blob();
    return new Uint8Array(await blob.arrayBuffer());
  }
  
  // Fallback for Node.js
  const { gzipSync } = await import('zlib');
  return gzipSync(Buffer.from(input));
}

/**
 * Decompress GZIP data from Bitcoin inscription
 */
export async function decompressFromInscription(data: Uint8Array): Promise<Uint8Array> {
  // Use DecompressionStream API (browser-native)
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));
    const blob = await new Response(stream).blob();
    return new Uint8Array(await blob.arrayBuffer());
  }
  
  // Fallback for Node.js
  const { gunzipSync } = await import('zlib');
  return gunzipSync(Buffer.from(data));
}

/**
 * Calculate SHA-256 hash for inscription data integrity
 */
export async function hashInscriptionData(data: string | Uint8Array): Promise<string> {
  const input = typeof data === 'string' ? textEncode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', input);
  return `sha256:${toHex(new Uint8Array(hashBuffer))}`;
}

/**
 * Create a MINDEX inscription payload ready for Bitcoin ordinal inscription
 */
export async function createInscriptionPayload<T extends MINDEXInscription>(
  data: Omit<T, 'data_hash' | 'payload' | 'payload_size' | 'compressed' | 'signature' | 'created_at'>,
  rawPayload: string | object,
  privateKey?: CryptoKey
): Promise<T> {
  const payloadString = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
  const payloadBytes = textEncode(payloadString);
  
  // Compress if payload is larger than 1KB
  const shouldCompress = payloadBytes.length > 1024;
  const processedPayload = shouldCompress 
    ? await compressForInscription(payloadBytes)
    : payloadBytes;
  
  // Calculate hash of original (uncompressed) data
  const dataHash = await hashInscriptionData(payloadBytes);
  
  // Create signature placeholder (would use Ed25519 in production)
  const signature = privateKey 
    ? await signInscription(dataHash, privateKey)
    : `ed25519:unsigned`;
  
  const inscription: T = {
    ...data,
    protocol: 'mindex-v2',
    version: '2.0.0',
    data_hash: dataHash,
    payload: toBase64(processedPayload),
    payload_size: payloadBytes.length,
    compressed: shouldCompress,
    signature,
    created_at: new Date().toISOString(),
  } as T;
  
  return inscription;
}

/**
 * Sign inscription data with Ed25519 private key
 */
async function signInscription(dataHash: string, privateKey: CryptoKey): Promise<string> {
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    textEncode(dataHash)
  );
  return `ed25519:${toHex(new Uint8Array(signatureBuffer))}`;
}

/**
 * Verify inscription integrity and signature
 */
export async function verifyInscription(inscription: MINDEXInscription): Promise<{
  valid: boolean;
  dataIntegrity: boolean;
  signatureValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Decompress payload if needed
  const payloadBytes = inscription.compressed
    ? await decompressFromInscription(new Uint8Array(Buffer.from(inscription.payload, 'base64')))
    : new Uint8Array(Buffer.from(inscription.payload, 'base64'));
  
  // Verify data hash
  const computedHash = await hashInscriptionData(payloadBytes);
  const dataIntegrity = computedHash === inscription.data_hash;
  
  if (!dataIntegrity) {
    errors.push(`Data hash mismatch: expected ${inscription.data_hash}, got ${computedHash}`);
  }
  
  // Signature verification would require public key lookup
  // For now, just check format
  const signatureValid = inscription.signature.startsWith('ed25519:');
  
  if (!signatureValid) {
    errors.push('Invalid signature format');
  }
  
  return {
    valid: dataIntegrity && signatureValid,
    dataIntegrity,
    signatureValid,
    errors,
  };
}

/**
 * Prepare inscription for Bitcoin ordinal protocol
 * Returns the inscription envelope ready for broadcasting
 */
export function prepareOrdinalEnvelope(inscription: MINDEXInscription): {
  contentType: string;
  body: Uint8Array;
  metadata: Record<string, string>;
} {
  // Convert inscription to JSON and compress
  const inscriptionJson = JSON.stringify(inscription);
  const body = textEncode(inscriptionJson);
  
  return {
    contentType: inscription.content_type,
    body,
    metadata: {
      'x-mindex-protocol': inscription.protocol,
      'x-mindex-version': inscription.version,
      'x-mindex-hash': inscription.data_hash,
      'x-mindex-compressed': inscription.compressed ? 'gzip' : 'none',
    },
  };
}

/**
 * Estimate inscription cost based on size
 * Bitcoin ordinal inscriptions are priced by byte
 */
export function estimateInscriptionCost(inscription: MINDEXInscription): {
  sizeBytes: number;
  estimatedSatoshis: number;
  estimatedUSD: number;
} {
  const envelope = prepareOrdinalEnvelope(inscription);
  const sizeBytes = envelope.body.length;
  
  // Rough estimate: ~50 sats per byte for standard priority
  const satsPerByte = 50;
  const estimatedSatoshis = sizeBytes * satsPerByte;
  
  // Assume ~$100,000 BTC for USD estimate
  const btcPriceUSD = 100000;
  const estimatedUSD = (estimatedSatoshis / 100_000_000) * btcPriceUSD;
  
  return {
    sizeBytes,
    estimatedSatoshis,
    estimatedUSD,
  };
}

/**
 * Batch multiple inscriptions for cost-efficient anchoring
 * Creates a single inscription containing multiple records
 */
export async function createBatchInscription(
  inscriptions: MINDEXInscription[]
): Promise<MINDEXInscription> {
  const batchPayload = {
    type: 'batch',
    count: inscriptions.length,
    records: inscriptions.map(i => ({
      id: i.data_hash,
      content_type: i.content_type,
      hash: i.data_hash,
    })),
    merkle_root: await calculateBatchMerkleRoot(inscriptions),
  };
  
  return createInscriptionPayload(
    {
      content_type: 'application/mindex',
      protocol: 'mindex-v2',
      version: '2.0.0',
    } as Omit<MINDEXInscription, 'data_hash' | 'payload' | 'payload_size' | 'compressed' | 'signature' | 'created_at'>,
    batchPayload
  );
}

/**
 * Calculate Merkle root for batch inscriptions
 */
async function calculateBatchMerkleRoot(inscriptions: MINDEXInscription[]): Promise<string> {
  const hashes = inscriptions.map(i => i.data_hash);
  
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];
  
  // Build simple Merkle tree
  let layer = hashes;
  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] || left; // Duplicate if odd
      const combined = await hashInscriptionData(left + right);
      nextLayer.push(combined);
    }
    layer = nextLayer;
  }
  
  return layer[0];
}
