import { NextResponse } from "next/server"

const CELESTRAK_TLE_URLS = [
  "https://r.jina.ai/https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
]

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function GET() {
  try {
    let lastStatus: number | null = null
    for (const url of CELESTRAK_TLE_URLS) {
      try {
        const response = await fetchWithTimeout(url, 15000)
        lastStatus = response.status
        if (!response.ok) continue

        const text = await response.text()
        if (!text.trim()) continue

        const cleanedText = text.includes("Markdown Content:")
          ? text.split("Markdown Content:").slice(1).join("Markdown Content:").trim()
          : text
        const lines = cleanedText.split("\n").map((line) => line.trim())
        const hasTle =
          lines.some((line) => line.startsWith("1 ")) &&
          lines.some((line) => line.startsWith("2 "))
        if (!hasTle) continue

        return new NextResponse(cleanedText, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        })
      } catch {
        continue
      }
    }

    return NextResponse.json(
      { error: `Celestrak error: ${lastStatus ?? 502}` },
      { status: 502 }
    )
  } catch (error) {
    console.error("TLE proxy error:", error)
    return NextResponse.json({ error: "TLE proxy failed" }, { status: 500 })
  }
}
