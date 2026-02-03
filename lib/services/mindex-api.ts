/**
 * MINDEX Database Service
 * Interface to the MYCA biological data warehouse
 */

const MINDEX_URL = process.env.NEXT_PUBLIC_MINDEX_URL || 'http://192.168.0.188:8001/mindex'

export interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
  fields: string[]
}

export interface Embedding {
  id: string
  vector: number[]
  metadata: Record<string, unknown>
}

export interface SearchResult {
  id: string
  score: number
  metadata: Record<string, unknown>
}

export interface KnowledgeNode {
  id: string
  type: string
  properties: Record<string, unknown>
  edges: KnowledgeEdge[]
}

export interface KnowledgeEdge {
  id: string
  type: string
  target: string
  properties: Record<string, unknown>
}

export class MINDEXApiService {
  private baseUrl: string

  constructor(baseUrl: string = MINDEX_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`MINDEX Error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // General Queries
  async query(table: string, conditions?: Record<string, unknown>, limit = 100): Promise<QueryResult> {
    return this.request('/query', {
      method: 'POST',
      body: JSON.stringify({ table, conditions, limit }),
    })
  }

  // Telemetry
  async getTelemetryHistory(deviceId: string, sensorType: string, startTime: string, endTime: string): Promise<QueryResult> {
    return this.query('natureos.telemetry', {
      device_id: deviceId,
      sensor_type: sensorType,
      timestamp_gte: startTime,
      timestamp_lte: endTime,
    }, 1000)
  }

  // Experiments
  async getExperimentHistory(experimentId: string): Promise<QueryResult> {
    return this.query('simulation.runs', { experiment_id: experimentId })
  }

  async getExperimentResults(experimentId: string): Promise<QueryResult> {
    return this.request(`/experiments/${experimentId}/results`)
  }

  // FCI Signals
  async getFCISignalHistory(sessionId: string, startTime: string, endTime: string): Promise<QueryResult> {
    return this.query('bio.electrical_signals', {
      session_id: sessionId,
      timestamp_gte: startTime,
      timestamp_lte: endTime,
    }, 10000)
  }

  // Vector Search
  async searchSimilar(embedding: number[], table: string, limit = 10): Promise<SearchResult[]> {
    return this.request('/vector/search', {
      method: 'POST',
      body: JSON.stringify({ embedding, table, limit }),
    })
  }

  async getEmbeddings(ids: string[]): Promise<Embedding[]> {
    return this.request('/vector/embeddings', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  }

  // Knowledge Graph
  async getKnowledgeNode(nodeId: string, depth = 1): Promise<KnowledgeNode> {
    return this.request(`/knowledge/nodes/${nodeId}?depth=${depth}`)
  }

  async searchKnowledge(query: string, limit = 20): Promise<KnowledgeNode[]> {
    return this.request('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    })
  }

  async createKnowledgeEdge(sourceId: string, targetId: string, edgeType: string, properties?: Record<string, unknown>): Promise<KnowledgeEdge> {
    return this.request('/knowledge/edges', {
      method: 'POST',
      body: JSON.stringify({ source: sourceId, target: targetId, type: edgeType, properties }),
    })
  }

  // Ledger/Provenance
  async getProvenanceChain(dataId: string): Promise<object[]> {
    return this.request(`/ledger/provenance/${dataId}`)
  }

  async verifyIntegrity(dataId: string): Promise<{ valid: boolean; hash: string }> {
    return this.request(`/ledger/verify/${dataId}`)
  }

  // Species Data
  async getSpeciesData(speciesId: string): Promise<object> {
    return this.request(`/species/${speciesId}`)
  }

  async searchSpecies(query: string): Promise<object[]> {
    return this.request(`/species/search?q=${encodeURIComponent(query)}`)
  }
}

export const mindexApi = new MINDEXApiService()
