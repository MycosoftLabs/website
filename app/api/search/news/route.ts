/**
 * News Search API Route — Feb 2026
 *
 * Uses Google News RSS — completely free, no API key required.
 * Parses compound OR queries into Google News search terms.
 *
 * - Sorts by publishedAt (most recent first, RSS already ordered)
 * - Deduplicates by URL
 * - Returns queryUsed so the widget can show context pills
 * - No external keys needed
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface NewsResult {
  id: string
  title: string
  source: string
  publishedAt: string
  url: string
  summary: string
  imageUrl: string | null
  category: "research" | "industry" | "event" | "discovery" | "general"
  trending?: boolean
}

// ── Simple RSS XML parser (no dependencies) ──────────────────────────────

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return m ? decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()) : ""
}

function extractTagRaw(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : ""
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, "i"))
  return m ? m[1] : ""
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim()
}

function parseRssItems(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    items.push({
      title:       extractTag(block, "title"),
      link:        extractTagRaw(block, "link"),
      pubDate:     extractTag(block, "pubDate"),
      description: extractTag(block, "description"),
      sourceName:  extractTag(block, "source"),
      sourceUrl:   extractAttr(block, "source", "url"),
      enclosure:   extractAttr(block, "enclosure", "url"),
    })
  }
  return items
}

// ── Google News RSS fetch ─────────────────────────────────────────────────

async function fetchGoogleNewsRss(
  query: string,
  limit: number,
): Promise<{ results: NewsResult[]; error?: string }> {
  // Convert compound OR query to Google News-friendly form
  // e.g. "Amanita muscaria" OR psilocybin  →  "Amanita muscaria" OR psilocybin
  const googleQuery = query
    .split(" OR ")
    .map((t) => t.trim())
    .filter(Boolean)
    .join(" OR ")

  const rssUrl =
    `https://news.google.com/rss/search?q=${encodeURIComponent(googleQuery)}` +
    `&hl=en-US&gl=US&ceid=US:en`

  console.log(`[NewsRSS] query="${googleQuery.slice(0, 120)}"`)

  try {
    const res = await fetch(rssUrl, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Mycosoft/1.0; +https://mycosoft.com)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    })

    if (!res.ok) {
      return { results: [], error: `RSS fetch failed: HTTP ${res.status}` }
    }

    const xml = await res.text()
    const rawItems = parseRssItems(xml)
    console.log(`[NewsRSS] ${rawItems.length} raw items`)

    const seen = new Set<string>()
    const results: NewsResult[] = []

    for (const item of rawItems.slice(0, limit * 2)) {
      // Google News redirect URL — use as-is (browser will follow it)
      const url = item.link || item.sourceUrl
      if (!url || seen.has(url)) continue
      seen.add(url)

      const title = stripHtml(item.title)
      if (!title) continue

      const summary = stripHtml(item.description).slice(0, 280)
      const publishedAt = item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString()

      // Source name: try <source> tag, fallback to hostname
      let source = item.sourceName || ""
      if (!source && url) {
        try { source = new URL(url).hostname.replace(/^www\./, "") } catch {}
      }

      // Unique ID: extract the article-specific portion from the Google News URL
      // All Google News URLs share the same prefix; the unique part is after /articles/
      const articleSlug =
        url.split("/articles/")[1]?.split("?")[0]?.slice(0, 24) ||
        Buffer.from(url).toString("base64").slice(-20)

      results.push({
        id: `rss-${articleSlug}`,
        title,
        source: source || "News",
        publishedAt,
        url,
        summary,
        imageUrl: item.enclosure || null,
        category: categorize(title, summary),
        trending: isTrending(publishedAt),
      })

      if (results.length >= limit) break
    }

    console.log(`[NewsRSS] ${results.length} results after dedup`)
    return { results }
  } catch (err: any) {
    console.error("[NewsRSS] Error:", err.message)
    return { results: [], error: `RSS error: ${err.message}` }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function categorize(title = "", desc = ""): NewsResult["category"] {
  const t = `${title} ${desc}`.toLowerCase()
  if (/study|research|scientist|discover|breakthrough|published|journal|paper|findings/.test(t))
    return "research"
  if (/therapy|treatment|health|medical|clinical|patient|drug|pharmaceutical/.test(t))
    return "industry"
  if (/conference|event|summit|award|festival|exhibition/.test(t))
    return "event"
  if (/new species|novel|first time|unknown|rare|found in/.test(t))
    return "discovery"
  return "general"
}

function isTrending(publishedAt: string): boolean {
  if (!publishedAt) return false
  return Date.now() - new Date(publishedAt).getTime() < 24 * 60 * 60 * 1000
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const rawQuery = (params.get("q") || "mycology fungi mushroom").trim()
  const limit = Math.min(parseInt(params.get("limit") || "15"), 25)

  const { results, error } = await fetchGoogleNewsRss(rawQuery, limit)

  return NextResponse.json(
    {
      queryUsed: rawQuery.slice(0, 200),
      results,
      total: results.length,
      source: "GoogleNewsRSS",
      error: error ?? null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        // Cache for 5 minutes — news is fresh but we don't want to hammer RSS
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  )
}
