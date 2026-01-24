/**
 * MINDEX Integration with Supabase
 * 
 * Syncs MINDEX database schema and data with Supabase
 * Uses Foreign Data Wrapper (FDW) or direct replication
 */

import { createClient } from '@/lib/supabase/server'
import { env } from "@/lib/env"
import { listTaxa } from "@/lib/integrations/mindex"
import type { Taxon } from "@/lib/integrations/types"

export interface SyncResult {
  ok: boolean
  upserted: number
  pages: number
}

/**
 * Sync MINDEX taxa to Supabase species table
 */
export async function syncMINDEXTaxaToSupabase(options?: { pageSize?: number; maxPages?: number }): Promise<SyncResult> {
  if (!env.integrationsEnabled) {
    throw new Error("Integrations are disabled. Set INTEGRATIONS_ENABLED=true and provide MINDEX_API_BASE_URL/MINDEX_API_KEY.")
  }

  const supabase = await createClient()
  
  const pageSize = options?.pageSize ?? 200
  const maxPages = options?.maxPages ?? 50

  let page = 1
  let pages = 0
  let upserted = 0

  while (pages < maxPages) {
    const result = await listTaxa({ page, pageSize })
    pages += 1
    page += 1

    const taxa = result.data as Taxon[]
    if (!taxa.length) break

    const rows = taxa.map((t) => ({
      scientific_name: t.scientificName,
      common_name: t.commonName || null,
      family: t.family || null,
      description: t.description || null,
      image_url: t.imageUrl || null,
      characteristics: {
        mindex_taxon_id: t.id,
        taxonomy: {
          kingdom: t.kingdom,
          phylum: t.phylum,
          class: t.class,
          order: t.order,
          family: t.family,
          genus: t.genus,
          species: t.species,
        },
        edibility: t.edibility,
        medicinal_properties: t.medicinalProperties || [],
        habitat: t.habitat || [],
      },
    }))

    const { error } = await supabase.from("species").upsert(rows, { onConflict: "scientific_name" })
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`)

    upserted += rows.length

    if (result.meta?.hasMore === false) break
  }

  return { ok: true, upserted, pages }
}

/**
 * Sync MINDEX observations to Supabase
 */
export async function syncMINDEXObservationsToSupabase() {
  throw new Error(
    "Observations sync is not configured. Add a Supabase table for MINDEX observations (or use FDW) and then implement a real sync pipeline.",
  )
}

/**
 * Create Foreign Data Wrapper connection to MINDEX
 * This allows querying MINDEX directly from Supabase
 */
export async function setupMINDEXFDW() {
  return {
    ok: false,
    message:
      "FDW setup must be applied as SQL in the Supabase project (requires postgres_fdw extension + a server/user mapping).",
    sql_template: [
      "CREATE EXTENSION IF NOT EXISTS postgres_fdw;",
      "-- CREATE SERVER mindex_server FOREIGN DATA WRAPPER postgres_fdw OPTIONS (host '<MINDEX_DB_HOST>', port '5432', dbname '<MINDEX_DB_NAME>');",
      "-- CREATE USER MAPPING FOR CURRENT_USER SERVER mindex_server OPTIONS (user '<MINDEX_DB_USER>', password '<MINDEX_DB_PASSWORD>');",
      "-- CREATE FOREIGN TABLE ... SERVER mindex_server OPTIONS (schema_name 'core', table_name 'taxon');",
    ].join("\n"),
  }
}
