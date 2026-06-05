/**
 * MINDEX Admin Console BFF — aggregates live stats, ETL, NAS, earth domains.
 * Proxies GET /api/mindex/console on MINDEX VM (189).
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const mindexUrl = env.mindexApiBaseUrl.replace(/\/$/, "")

  try {
    const response = await fetchMindexWithAuthRetry(`${mindexUrl}/api/mindex/console`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_500),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      return NextResponse.json(
        {
          error: "mindex_console_unavailable",
          status: response.status,
          detail: detail.slice(0, 500),
          mindex_url: mindexUrl,
          troubleshooting: {
            check_token: "Set MINDEX_INTERNAL_TOKEN or MINDEX_API_KEY in website .env.local",
            check_api: `curl -H "X-Internal-Token: $MINDEX_INTERNAL_TOKEN" ${mindexUrl}/api/mindex/console`,
          },
        },
        { status: response.status >= 500 ? 503 : response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ ...data, data_source: "mindex" })
  } catch (error) {
    return NextResponse.json(
      {
        error: "mindex_console_fetch_failed",
        message: error instanceof Error ? error.message : "Unknown error",
        mindex_url: mindexUrl,
        data_source: "unavailable",
      },
      { status: 503 },
    )
  }
}
