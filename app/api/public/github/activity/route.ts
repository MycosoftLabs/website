import { NextRequest, NextResponse } from "next/server"

const GITHUB_ORG = "MycosoftLabs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? 8)))
    const response = await fetch(
      `https://api.github.com/orgs/${GITHUB_ORG}/events?per_page=${limit}`,
      {
        headers: {
          "User-Agent": "mycosoft-website",
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text.slice(0, 300) }, { status: response.status })
    }

    const events = await response.json()
    const simplified = (events ?? []).map((event: any) => ({
      id: event.id,
      type: event.type,
      repo: event.repo?.name,
      actor: event.actor?.login,
      url: event.repo?.url?.replace("api.github.com/repos", "github.com"),
      created_at: event.created_at,
    }))

    return NextResponse.json({ org: GITHUB_ORG, events: simplified })
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch GitHub activity" }, { status: 500 })
  }
}
