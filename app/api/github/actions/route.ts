import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ORG = "MycosoftLabs"
const REPO_LIMIT = 5
const RUN_LIMIT = 12

function buildHeaders() {
  const headers: Record<string, string> = {
    "User-Agent": "mycosoft-demo",
    Accept: "application/vnd.github+json",
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return headers
}

async function fetchJson(url: string, revalidateSeconds: number) {
  const response = await fetch(url, {
    headers: buildHeaders(),
    next: { revalidate: revalidateSeconds },
  })
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }
  return response.json()
}

async function fetchTopRepos(org: string) {
  const url = `https://api.github.com/orgs/${org}/repos?per_page=${REPO_LIMIT}&sort=pushed`
  const data = await fetchJson(url, 300)
  if (!Array.isArray(data)) return []
  return data.map((repo) => repo?.name).filter(Boolean) as string[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const org = searchParams.get("org") || DEFAULT_ORG
    const repoParam = searchParams.get("repo") || undefined

    const repos = repoParam ? [repoParam] : await fetchTopRepos(org)
    const runs: Array<{
      id: number
      repo: string
      name: string
      status: string
      conclusion: string | null
      created_at: string
    }> = []

    for (const repo of repos) {
      const url = `https://api.github.com/repos/${org}/${repo}/actions/runs?per_page=${RUN_LIMIT}`
      const data = await fetchJson(url, 60)
      const workflowRuns = Array.isArray(data?.workflow_runs) ? data.workflow_runs : []
      workflowRuns.forEach((run: Record<string, unknown>) => {
        runs.push({
          id: Number(run.id),
          repo,
          name: String(run.name ?? "workflow"),
          status: String(run.status ?? "unknown"),
          conclusion: run.conclusion ? String(run.conclusion) : null,
          created_at: String(run.created_at ?? ""),
        })
      })
    }

    return NextResponse.json({ org, repo: repoParam ?? null, runs })
  } catch (error) {
    console.error("GitHub actions route error:", error)
    return NextResponse.json({ error: "GitHub actions unavailable" }, { status: 500 })
  }
}
