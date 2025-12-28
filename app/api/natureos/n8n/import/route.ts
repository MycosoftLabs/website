import { NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

type N8nWorkflowExport = {
  id?: string
  name: string
  nodes: unknown[]
  connections: unknown
  settings?: Record<string, unknown>
  staticData?: unknown
  pinData?: unknown
  active?: boolean
  versionId?: string
}

async function listJsonFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => path.join(dir, e.name))
}

async function readWorkflowExports(dir: string): Promise<N8nWorkflowExport[]> {
  const files = await listJsonFiles(dir)
  const exports: N8nWorkflowExport[] = []
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    // n8n exports are usually either a workflow object or {workflow,...}
    const wf: N8nWorkflowExport = parsed?.name && parsed?.nodes ? parsed : parsed?.workflow
    if (wf?.name && Array.isArray(wf?.nodes)) exports.push(wf)
  }
  return exports
}

async function getCloudHeaders() {
  const apiKey = process.env.N8N_API_KEY || ""
  if (!apiKey) throw new Error("Missing N8N_API_KEY (set it in the website container env)")
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-N8N-API-KEY": apiKey,
    Authorization: `Bearer ${apiKey}`,
  }
}

async function getCloudBaseUrl() {
  return process.env.N8N_CLOUD_URL || "https://mycosoft.app.n8n.cloud"
}

export async function POST() {
  try {
    const workflowsDir =
      process.env.N8N_WORKFLOWS_DIR ||
      // sensible default for the MAS repo when mounted into the container
      "/workflows"

    const exports = await readWorkflowExports(workflowsDir)
    if (exports.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No workflow JSON exports found",
          workflowsDir,
          hint: "Set N8N_WORKFLOWS_DIR to the directory containing exported workflows (*.json).",
        },
        { status: 400 },
      )
    }

    const baseUrl = await getCloudBaseUrl()
    const headers = await getCloudHeaders()

    // fetch existing workflows for upsert by name
    const existingRes = await fetch(`${baseUrl}/api/v1/workflows`, { headers, signal: AbortSignal.timeout(15000) })
    const existingJson = existingRes.ok ? await existingRes.json() : null
    const existing: { id: string; name: string }[] = existingJson?.data || []

    const results: Array<{ name: string; action: "created" | "updated" | "skipped"; id?: string; error?: string }> = []

    for (const wf of exports) {
      const match = existing.find((e) => e.name === wf.name)
      const body = {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings || {},
        active: false,
      }

      if (match) {
        const putRes = await fetch(`${baseUrl}/api/v1/workflows/${match.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        }).catch(() => null)

        if (!putRes?.ok) {
          results.push({ name: wf.name, action: "skipped", id: match.id, error: `Update failed (${putRes?.status})` })
          continue
        }
        results.push({ name: wf.name, action: "updated", id: match.id })
        continue
      }

      const postRes = await fetch(`${baseUrl}/api/v1/workflows`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null)

      if (!postRes?.ok) {
        results.push({ name: wf.name, action: "skipped", error: `Create failed (${postRes?.status})` })
        continue
      }
      const created = await postRes.json().catch(() => null)
      results.push({ name: wf.name, action: "created", id: created?.id })
    }

    const createdCount = results.filter((r) => r.action === "created").length
    const updatedCount = results.filter((r) => r.action === "updated").length
    const skippedCount = results.filter((r) => r.action === "skipped").length

    return NextResponse.json({
      ok: true,
      workflowsDir,
      totals: { found: exports.length, created: createdCount, updated: updatedCount, skipped: skippedCount },
      results,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    )
  }
}

