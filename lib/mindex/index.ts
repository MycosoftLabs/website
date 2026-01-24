/**
 * MINDEX v2 - Mycological Decentralized Index
 * 
 * A comprehensive platform for fungal data management, combining:
 * - Cryptographic integrity via hash chains and Merkle trees
 * - Real-time streaming via Mycorrhizae Protocol
 * - Bitcoin Ordinals integration for permanent data inscription
 * - Mycorrhizal network modeling and visualization
 * - Phylogenetic tree construction and navigation
 * - Hypha Programming Language (HPL) for biological computing
 * - Fungal Computer Interface (FCI) for device communication
 * - M-Wave seismic analysis for distributed sensing
 * 
 * @module lib/mindex
 * @version 2.0.0
 * 
 * @see https://medium.com/@mycosoft.inc/mindex-84ec7ed68621
 * @see https://medium.com/@mycosoft.inc/inscribing-dna-into-bitcoin-1cd783ddd24c
 * @see https://medium.com/@mycosoft.inc/introduction-to-the-hypha-programming-language-hpl-069567239474
 * @see https://medium.com/@mycosoft.inc/fungal-computer-interface-fci-c0c444611cc1
 * @see https://www.researchhub.com/paper/9306882/the-m-wave-harnessing-mycelium-networks-for-earthquake-prediction
 */

// Core Cryptographic Modules
export * from './crypto/encoding';
export * from './crypto/signatures';
export * from './crypto/hash-chain';
export * from './crypto/merkle-tree';

// Real-Time Streaming (Mycorrhizae Protocol)
export * from './streaming/sse-manager';
export * from './streaming/mycorrhizae-client';

// Bitcoin Ordinals Integration
export * from './ordinals';

// Mycorrhizal Network Modeling
export * from './mycorrhizae';

// Phylogenetic Trees and DNA Ancestry
export * from './phylogeny';

// Hypha Programming Language (HPL)
export * from './hpl';

// Fungal Computer Interface (FCI)
export * from './fci';

// M-Wave Seismic Analysis
export * from './mwave';

// Ledger Anchoring
export * from './anchoring/anchor';

/**
 * MINDEX Version Information
 */
export const MINDEX_VERSION = {
  major: 2,
  minor: 0,
  patch: 0,
  prerelease: null,
  build: 'article-integration',
  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}${this.prerelease ? `-${this.prerelease}` : ''}`;
  }
};

/**
 * MINDEX Feature Flags
 */
export const MINDEX_FEATURES = {
  // Core features
  HASH_CHAIN: true,
  MERKLE_TREES: true,
  ED25519_SIGNATURES: true,
  
  // Streaming
  SSE_STREAMING: true,
  MYCORRHIZAE_PROTOCOL: true,
  
  // Advanced (from articles)
  BITCOIN_ORDINALS: true,
  MYCORRHIZAL_NETWORK: true,
  PHYLOGENETIC_TREES: true,
  HPL_INTERPRETER: true,
  FCI_PROTOCOL: true,
  MWAVE_ANALYSIS: true,
  
  // Ledger anchoring
  HYPERGRAPH_ANCHORING: true,
  SOLANA_ANCHORING: false,  // Coming soon
  BITCOIN_ANCHORING: false, // Coming soon
};
