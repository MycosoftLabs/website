import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ORG = "MycosoftLabs"
const REPO_LIMIT = 12

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const org = searchParams.get("org") || DEFAULT_ORG
    const url = `https://api.github.com/orgs/${org}/repos?per_page=${REPO_LIMIT}&sort=pushed`

    const response = await fetch(url, {
      headers: buildHeaders(),
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const repos = Array.isArray(data)
      ? data.map((repo) => ({
          id: Number(repo.id),
          name: String(repo.name ?? ""),
          language: repo.language ? String(repo.language) : null,
          pushed_at: String(repo.pushed_at ?? ""),
          open_issues_count: Number(repo.open_issues_count ?? 0),
        }))
      : []

    return NextResponse.json({ org, repos })
  } catch (error) {
    console.error("GitHub repos route error:", error)
    return NextResponse.json({ error: "GitHub repos unavailable" }, { status: 500 })
  }
}
