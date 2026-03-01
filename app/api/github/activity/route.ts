import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ORG = "MycosoftLabs"

function buildGithubUrl(org: string, repo?: string) {
  if (repo) {
    return `https://api.github.com/repos/${org}/${repo}/events?per_page=50`
  }
  return `https://api.github.com/orgs/${org}/events?per_page=50`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const org = searchParams.get("org") || DEFAULT_ORG
    const repo = searchParams.get("repo") || undefined

    const headers: Record<string, string> = {
      "User-Agent": "mycosoft-demo",
      Accept: "application/vnd.github+json",
    }
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(buildGithubUrl(org, repo), {
      headers,
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ org, repo, events: data })
  } catch (error) {
    console.error("GitHub activity route error:", error)
    return NextResponse.json({ error: "GitHub activity unavailable" }, { status: 500 })
  }
}
