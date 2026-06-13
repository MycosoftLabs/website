import { NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""
const MINDEX_COMPOUNDS_TIMEOUT_MS = Number(process.env.MINDEX_COMPOUNDS_TIMEOUT_MS || 12000)

function mindexHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (MINDEX_API_KEY) headers["X-API-Key"] = MINDEX_API_KEY
  return headers
}

function normalizeCompoundList(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.compounds)) return data.compounds
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  return []
}

async function fetchMindexJson(path: string, params?: URLSearchParams) {
  const url = new URL(path, resolveMindexServerBaseUrl())
  params?.forEach((value, key) => url.searchParams.set(key, value))
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: mindexHeaders(),
    signal: AbortSignal.timeout(MINDEX_COMPOUNDS_TIMEOUT_MS),
  })
  const data = await res.json().catch(() => null)
  return { res, data }
}

function emptyCompounds(headers: Record<string, string> = {}) {
  return NextResponse.json([], {
    headers: {
      "Cache-Control": "no-store",
      "X-MINDEX-Source": "empty",
      ...headers,
    },
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()

  try {
    if (id) {
      const detail = await fetchMindexJson(`/api/mindex/compounds/${encodeURIComponent(id)}`)
      if (detail.res.ok && detail.data && !Array.isArray(detail.data)) {
        return NextResponse.json(detail.data, {
          headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "mindex" },
        })
      }

      const params = new URLSearchParams(searchParams)
      params.set("id", id)
      params.set("limit", "1")
      const list = await fetchMindexJson("/api/mindex/compounds", params)
      const rows = list.res.ok ? normalizeCompoundList(list.data) : []
      if (rows.length > 0) {
        return NextResponse.json(rows[0], {
          headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "mindex" },
        })
      }

      return NextResponse.json(
        { error: "Compound not found" },
        { status: 404, headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "empty" } },
      )
    }

    const params = new URLSearchParams(searchParams)
    const name = searchParams.get("name")?.trim()
    if (name) {
      params.set("q", name)
      params.set("search", name)
    }

    const list = await fetchMindexJson("/api/mindex/compounds", params)
    if (!list.res.ok) {
      return emptyCompounds({
        "X-MINDEX-Source": list.res.status === 404 ? "empty" : "unavailable",
        "X-MINDEX-Upstream-Status": String(list.res.status),
      })
    }

    return NextResponse.json(normalizeCompoundList(list.data), {
      headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "mindex" },
    })
  } catch (error) {
    console.warn("[Compounds] MINDEX fetch failed:", error)
    return emptyCompounds({ "X-MINDEX-Source": "unavailable" })
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action !== "search") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const query = String(body?.query ?? "").trim()
    const params = new URLSearchParams()
    if (query) {
      params.set("q", query)
      params.set("search", query)
    }
    params.set("limit", String(body?.limit ?? searchParams.get("limit") ?? 50))

    const list = await fetchMindexJson("/api/mindex/compounds", params)
    if (!list.res.ok) {
      return emptyCompounds({
        "X-MINDEX-Source": list.res.status === 404 ? "empty" : "unavailable",
        "X-MINDEX-Upstream-Status": String(list.res.status),
      })
    }

    return NextResponse.json(normalizeCompoundList(list.data), {
      headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "mindex" },
    })
  } catch (error) {
    console.warn("[Compounds] MINDEX search failed:", error)
    return emptyCompounds({ "X-MINDEX-Source": "unavailable" })
  }
}
