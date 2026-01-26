/**
 * Documents Connector - Document Knowledge Base Search
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

export class DocumentsConnector implements BaseConnector {
  readonly name = "Document KB"
  readonly sourceType = "documents" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    try {
      // Search query from intent
      const searchQuery = this.buildSearchQuery(intent)
      
      // Try Supabase docs API
      const response = await fetch(`/api/search/docs?q=${encodeURIComponent(searchQuery)}&limit=${options?.maxResults || 10}`, {
        signal: AbortSignal.timeout(options?.timeout || 5000),
      })
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: Array.isArray(data) ? data : data.results || data.documents || [],
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      // Fallback: Search local documentation files
      const localDocs = this.searchLocalDocs(searchQuery)
      
      return {
        success: true,
        data: localDocs.slice(0, options?.maxResults || 10),
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
  
  private buildSearchQuery(intent: Intent): string {
    let query = intent.rawQuery
    
    // Remove common prefixes
    query = query.replace(/^(find|search|look\s+for|show|get)\s+(docs?|documentation|documents?)\s+(about|on|for)?\s*/i, "")
    query = query.replace(/^(docs?|documentation)\s+(about|on|for)?\s*/i, "")
    
    return query.trim() || intent.rawQuery
  }
  
  private searchLocalDocs(query: string): unknown[] {
    // Common documentation entries - these would be indexed in production
    const docIndex = [
      {
        id: "deployment",
        title: "Deployment Guide",
        path: "/docs/DEPLOYMENT_GUIDE.md",
        description: "Complete guide to deploying Mycosoft applications",
        keywords: ["deploy", "docker", "production", "server"],
      },
      {
        id: "mycobrain",
        title: "MycoBrain Setup",
        path: "/docs/MYCOBRAIN_SETUP.md",
        description: "Hardware setup and configuration for MycoBrain devices",
        keywords: ["mycobrain", "device", "sensor", "hardware", "esp32"],
      },
      {
        id: "mindex",
        title: "MINDEX Integration",
        path: "/docs/MINDEX_INTEGRATION.md",
        description: "MINDEX database integration and API reference",
        keywords: ["mindex", "database", "api", "query", "data"],
      },
      {
        id: "myca",
        title: "MYCA AI Guide",
        path: "/docs/MYCA_KNOWLEDGE_BASE.md",
        description: "MYCA cognitive agent documentation",
        keywords: ["myca", "ai", "agent", "orchestrator", "voice"],
      },
      {
        id: "agents",
        title: "Agent Registry",
        path: "/docs/AGENT_REGISTRY.md",
        description: "Complete list of MAS agents and their capabilities",
        keywords: ["agent", "registry", "list", "capability"],
      },
      {
        id: "n8n",
        title: "n8n Workflows",
        path: "/docs/N8N_WORKFLOWS.md",
        description: "n8n workflow automation documentation",
        keywords: ["n8n", "workflow", "automation", "webhook"],
      },
      {
        id: "security",
        title: "Security Operations",
        path: "/docs/SECURITY_OPERATIONS.md",
        description: "Security monitoring and incident response",
        keywords: ["security", "incident", "soc", "threat"],
      },
      {
        id: "voice",
        title: "Voice System Setup",
        path: "/docs/VOICE_SYSTEM_SETUP.md",
        description: "ElevenLabs and speech recognition setup",
        keywords: ["voice", "elevenlabs", "speech", "tts", "stt"],
      },
      {
        id: "topology",
        title: "MAS Topology Visualization",
        path: "/docs/MAS_TOPOLOGY_V2.2_REDESIGN_JAN26_2026.md",
        description: "3D visualization of agent network",
        keywords: ["topology", "visualization", "3d", "network", "agent"],
      },
    ]
    
    const queryTerms = query.toLowerCase().split(/\s+/)
    
    // Score each doc by keyword matches
    const scored = docIndex.map(doc => {
      let score = 0
      const allText = [doc.title, doc.description, ...doc.keywords].join(" ").toLowerCase()
      
      for (const term of queryTerms) {
        if (allText.includes(term)) {
          score += term.length > 3 ? 2 : 1
        }
        if (doc.keywords.some(k => k.includes(term))) {
          score += 3
        }
      }
      
      return { ...doc, score }
    })
    
    // Return sorted by score
    return scored
      .filter(doc => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...doc }) => doc)
  }
  
  async isAvailable(): Promise<boolean> {
    // Documents are always available (local fallback)
    return true
  }
}
