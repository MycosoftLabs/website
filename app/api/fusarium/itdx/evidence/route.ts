import { NextRequest, NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { allowedPath, isFormspacePath } from "@/lib/itdx/gateway.mjs"
import {
  LOCAL_DATASET_ID,
  LOCAL_REPLAY_RUN_ID,
  buildEvidenceSummary,
} from "@/lib/itdx/run-narration.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}

async function itdxGet(path: string, search = "") {
  const allowed = allowedPath(path.replace(/^\//, "").split("/"), "GET")
  if (!allowed) return { ok: false, status: 404, data: null }
  const origin = (
    isFormspacePath(allowed)
      ? process.env.FORMSPACE_BACKEND_URL
      : process.env.ITDX_BACKEND_URL
  )?.trim()
  const token = process.env.ITDX_BACKEND_TOKEN?.trim()
  if (!origin || !token) return { ok: false, status: 503, data: { error: "ITDX backend is not configured" } }
  const response = await fetch(new URL(allowed + search, origin), {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })
  const data = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, data }
}

export async function GET(request: NextRequest) {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  const runId = request.nextUrl.searchParams.get("runId") || LOCAL_REPLAY_RUN_ID
  const datasetId = request.nextUrl.searchParams.get("datasetId") || LOCAL_DATASET_ID
  const documentId = request.nextUrl.searchParams.get("documentId")

  const bootstrap = await itdxGet("/api/bootstrap")
  const dataset = datasetId ? await itdxGet("/api/dataset", `?id=${encodeURIComponent(datasetId)}`) : { ok: false, data: null }
  const document = documentId ? await itdxGet("/api/document", `?id=${encodeURIComponent(documentId)}`) : { ok: false, data: null }
  const runs = Array.isArray(bootstrap.data?.runs) ? bootstrap.data.runs : []
  const runExists = runs.some((run: { id?: string } | string) => (typeof run === "string" ? run : run.id) === runId)
  const backendRun = runExists ? await itdxGet("/api/run", `?id=${encodeURIComponent(runId)}`) : { ok: false, data: null }

  const summary = buildEvidenceSummary({
    context: { runId, datasetId, documentId, dataOrigin: "SYNTHETIC_EXERCISE" },
    bootstrap: bootstrap.data,
    dataset: dataset.ok ? dataset.data : null,
    document: document.ok ? document.data : null,
    backendRun: backendRun.ok ? backendRun.data : null,
  })

  return NextResponse.json(
    {
      ...summary,
      bootstrap_status: bootstrap.status,
      dataset_status: dataset.status ?? null,
      document_status: document.status ?? null,
      run_status: runExists ? backendRun.status : 404,
      note: "Local replay run ids do not create a 8765 /api/run job. This route stays 200 for the Earth Sim chip.",
    },
    { status: 200, headers: HEADERS },
  )
}
