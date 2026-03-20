/**
 * Ground Station Database Client
 *
 * Shared database client for ground station API routes.
 * Uses @neondatabase/serverless with Drizzle ORM (compatible with Supabase Postgres).
 */

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "@/schema/ground-station"

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!databaseUrl) {
  console.warn("Ground Station: No DATABASE_URL or POSTGRES_URL configured")
}

const queryClient = neon(databaseUrl || "")
export const gsDb = drizzle(queryClient, { schema })
export { schema }
