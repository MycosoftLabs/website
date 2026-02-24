import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const EXA_API_URL = "https://api.exa.ai/search"
const EXA_API_KEY = process.env.EXA_API_KEY

interface ExaSearchRequest {
  query: string
  numResults?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  startPublishedDate?: string
  endPublishedDate?: string
  category?: string
  useAutoprompt?: boolean
  includeText?: boolean
  includeHighlights?: boolean
}

export async function POST(request: NextRequest) {
  if (!EXA_API_KEY) {
    return NextResponse.json({ error: "EXA_API_KEY not configured" }, { status: 503 })
  }

  let body: ExaSearchRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    query: body.query.trim(),
    numResults: Math.min(body.numResults ?? 10, 100),
    useAutoprompt: body.useAutoprompt ?? true,
    type: "neural",
  }

  if (body.includeDomains?.length) payload.includeDomains = body.includeDomains
  if (body.excludeDomains?.length) payload.excludeDomains = body.excludeDomains
  if (body.startPublishedDate) payload.startPublishedDate = body.startPublishedDate
  if (body.endPublishedDate) payload.endPublishedDate = body.endPublishedDate
  if (body.category) payload.category = body.category

  const contents: Record<string, unknown> = {}
  if (body.includeText !== false) contents.text = { maxCharacters: 1000 }
  if (body.includeHighlights !== false) contents.highlights = { numSentences: 3, highlightsPerUrl: 2 }
  if (Object.keys(contents).length) payload.contents = contents

  const response = await fetch(EXA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return NextResponse.json({ error: errorText || "Exa search failed" }, { status: 502 })
  }

  const data = await response.json()
  return NextResponse.json({ result: data })
}
