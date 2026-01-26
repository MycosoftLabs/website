/**
 * Memory Connector - Conversation History Search
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

export class MemoryConnector implements BaseConnector {
  readonly name = "Conversation Memory"
  readonly sourceType = "memory" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    try {
      // Get session and user from filters
      const sessionId = options?.filters?.sessionId as string
      const userId = options?.filters?.userId as string || "default"
      
      // Query memory API
      const params = new URLSearchParams()
      if (sessionId) params.set("session_id", sessionId)
      params.set("user_id", userId)
      params.set("limit", String(options?.maxResults || 50))
      
      const response = await fetch(`/api/mas/memory?${params}`, {
        signal: AbortSignal.timeout(options?.timeout || 5000),
      })
      
      if (response.ok) {
        const data = await response.json()
        const conversations = data.conversations || data.messages || []
        
        // Filter by search terms from intent
        const searchTerms = this.extractSearchTerms(intent.rawQuery)
        let filtered = conversations
        
        if (searchTerms.length > 0) {
          filtered = conversations.filter((conv: Record<string, unknown>) => {
            const content = String(conv.content || conv.message || "").toLowerCase()
            return searchTerms.some(term => content.includes(term))
          })
        }
        
        return {
          success: true,
          data: filtered,
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      return {
        success: false,
        data: [],
        error: "Memory query failed",
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
  
  private extractSearchTerms(query: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = [
      "what", "when", "did", "we", "i", "you", "discuss", "talk", "about",
      "mention", "remember", "recall", "the", "a", "an", "is", "are", "was",
      "were", "have", "has", "had", "do", "does", "our", "last", "previous",
    ]
    
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
    
    return words
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`/api/mas/memory?limit=1`, {
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Store a conversation turn to memory
   */
  async store(
    sessionId: string,
    userId: string,
    message: string,
    role: "user" | "assistant",
    agent?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/mas/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          message,
          role,
          agent,
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
