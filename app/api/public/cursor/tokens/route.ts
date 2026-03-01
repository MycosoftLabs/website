import { NextResponse } from "next/server"

const CURSOR_TOKENS_CSV_URL =
  process.env.CURSOR_TOKENS_CSV_URL ||
  "https://cursor.com/api/dashboard/export-usage-events-csv?startDate=1717225200000&endDate=1772265599999&strategy=tokens"

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\""
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export async function GET() {
  try {
    const response = await fetch(CURSOR_TOKENS_CSV_URL, { cache: "no-store" })
    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text.slice(0, 300) }, { status: response.status })
    }

    const csv = await response.text()
    const lines = csv.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) {
      return NextResponse.json({ total_tokens: null, updated_at: new Date().toISOString() })
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
    const getIndex = (name: string) => headers.indexOf(name)

    const totalTokensIndex = getIndex("total_tokens")
    const tokensIndex = getIndex("tokens")
    const inputIndex = getIndex("input_tokens")
    const outputIndex = getIndex("output_tokens")

    let total = 0
    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i])
      let value = 0
      if (totalTokensIndex >= 0) {
        value = Number(row[totalTokensIndex] ?? 0)
      } else if (tokensIndex >= 0) {
        value = Number(row[tokensIndex] ?? 0)
      } else if (inputIndex >= 0 || outputIndex >= 0) {
        value =
          Number(row[inputIndex] ?? 0) +
          Number(row[outputIndex] ?? 0)
      }
      if (!Number.isNaN(value)) total += value
    }

    return NextResponse.json({
      total_tokens: total,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to load token usage" }, { status: 500 })
  }
}
