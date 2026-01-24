# MINDEX v2 Implementation Guide

> **Version**: 2.0  
> **Last Updated**: January 23, 2026  
> **Status**: Implementation Complete

## Overview

MINDEX v2 represents a major upgrade to Mycosoft's Data Integrity Index system. This document details the implementation of cryptographic integrity verification, real-time streaming via the Mycorrhizae Protocol, multi-protocol APIs, and system-wide integrations.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MINDEX v2 Architecture                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Website    │    │   NatureOS   │    │   MAS/MICA   │          │
│  │   (Public)   │    │ (Dashboard)  │    │   (Agents)   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                    Next.js API Routes                    │       │
│  │  /api/mindex/graphql | /api/mindex/stream/* | /verify/*  │       │
│  └─────────────────────────────────────────────────────────┘       │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                     MINDEX SDK v2                        │       │
│  │    Crypto | Streaming | GraphQL | gRPC | Anchoring       │       │
│  └─────────────────────────────────────────────────────────┘       │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                 MINDEX PostgreSQL Backend                │       │
│  │           PostGIS | Hash Chains | Merkle Trees           │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Foundation

**Location**: `lib/mindex/crypto/`

#### Files

| File | Purpose |
|------|---------|
| `encoding.ts` | Base64/Hex encoding utilities |
| `signatures.ts` | Ed25519 digital signatures |
| `hash-chain.ts` | SHA-256 hash chain implementation |
| `merkle-tree.ts` | Merkle tree for proof generation |

#### Usage Example

```typescript
import { createRecord, verifyRecordChain } from '@/lib/mindex/crypto/hash-chain';
import { buildMerkleTree, getMerkleProof } from '@/lib/mindex/crypto/merkle-tree';

// Create a new MINDEX record with hash chain
const record = await createRecord(data, previousHash, privateKey);

// Verify the integrity of a record chain
const isValid = await verifyRecordChain(records);

// Build Merkle tree and get proof
const tree = buildMerkleTree(recordHashes);
const proof = getMerkleProof(tree, recordHash);
```

### 2. Real-Time Streaming (Mycorrhizae Protocol)

**Location**: `lib/mindex/streaming/`

#### Files

| File | Purpose |
|------|---------|
| `sse-manager.ts` | Server-Sent Events connection manager |
| `mycorrhizae-client.ts` | Client for Mycorrhizae Protocol channels |

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mindex/stream/channels` | GET | List available streaming channels |
| `/api/mindex/stream/subscribe` | GET | SSE endpoint for real-time data |
| `/api/mindex/stream/publish` | POST | Publish data to a channel |

#### Channel Types

- `telemetry` - Real-time device sensor data
- `observations` - Field observation updates
- `taxa` - Taxonomy database changes
- `alerts` - System alerts and notifications
- `agent-insights` - MAS agent computed insights

### 3. Multi-Protocol API

#### GraphQL

**Endpoint**: `/api/mindex/graphql`

**Schema Types**:
- `Taxon` - Fungal species information
- `Observation` - Field observation data
- `TaxaResponse` / `ObservationsResponse` - Paginated responses

**Queries**:
```graphql
query {
  taxa(q: "Amanita", page: 1, page_size: 20) {
    data {
      id
      canonical_name
      common_name
      rank
    }
    meta
  }
  
  observations(q: "location:forest", page: 1) {
    data {
      id
      taxon_id
      observed_at
      location {
        type
        coordinates
      }
    }
  }
  
  health
}
```

#### gRPC

**Proto File**: `lib/mindex/grpc/mindex.proto`

**Services**:
- `StreamTelemetry` - Stream telemetry from devices
- `SendCommand` - Send commands to devices

### 4. Integrity Verification APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mindex/verify/[id]` | GET | Verify record integrity |
| `/api/mindex/integrity/proof/[id]` | GET | Get Merkle proof for record |
| `/api/mindex/integrity/verify` | POST | Batch verification |

### 5. Ledger Anchoring

**Location**: `lib/mindex/anchoring/anchor.ts`

**Supported Ledgers**:
- Hypergraph DAG
- Solana
- Bitcoin Ordinals (future)

**API Endpoint**: `/api/mindex/anchor`

### 6. Agent APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mindex/agents/telemetry/latest` | GET | Latest telemetry for agents |
| `/api/mindex/agents/anomalies` | GET | Detected anomalies |
| `/api/mindex/agents/commands/queue` | POST | Queue device commands |
| `/api/mindex/agents/insights/publish` | POST | Publish computed insights |

## UI Components

**Location**: `components/mindex/`

| Component | Purpose |
|-----------|---------|
| `integrity-badge.tsx` | Shows verification status |
| `live-stats.tsx` | Real-time MINDEX statistics |
| `search-input.tsx` | Unified search across MINDEX |
| `telemetry-chart.tsx` | Streaming telemetry visualization |
| `verification-panel.tsx` | Merkle proof display |

## Dashboard Integration

The NatureOS MINDEX dashboard (`/natureos/mindex`) now includes:

- **Overview Tab**: API status, database connection, stats
- **Encyclopedia Tab**: Taxa browser
- **Data Pipeline Tab**: ETL status
- **Integrity Tab**: Record verification tools *(NEW)*
- **Containers Tab**: Docker container status

## App Integrations

All apps now query MINDEX for real data:

| App | MINDEX Integration |
|-----|-------------------|
| Compound Simulator | Bioactive compound data |
| Growth Analytics | Species traits, telemetry |
| Mushroom Simulator | Growth parameters |
| Petri Dish Simulator | Culture patterns |
| Spore Tracker | Observation geospatial data |

## Environment Variables

Required for full functionality:

```env
# Required
MINDEX_API_BASE_URL=https://mindex.mycosoft.net
MINDEX_API_KEY=your-api-key

# Optional
INTEGRATIONS_ENABLED=true
MINDEX_GRPC_HOST=localhost:50051
HYPERGRAPH_API_URL=https://hypergraph.mycosoft.net
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Testing Endpoints

All endpoints return helpful error messages when integrations are disabled:

```json
{
  "error": "Integrations disabled",
  "code": "INTEGRATIONS_DISABLED",
  "requiredEnv": ["INTEGRATIONS_ENABLED=true", "MINDEX_API_BASE_URL"]
}
```

## Public MINDEX Page

A new public-facing page at `/mindex` explains:

- What MINDEX is and why it was created
- Cryptographic integrity features
- Data pipeline from device to database
- Developer API access
- Use cases

Features interactive animations:
- Particle trails (Cryptographic Integrity section)
- Color diffusion (Trusted Data section)
- Three.js particle constellation (CTA section)

## Migration Notes

### Mock Data Removal

All mock data fallbacks have been removed from:

- `/api/mindex/*`
- `/api/docker/*`
- `/api/unifi/*`
- `/api/ancestry/*`
- `/api/storage/*`
- `/api/natureos/*`

APIs now return clear errors if backends are unavailable.

### SDK Updates

The MINDEX SDK (`lib/sdk/mindex.ts`) has been extended with:

```typescript
// New v2 methods
getRecordWithProof(id: string): Promise<{ record, merkleProof }>
subscribeToChannel(channel: MycorrhizaeChannel): EventSource
verifyRecordIntegrity(id: string): Promise<{ valid, proof }>
anchorToLedger(recordIds: string[], ledger: 'hypergraph' | 'solana'): Promise<TxResult>
```

## Article-Derived Enhancements (January 2026)

Based on Mycosoft Labs published research, the following advanced modules have been integrated:

### 7. Bitcoin Ordinals Integration

**Location**: `lib/mindex/ordinals/`

Enables permanent inscription of biological data into Bitcoin blockchain:

- `MINDEXInscription` - Base inscription format
- `DNAInscription` - Genome/barcode sequences
- `TaxaInscription` - Species records
- SHA-256 + GZIP + Ed25519 for integrity

**Source**: [Inscribing DNA Into Bitcoin](https://medium.com/@mycosoft.inc/inscribing-dna-into-bitcoin-1cd783ddd24c)

### 8. Mycorrhizal Network Modeling

**Location**: `lib/mindex/mycorrhizae/`

Models plant-fungi symbiotic networks:

- `MycorrhizalNode` - Network nodes (fungi, plants, sensors)
- `MycorrhizalEdge` - Connection types (ectomycorrhizal, arbuscular)
- `buildNetworkFromData()` - Construct from MINDEX data
- `simulateSignalPropagation()` - M-Wave inspired signal flow

### 9. Phylogenetic Trees

**Location**: `lib/mindex/phylogeny/`

DNA ancestry visualization:

- `PhylogeneticNode` - Tree node with genomic data
- `PhylogeneticTree` - Complete tree structure
- `toNewickFormat()` - Standard phylogenetic export
- `toD3Hierarchy()` - Visualization-ready format

### 10. Hypha Programming Language (HPL)

**Location**: `lib/mindex/hpl/`

Domain-specific language for biological computing:

- Biological metaphor keywords (spawn, branch, sense, emit, fruit)
- Integration with MycoBrain firmware
- Sensor reading and environmental control

**Source**: [Introduction to HPL](https://medium.com/@mycosoft.inc/introduction-to-the-hypha-programming-language-hpl-069567239474)

### 11. Fungal Computer Interface (FCI)

**Location**: `lib/mindex/fci/`

Protocol for mycelium-computer communication:

- `FCIChannel` - Communication pathways
- `FCIReading` - Standardized measurements
- `FCIProtocolHandler` - Message processing
- Pattern recognition for bioelectric signals

**Source**: [Fungal Computer Interface](https://medium.com/@mycosoft.inc/fungal-computer-interface-fci-c0c444611cc1)

### 12. M-Wave Seismic Analysis

**Location**: `lib/mindex/mwave/`

Distributed sensing via mycelium networks:

- `MWaveAnalyzer` - Processes sensor readings
- `MWaveAnomaly` - Detected anomalies
- `MWavePrediction` - Risk assessment
- Synchronized response detection

**Source**: [The M-Wave](https://www.researchhub.com/paper/9306882/the-m-wave-harnessing-mycelium-networks-for-earthquake-prediction)

---

## Future Enhancements

- [ ] WebSocket support alongside SSE
- [ ] GraphQL subscriptions for real-time updates
- [ ] Redis pub/sub for multi-instance scaling
- [ ] Full gRPC server implementation
- [x] Bitcoin Ordinals module (implemented)
- [ ] Vector embeddings for semantic search
- [ ] HPL Parser (full AST generation)
- [ ] Network Visualization (D3/Three.js)
- [ ] FCI Hardware Integration

## Related Documentation

- [MINDEX Article Concepts](./MINDEX_ARTICLE_CONCEPTS.md) - Detailed breakdown of article-derived features
- [MINDEX Technical Specification](../docs/mindex-spec.md)
- [Mycorrhizae Protocol](../docs/mycorrhizae-protocol.md)
- [SporeBase Technical Specification](../../MAS/mycosoft-mas/docs/SPOREBASE_TECHNICAL_SPECIFICATION.md)
- [Deployment Protocol](../../MAS/mycosoft-mas/docs/DEPLOYMENT_PROTOCOL_MANDATORY.md)

## Source Articles

1. [MINDEX™ - Mycological Decentralized Database](https://medium.com/@mycosoft.inc/mindex-84ec7ed68621)
2. [Inscribing DNA Into Bitcoin](https://medium.com/@mycosoft.inc/inscribing-dna-into-bitcoin-1cd783ddd24c)
3. [Introduction to the Hypha Programming Language (HPL)](https://medium.com/@mycosoft.inc/introduction-to-the-hypha-programming-language-hpl-069567239474)
4. [Fungal Computer Interface (FCI)](https://medium.com/@mycosoft.inc/fungal-computer-interface-fci-c0c444611cc1)
5. [The M-Wave: Harnessing Mycelium Networks for Earthquake Prediction](https://www.researchhub.com/paper/9306882/the-m-wave-harnessing-mycelium-networks-for-earthquake-prediction)
