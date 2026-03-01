import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ORG = "MycosoftLabs"
const REPO_LIMIT = 5
const DEPLOY_LIMIT = 10

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
    const deployments: Array<{
      id: number
      repo: string
      environment: string | null
      created_at: string
      description: string | null
    }> = []

    for (const repo of repos) {
      const url = `https://api.github.com/repos/${org}/${repo}/deployments?per_page=${DEPLOY_LIMIT}`
      const data = await fetchJson(url, 60)
      if (!Array.isArray(data)) continue
      data.forEach((deployment: Record<string, unknown>) => {
        deployments.push({
          id: Number(deployment.id),
          repo,
          environment: deployment.environment ? String(deployment.environment) : null,
          created_at: String(deployment.created_at ?? ""),
          description: deployment.description ? String(deployment.description) : null,
        })
      })
    }

    return NextResponse.json({ org, repo: repoParam ?? null, deployments })
  } catch (error) {
    console.error("GitHub deployments route error:", error)
    return NextResponse.json({ error: "GitHub deployments unavailable" }, { status: 500 })
  }
}
