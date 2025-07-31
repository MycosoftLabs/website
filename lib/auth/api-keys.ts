import { neon } from "@neondatabase/serverless"

// Initialize the SQL client with the database URL
const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "")

// Cache API key verification results for 5 minutes
const apiKeyCache = new Map<string, { isValid: boolean; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Verify if an API key is valid
 * @param apiKey The API key to verify
 * @returns Boolean indicating if the key is valid
 */
export async function verifyApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false

  // Check cache first
  const cached = apiKeyCache.get(apiKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.isValid
  }

  try {
    // In development mode, accept a test key
    if (process.env.NODE_ENV === "development" && apiKey === "test-api-key") {
      apiKeyCache.set(apiKey, { isValid: true, timestamp: Date.now() })
      return true
    }

    // Check the database for the API key
    const result = await sql`
      SELECT * FROM api_keys 
      WHERE key = ${apiKey} 
      AND active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    `

    const isValid = result.length > 0

    // Cache the result
    apiKeyCache.set(apiKey, { isValid, timestamp: Date.now() })

    return isValid
  } catch (error) {
    console.error("API key verification error:", error)
    return false
  }
}

/**
 * Create a new API key for an agent
 * @param agentId The ID of the agent
 * @param description Description of the API key
 * @param expiresInDays Number of days until the key expires (null for no expiration)
 * @returns The generated API key or null if creation failed
 */
export async function createApiKey(
  agentId: string,
  description: string,
  expiresInDays: number | null = 90,
): Promise<string | null> {
  try {
    // Generate a random API key
    const key = `myc_${crypto.randomUUID().replace(/-/g, "")}`

    // Calculate expiration date if provided
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null

    // Insert the key into the database
    await sql`
      INSERT INTO api_keys (key, agent_id, description, created_at, expires_at, active)
      VALUES (${key}, ${agentId}, ${description}, NOW(), ${expiresAt}, true)
    `

    return key
  } catch (error) {
    console.error("API key creation error:", error)
    return null
  }
}

/**
 * Revoke an API key
 * @param apiKey The API key to revoke
 * @returns Boolean indicating if the key was successfully revoked
 */
export async function revokeApiKey(apiKey: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE api_keys
      SET active = false
      WHERE key = ${apiKey}
    `

    // Remove from cache
    apiKeyCache.delete(apiKey)

    return result.count > 0
  } catch (error) {
    console.error("API key revocation error:", error)
    return false
  }
}
