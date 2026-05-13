import { createAdminClient } from "@/lib/supabase/server"

export interface MindexEtlImprovementRequest {
  source: string
  query?: string
  app?: string
  route?: string
  missing: string[]
  context?: Record<string, unknown>
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export async function recordMindexEtlImprovement(request: MindexEtlImprovementRequest) {
  const missing = request.missing.map((item) => item.trim()).filter(Boolean)
  if (missing.length === 0) {
    return { recorded: false, reason: "no_missing_fields" }
  }

  const prompt = [
    "MINDEX ETL improvement required.",
    request.query ? `Query: ${request.query}` : null,
    request.app ? `App: ${request.app}` : null,
    request.route ? `Route: ${request.route}` : null,
    `Missing data: ${missing.join(", ")}`,
    "Find authoritative source data, ingest it into MINDEX, normalize/manage it through Supabase, cache artifacts on NAS/local storage where applicable, and make the result render from MINDEX on the next request.",
  ].filter(Boolean).join("\n")

  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from("mindex_etl_requests")
      .insert({
        source: request.source,
        app: request.app || null,
        route: request.route || null,
        query: request.query || null,
        missing,
        context: request.context || {},
        prompt,
        status: "queued",
      })
      .select("id")
      .single()

    if (error) throw error
    return { recorded: true, id: data?.id, prompt }
  } catch (error) {
    console.warn("[MINDEX ETL] Could not record improvement request:", error)
    return { recorded: false, error: errorMessage(error), prompt }
  }
}
