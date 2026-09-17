import { existsSync, mkdirSync, writeFileSync } from "fs"
import { spawnSync } from "child_process"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { sessionToArff, type TrailSession } from "@/lib/fusarium/bluesight/trail-ar"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DIR = path.join(process.cwd(), ".data", "trail-ar", "weka")
const ARFF = path.join(DIR, "trail-ar-session.arff")
const WEKA_JAR =
  "C:\\Users\\Owner1\\Downloads\\Mycosoft_ITDX26_Algorithm_Lab_v1_6_Monocular\\Mycosoft_ITDX26_v1.6.0\\formspace\\weka\\deps\\weka.jar"

function findJava(): string | null {
  const portable = path.join(
    process.cwd(),
    ".data",
    "weka-runtime",
    "jdk-17.0.20.1+1-jre",
    "bin",
    "java.exe",
  )
  if (existsSync(portable)) return portable
  if (process.env.JAVA_HOME) {
    const exe = path.join(process.env.JAVA_HOME, "bin", "java.exe")
    if (existsSync(exe)) return exe
  }
  const probe = spawnSync("where", ["java"], { encoding: "utf8" })
  const first = probe.stdout?.split(/\r?\n/).map((s) => s.trim()).find(Boolean)
  return first && existsSync(first) ? first : null
}

export async function GET() {
  const java = findJava()
  return NextResponse.json({
    live: false,
    forecast_p: null,
    weka_is_not_nlm: true,
    java,
    weka_jar: existsSync(WEKA_JAR) ? WEKA_JAR : null,
    campaign: "/api/fusarium/bluesight-trail/weka-campaign",
    itdx_url: "/fusarium/itdx",
    trail_score: "not yet scored",
  })
}

export async function POST(request: NextRequest) {
  const session = (await request.json()) as TrailSession
  if (session?.schema !== "bluesight-trail-ar-session/v1") {
    return NextResponse.json({ error: "Expected bluesight-trail-ar-session/v1" }, { status: 400 })
  }
  mkdirSync(DIR, { recursive: true })
  const arff = sessionToArff(session)
  writeFileSync(ARFF, arff, "utf8")

  const java = findJava()
  let weka: { ran: boolean; detail: string } = {
    ran: false,
    detail: java
      ? "Java found; Explorer not launched from this API (headless). Open the ARFF in WEKA GUI."
      : "Java not on PATH. Open the ARFF in WEKA Explorer after installing Java 17+.",
  }
  if (java && existsSync(WEKA_JAR)) {
    const smoke = spawnSync(java, ["-cp", WEKA_JAR, "weka.core.Instances", ARFF], {
      encoding: "utf8",
      timeout: 20000,
    })
    weka = {
      ran: smoke.status === 0,
      detail:
        smoke.status === 0
          ? "weka.core.Instances loaded the ARFF (no classifier trained; no accuracy claimed)."
          : (smoke.stderr || smoke.stdout || "WEKA Instances smoke failed").slice(0, 800),
    }
  }

  return NextResponse.json({
    live: false,
    banner: "SYNTHETIC EXERCISE",
    forecast_p: null,
    arff_path: ARFF,
    arff_bytes: Buffer.byteLength(arff),
    weka_jar: existsSync(WEKA_JAR) ? WEKA_JAR : null,
    java,
    weka,
    open_in_weka: [
      "Install Java 17+ if needed.",
      `java -cp "${WEKA_JAR}" weka.gui.GUIChooser`,
      `Explorer → Open file → ${ARFF}`,
      "Do not train J48 on these frozen columns as a travel probability.",
    ],
  })
}
