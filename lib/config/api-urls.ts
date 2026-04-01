/**
 * Centralized API URL Configuration
 * Created: February 11, 2026
 * 
 * Single source of truth for all VM and service URLs.
 * Import this instead of hardcoding URLs in API routes.
 */

// VM IP addresses
const SANDBOX_VM_IP = "192.168.0.187"
const MAS_VM_IP = process.env.MAS_VM_HOST || "localhost"
const MINDEX_VM_IP = process.env.MINDEX_VM_HOST || "localhost"

// Default ports
const MAS_PORT = "8001"
const MINDEX_PORT = "8000"
const WEBSITE_PORT = "3000"
const N8N_PORT = "5678"
const REDIS_PORT = "6379"
const POSTGRES_PORT = "5432"
const QDRANT_PORT = "6333"
const OLLAMA_PORT = "11434"

/**
 * API URLs - use environment variables with sensible defaults
 */
export const API_URLS = {
  // MAS Orchestrator (VM 188, port 8001)
  MAS: process.env.MAS_API_URL || `http://${MAS_VM_IP}:${MAS_PORT}`,
  
  // MINDEX Database API (VM 189, port 8000)
  MINDEX: process.env.MINDEX_API_URL || `http://${MINDEX_VM_IP}:${MINDEX_PORT}`,
  
  // Mycorrhizae Protocol API (VM 187, port 8002)
  MYCORRHIZAE: process.env.MYCORRHIZAE_API_URL || `http://${SANDBOX_VM_IP}:8002`,
  
  // n8n Workflow Automation (VM 188, port 5678)
  N8N: process.env.N8N_URL || `http://${MAS_VM_IP}:${N8N_PORT}`,
  
  // Redis Cache (VM 189, port 6379)
  REDIS: process.env.REDIS_URL || `redis://${MINDEX_VM_IP}:${REDIS_PORT}`,
  
  // PostgreSQL Database (VM 189, port 5432)
  POSTGRES: process.env.DATABASE_URL || `postgresql://postgres:postgres@${MINDEX_VM_IP}:${POSTGRES_PORT}/mindex`,
  
  // Qdrant Vector Database (VM 189, port 6333)
  QDRANT: process.env.QDRANT_URL || `http://${MINDEX_VM_IP}:${QDRANT_PORT}`,
  
  // Ollama LLM (VM 188, port 11434)
  OLLAMA: process.env.OLLAMA_URL || `http://${MAS_VM_IP}:${OLLAMA_PORT}`,
  
  // Local development base URL
  LOCAL_BASE: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010",
  
  // Production website
  PRODUCTION: "https://mycosoft.com",
} as const

/**
 * MYCA Brain API endpoints
 */
export const MYCA_ENDPOINTS = {
  CHAT: `${API_URLS.MAS}/api/myca/chat`,
  STATUS: `${API_URLS.MAS}/api/myca/status`,
  AWAKEN: `${API_URLS.MAS}/api/myca/awaken`,
  SOUL: `${API_URLS.MAS}/api/myca/soul`,
  EMOTIONS: `${API_URLS.MAS}/api/myca/emotions`,
  IDENTITY: `${API_URLS.MAS}/api/myca/identity`,
  WORLD: `${API_URLS.MAS}/api/myca/world`,
  /** Website proxy for worldstate (use for client-side to avoid CORS) */
  WORLD_PROXY: "/api/mas/world",
  WORLD_SUMMARY: "/api/mas/world/summary",
  WORLD_REGION: "/api/mas/world/region",
  WORLD_SOURCES: "/api/mas/world/sources",
  WORLD_DIFF: "/api/mas/world/diff",
  INTENTION: `${API_URLS.MAS}/api/myca/intention`,
  BRAIN_QUERY: `${API_URLS.MAS}/api/brain/query`,
  BRAIN_STREAM: `${API_URLS.MAS}/voice/brain/stream`,
  FRONTIER_LLM: `${API_URLS.MAS}/api/llm/frontier`,
} as const

/**
 * AVANI Governance endpoints
 * Embedded engine runs locally; standalone backend will run from `avani` repo.
 */
export const AVANI_ENDPOINTS = {
  STATUS: "/api/avani/status",
  EVALUATE: "/api/avani/evaluate",
  RULES: "/api/avani/rules",
  // Standalone backend (when deployed from `avani` repo)
  BACKEND_STATUS: process.env.AVANI_API_URL ? `${process.env.AVANI_API_URL}/api/avani/status` : null,
  BACKEND_EVALUATE: process.env.AVANI_API_URL ? `${process.env.AVANI_API_URL}/api/avani/evaluate` : null,
} as const

/**
 * MINDEX API endpoints
 */
export const MINDEX_ENDPOINTS = {
  TAXA: `${API_URLS.MINDEX}/api/mindex/taxa`,
  SPECIES: `${API_URLS.MINDEX}/api/mindex/species`,
  COMPOUNDS: `${API_URLS.MINDEX}/api/mindex/compounds`,
  GENETICS: `${API_URLS.MINDEX}/api/mindex/genetics`,
  RESEARCH: `${API_URLS.MINDEX}/api/mindex/research`,
  UNIFIED_SEARCH: `${API_URLS.MINDEX}/api/mindex/unified-search`,
  HEALTH: `${API_URLS.MINDEX}/health`,
  // Earth Intelligence endpoints (MINDEX backend migration)
  EARTH_SEARCH: `${API_URLS.MINDEX}/api/search/earth`,
  EARTH_MAP_BBOX: `${API_URLS.MINDEX}/api/earth/map/bbox`,
  EARTH_STATS: `${API_URLS.MINDEX}/api/earth/stats`,
  EARTH_CREP_SYNC: `${API_URLS.MINDEX}/api/earth/crep/sync`,
  EARTH_MAP_LAYERS: `${API_URLS.MINDEX}/api/earth/map/layers`,
  EARTH_DOMAINS: `${API_URLS.MINDEX}/api/earth/domains`,
  EARTH_INGEST: `${API_URLS.MINDEX}/api/earth/ingest`,
  // Worldview public API (per-user API keys, segregated from internal)
  WORLDVIEW_SEARCH: `${API_URLS.MINDEX}/api/worldview/v1/search`,
  // Internal admin API (requires MINDEX_INTERNAL_TOKEN)
  INTERNAL_STATS: `${API_URLS.MINDEX}/api/mindex/internal/stats`,
  INTERNAL_BETA_STATS: `${API_URLS.MINDEX}/api/mindex/internal/beta/stats`,
  INTERNAL_USERS: `${API_URLS.MINDEX}/api/mindex/internal/users`,
} as const

/**
 * Voice and TTS endpoints
 */
export const VOICE_ENDPOINTS = {
  // PersonaPlex (local GPU, port 8998/8999)
  PERSONAPLEX_WS: process.env.PERSONAPLEX_WS_URL || "ws://localhost:8999/api/chat",
  PERSONAPLEX_HTTP: process.env.PERSONAPLEX_HTTP_URL || "http://localhost:8998",
  
  // CREP map command WebSocket (PersonaPlex Bridge CREP channel)
  // Uses PERSONAPLEX for ws - Bridge runs alongside PersonaPlex
  CREP_BRIDGE_WS:
    process.env.NEXT_PUBLIC_CREP_BRIDGE_WS ||
    process.env.CREP_BRIDGE_WS ||
    "ws://localhost:8999/ws/crep/commands",
  
  // MAS TTS endpoint
  MAS_TTS: `${API_URLS.MAS}/voice/tts`,
  
  // Voice orchestrator
  ORCHESTRATOR: `${API_URLS.MAS}/api/mas/voice/orchestrator`,
} as const

/**
 * Helper to check if an API is reachable
 */
export async function checkApiHealth(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the appropriate base URL for server-side vs client-side
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side - use relative URLs
    return ""
  }
  // Server-side - use full URL
  return API_URLS.LOCAL_BASE
}

export default API_URLS
