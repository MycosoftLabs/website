import { createClient } from "@vercel/postgres"
import { drizzle } from "drizzle-orm/vercel-postgres"
import { fungi } from "@/schema/fungi"

// Create database client
export const client = createClient()
export const db = drizzle(client)

// Type-safe database operations
export async function searchFungi(query: string) {
  return await db
    .select()
    .from(fungi)
    .where(sql`name ILIKE ${`%${query}%`}`)
    .limit(20)
}
