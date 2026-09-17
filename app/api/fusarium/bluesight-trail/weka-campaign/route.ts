import { existsSync, readFileSync } from "fs"
import { spawn } from "child_process"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { probeItdxConnectivity } from "@/lib/fusarium/itdx/connectivity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATUS = path.join(process.cwd(), ".data", "weka-campaign", "latest.json")
const RUN_DIR = path.join(process.cwd(), ".data", "weka-campaign", "SEP14_2026")
const RUNNER = path.join(
  process.cwd(),
  "..",
  "..",
  "MAS",
  "mycosoft-mas",
  "scripts",
  "itdx_weka_campaign",
  "run_campaign.py",
)
const RUNNER_ABS = path.join(
  "D:",
  "Users",
  "admin2",
  "Desktop",
  "MYCOSOFT",
  "CODE",
  "MAS",
  "mycosoft-mas",
  "scripts",
  "itdx_weka_campaign",
  "run_campaign.py",
)

function readStatus(): Record<string, unknown> {
  const file = existsSync(STATUS) ? STATUS : path.join(RUN_DIR, "status.json")
  if (!existsSync(file)) {
    return {
      schema: "itdx-weka-campaign-status/v1",
      state: "NOT_STARTED",
      forecast_p: null,
      live: false,
      trail_score: "not yet scored",
      result_dir: RUN_DIR,
    }
  }
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
}

function runnerPath(): string | null {
  if (existsSync(RUNNER_ABS)) return RUNNER_ABS
  if (existsSync(RUNNER)) return RUNNER
  return null
}

export async function GET(request: NextRequest) {
  const status = readStatus()
  const forceOffline = request.nextUrl.searchParams.get("force") === "offline"
  const connectivity = await probeItdxConnectivity(forceOffline)
  return NextResponse.json({
    ...status,
    forecast_p: null,
    live: false,
    weka_is_not_nlm: true,
    mode: connectivity.mode,
    banner: connectivity.banner,
    connectivity,
    itdx_url: "/fusarium/itdx",
    itdx_v2_url: "/fusarium/itdx/v2",
    local_weka: "/api/fusarium/itdx/local-weka",
    downloads: {
      results_jsonl: "/api/fusarium/bluesight-trail/weka-campaign/file?name=results.jsonl",
      results_csv: "/api/fusarium/bluesight-trail/weka-campaign/file?name=results.csv",
      correlation: "/api/fusarium/bluesight-trail/weka-campaign/file?name=correlation.json",
      inventory: "/api/fusarium/bluesight-trail/weka-campaign/file?name=arff_inventory.json",
      status: "/api/fusarium/bluesight-trail/weka-campaign/file?name=status.json",
      coverage: "/api/fusarium/bluesight-trail/weka-campaign/file?name=coverage.json",
    },
  })
}

export async function POST() {
  const current = readStatus()
  if (current.state === "RUNNING") {
    return NextResponse.json({ ...current, forecast_p: null, accepted: false, reason: "already running" })
  }
  const script = runnerPath()
  if (!script) {
    return NextResponse.json({ error: "Campaign runner not found", forecast_p: null }, { status: 500 })
  }
  const python =
    process.env.PYTHON_EXE ||
    "C:\\Users\\Owner1\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"
  const child = spawn(python, [script, "--out", RUN_DIR], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  })
  child.unref()
  return NextResponse.json({
    accepted: true,
    state: "RUNNING",
    pid: child.pid ?? null,
    forecast_p: null,
    result_dir: RUN_DIR,
    weka_is_not_nlm: true,
  })
}
