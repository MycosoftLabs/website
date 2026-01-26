/**
 * Qdrant Connector - Vector Similarity Search
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

const QDRANT_URL = process.env.QDRANT_URL || "http://192.168.0.188:6333"

export class QdrantConnector implements BaseConnector {
  readonly name = "Qdrant Vector DB"
  readonly sourceType = "qdrant" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    try {
      // Use semantic search via local API route (which handles embeddings)
      const response = await fetch(`/api/search/semantic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: intent.rawQuery,
          collection: this.getCollection(intent),
          limit: options?.maxResults || 10,
          filters: options?.filters,
        }),
        signal: AbortSignal.timeout(options?.timeout || 15000),
      })
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: Array.isArray(data) ? data : data.results || [],
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      // Fallback: Try direct Qdrant search endpoint
      try {
        const qdrantResponse = await fetch(`${QDRANT_URL}/collections/${this.getCollection(intent)}/points/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            limit: options?.maxResults || 10,
            with_payload: true,
            // Note: This requires pre-computed embeddings or an embedding service
          }),
          signal: AbortSignal.timeout(options?.timeout || 10000),
        })
        
        if (qdrantResponse.ok) {
          const data = await qdrantResponse.json()
          return {
            success: true,
            data: data.result || [],
            queryTime: Date.now() - startTime,
            source: this.sourceType,
          }
        }
      } catch {
        // Qdrant not available
      }
      
      return {
        success: false,
        data: [],
        error: "Vector search failed",
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Unknown error",
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    }
  }
  
  private getCollection(intent: Intent): string {
    const rawQuery = intent.rawQuery.toLowerCase()
    
    // Map query content to collections
    if (/doc|documentation|guide|readme/i.test(rawQuery)) {
      return "documents"
    }
    if (/species|fungi|mushroom/i.test(rawQuery)) {
      return "species_embeddings"
    }
    if (/research|paper|study/i.test(rawQuery)) {
      return "research_papers"
    }
    if (/agent|workflow/i.test(rawQuery)) {
      return "agent_knowledge"
    }
    
    // Default collection
    return "documents"
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${QDRANT_URL}/collections`, {
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
