// MAS API Configuration
// Connects to MAS Orchestrator backend

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export const API_CONFIG = {
  MAS_URL,
  ENDPOINTS: {
    // Scientific
    LAB_INSTRUMENTS: `${MAS_URL}/scientific/lab/instruments`,
    SIMULATIONS: `${MAS_URL}/scientific/simulation/jobs`,
    EXPERIMENTS: `${MAS_URL}/scientific/experiments`,
    HYPOTHESES: `${MAS_URL}/scientific/hypotheses`,
    FCI_SESSIONS: `${MAS_URL}/scientific/bio/fci/sessions`,
    MYCOBRAIN_STATUS: `${MAS_URL}/scientific/bio/mycobrain/status`,
    SAFETY: `${MAS_URL}/scientific/safety/status`,
    
    // MINDEX
    MINDEX_QUERY: `${MAS_URL}/mindex/query`,
    MINDEX_STATS: `${MAS_URL}/mindex/stats`,
    MINDEX_SPECIES: `${MAS_URL}/mindex/species`,
    MINDEX_VECTOR: `${MAS_URL}/mindex/vector/search`,
    MINDEX_KNOWLEDGE: `${MAS_URL}/mindex/knowledge`,
    
    // Autonomous
    AUTO_EXPERIMENTS: `${MAS_URL}/autonomous/experiments`,
    HYPOTHESES_GENERATE: `${MAS_URL}/autonomous/hypotheses/generate`,
    LITERATURE_SEARCH: `${MAS_URL}/autonomous/literature/search`,
    
    // Bio
    MYCOBRAIN: `${MAS_URL}/bio/mycobrain`,
    DNA_STORAGE: `${MAS_URL}/bio/dna-storage`,
    
    // Platform
    ORGANIZATIONS: `${MAS_URL}/platform/organizations`,
    
    // NatureOS (devices)
    DEVICES: `${MAS_URL}/natureos/devices`,
    TELEMETRY: `${MAS_URL}/natureos/telemetry`,
  }
}

export async function fetchMAS(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${MAS_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`MAS API error: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

export default API_CONFIG
