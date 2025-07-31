import { neon } from "@neondatabase/serverless"

let db: any = null

export function getDatabase() {
  if (db) {
    return db
  }

  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL

  if (!databaseUrl) {
    console.warn("No database URL found. Running in mock mode.")
    return null
  }

  try {
    db = neon(databaseUrl)
    console.log("Database connection established")
    return db
  } catch (error) {
    console.error("Failed to connect to database:", error)
    return null
  }
}

export async function testConnection() {
  const database = getDatabase()

  if (!database) {
    return { isConnected: false, error: "No database URL configured" }
  }

  try {
    await database`SELECT 1`
    return { isConnected: true }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
