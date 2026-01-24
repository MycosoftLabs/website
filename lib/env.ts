/**
 * Environment Variable Configuration
 *
 * Validates and exports environment variables for the application
 * Supports MINDEX, NatureOS, MYCA MAS, Ledger, and M-Wave integrations
 */

export const env = {
  // NatureOS API Configuration (legacy - for backward compatibility)
  natureosApiUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.mycosoft.org/v1",

  // MINDEX API Configuration (canonical data layer)
  mindexApiBaseUrl: process.env.MINDEX_API_BASE_URL || "http://192.168.0.187:8000",
  mindexApiKey: process.env.MINDEX_API_KEY || "local-dev-key", // Server-only

  // MYCA MAS API Configuration (multi-agent orchestration)
  mycaMasApiBaseUrl: process.env.MYCA_MAS_API_BASE_URL || "https://myca.mycosoft.org/api/v1",
  mycaMasApiKey: process.env.MYCA_MAS_API_KEY, // Server-only, never expose to client

  // NatureOS Platform API (optional domain layer)
  natureosApiBaseUrl: process.env.NATUREOS_API_BASE_URL || "https://natureos.mycosoft.org/api/v1",

  // Mycorrhizae Streaming Configuration
  mycorrhizaePublishKey: process.env.MYCORRHIZAE_PUBLISH_KEY,

  // Ledger RPC Endpoints
  solanaRpcUrl: process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL,
  bitcoinRpcUrl: process.env.BITCOIN_RPC_URL,
  hypergraphNodeUrl: process.env.HYPERGRAPH_NODE_URL || "http://localhost:9000",

  // Mempool.space API for Bitcoin fee estimation
  mempoolApiUrl: process.env.MEMPOOL_API_URL || "https://mempool.space/api",

  // USGS Earthquake API for M-Wave
  usgsApiUrl: process.env.USGS_API_URL || "https://earthquake.usgs.gov/earthquakes/feed/v1.0",

  // Redis Configuration
  redisUrl: process.env.REDIS_URL || "redis://192.168.0.187:6379",

  // Supabase Configuration
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Feature Flags
  integrationsEnabled: process.env.INTEGRATIONS_ENABLED === "true",

  // Development
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
}

// Generate a default Mycorrhizae key if not set (for development only)
function generateDefaultKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Auto-generate Mycorrhizae key in development if not set
if (typeof window === "undefined" && env.isDevelopment && !env.mycorrhizaePublishKey) {
  const devKey = generateDefaultKey()
  ;(env as any).mycorrhizaePublishKey = devKey
  console.log(`[DEV] Auto-generated MYCORRHIZAE_PUBLISH_KEY: ${devKey}`)
}

// Server-side validation
if (typeof window === "undefined") {
  const warnIfMissing = (name: string, value: string | undefined, required = false) => {
    if (!value) {
      if (required || env.integrationsEnabled) {
        console.warn(`Warning: ${name} is not set. Some features may not work.`)
      }
    }
  }

  warnIfMissing("MINDEX_API_BASE_URL", process.env.MINDEX_API_BASE_URL)
  warnIfMissing("MYCA_MAS_API_BASE_URL", process.env.MYCA_MAS_API_BASE_URL)
  warnIfMissing("MYCORRHIZAE_PUBLISH_KEY", process.env.MYCORRHIZAE_PUBLISH_KEY)
  warnIfMissing("SOLANA_RPC_URL", env.solanaRpcUrl)
}
