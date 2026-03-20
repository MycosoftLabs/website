/**
 * Ground Station Database Client
 *
 * Shared database client for ground station API routes.
 * Uses @neondatabase/serverless with Drizzle ORM (compatible with Supabase Postgres).
 */

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "@/schema/ground-station"

let _gsDb: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_gsDb) {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!databaseUrl) {
      throw new Error("Ground Station: No DATABASE_URL or POSTGRES_URL configured")
    }
    const queryClient = neon(databaseUrl)
    _gsDb = drizzle(queryClient, { schema })
  }
  return _gsDb
}

export const gsDb = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const db = getDb()
    const value = Reflect.get(db, prop, receiver)
    return typeof value === "function" ? value.bind(db) : value
  },
})
export { schema }
