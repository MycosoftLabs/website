/**
 * Ground Station Database Client
 *
 * Shared database client for ground station API routes.
 * Uses @vercel/postgres with Drizzle ORM.
 */

import { sql } from "@vercel/postgres"
import { drizzle } from "drizzle-orm/vercel-postgres"
import * as schema from "@/schema/ground-station"

export const gsDb = drizzle(sql, { schema })
export { schema }
