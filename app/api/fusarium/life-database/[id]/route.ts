import { type NextRequest, NextResponse } from "next/server"
import { GET as getAncestryRecord } from "@/app/api/ancestry/[id]/route"
import { requireOwner } from "@/lib/auth/api-auth"
import { mindexOpenGetJson } from "@/lib/mindex-open-fetch"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const baseResponse = await getAncestryRecord(request, context)
  if (!baseResponse.ok) return baseResponse

  const payload = (await baseResponse.json()) as {
    species?: { uuid?: string; scientific_name?: string }
    [key: string]: unknown
  }
  if (request.nextUrl.searchParams.get("enrich") === "0") {
    return NextResponse.json({ ...payload, enrichment: { state: "deferred" } })
  }
  const uuid = payload.species?.uuid
  const scientificName = payload.species?.scientific_name
  if (!uuid || !scientificName) return NextResponse.json(payload)

  const timeout = () => AbortSignal.timeout(8_000)
  const [genetics, genomes, compounds, observations] = await Promise.allSettled([
    mindexOpenGetJson<unknown>(
      `/api/mindex/genetics?species=${encodeURIComponent(scientificName)}&limit=24`,
      { signal: timeout() },
    ),
    mindexOpenGetJson<unknown>(
      `/api/mindex/genomes?taxon_id=${encodeURIComponent(uuid)}&limit=24`,
      { signal: timeout() },
    ),
    mindexOpenGetJson<unknown>(
      `/api/mindex/compounds/for-taxon/${encodeURIComponent(uuid)}`,
      { signal: timeout() },
    ),
    mindexOpenGetJson<unknown>(
      `/api/mindex/observations?taxon_id=${encodeURIComponent(uuid)}&limit=24`,
      { signal: timeout() },
    ),
  ])

  const result = (settled: PromiseSettledResult<unknown>) =>
    settled.status === "fulfilled"
      ? { state: "available" as const, data: settled.value }
      : { state: "unavailable" as const, data: null }

  return NextResponse.json({
    ...payload,
    profile: {
      genetics: result(genetics),
      genomes: result(genomes),
      compounds: result(compounds),
      observations: result(observations),
    },
    enrichment: { state: "complete" },
  })
}
