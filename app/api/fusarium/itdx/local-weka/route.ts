import { NextRequest, NextResponse } from "next/server"
import { probeItdxConnectivity } from "@/lib/fusarium/itdx/connectivity"
import { campaignDiskPeek, readLocalWekaLedger, runLocalWekaScores } from "@/lib/fusarium/itdx/local-weka"
import { findJava, findWekaJar, LOCAL_SCORE_DIR } from "@/lib/fusarium/itdx/runtime-paths"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function envelope(extra: Record<string, unknown> = {}) {
  return {
    live: false,
    forecast_p: null,
    weka_is_not_nlm: true,
    scientific_readiness_established: false,
    trail_score: "not yet scored",
    result_dir: LOCAL_SCORE_DIR,
    downloads: {
      scores_json: "/api/fusarium/itdx/local-weka/file?name=scores.json",
      scores_csv: "/api/fusarium/itdx/local-weka/file?name=scores.csv",
    },
    ...extra,
  }
}

export async function GET(request: NextRequest) {
  const forceOffline = request.nextUrl.searchParams.get("force") === "offline"
  const connectivity = await probeItdxConnectivity(forceOffline)
  return NextResponse.json(
    envelope({
      mode: connectivity.mode,
      banner: connectivity.banner,
      connectivity,
      java: findJava(),
      weka_jar: findWekaJar(),
      campaign_on_disk: campaignDiskPeek(),
      local_scores: readLocalWekaLedger(),
    }),
  )
}

export async function POST(request: NextRequest) {
  const forceOffline = request.nextUrl.searchParams.get("force") === "offline"
  const connectivity = await probeItdxConnectivity(forceOffline)
  if (!findJava() || !findWekaJar()) {
    return NextResponse.json(
      envelope({
        accepted: false,
        error: "Local WEKA runtime missing (portable Java or weka.jar)",
        mode: connectivity.mode,
        banner: connectivity.banner,
        campaign_on_disk: campaignDiskPeek(),
      }),
      { status: 503 },
    )
  }
  const ledger = runLocalWekaScores()
  return NextResponse.json(
    envelope({
      accepted: true,
      mode: connectivity.mode,
      banner: connectivity.banner,
      connectivity,
      local_scores: ledger,
      campaign_on_disk: campaignDiskPeek(),
    }),
  )
}
