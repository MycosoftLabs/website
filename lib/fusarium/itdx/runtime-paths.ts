import { existsSync, readdirSync } from "fs"
import path from "path"

const WEBSITE_ROOT = process.cwd()

export const CAMPAIGN_SEP14_DIR = path.join(WEBSITE_ROOT, ".data", "weka-campaign", "SEP14_2026")
export const LOCAL_SCORE_DIR = path.join(WEBSITE_ROOT, ".data", "weka-campaign", "SEP17_2026_LOCAL")
export const TRAIL_ARFF_DIR = path.join(WEBSITE_ROOT, ".data", "trail-ar", "weka")
export const FIXTURE_DIR = path.join(CAMPAIGN_SEP14_DIR, "fixtures")
export const PORTABLE_JAVA = path.join(
  WEBSITE_ROOT,
  ".data",
  "weka-runtime",
  "jdk-17.0.20.1+1-jre",
  "bin",
  "java.exe",
)
export const MTJ_LIB_DIR = path.join(WEBSITE_ROOT, ".data", "weka-runtime", "lib")

const LAB_WEKA_DIR = path.join(
  "C:",
  "Users",
  "Owner1",
  "Downloads",
  "Mycosoft_ITDX26_Algorithm_Lab_v1_6_Monocular",
  "Mycosoft_ITDX26_v1.6.0",
  "formspace",
  "weka",
  "deps",
)

export function findJava(): string | null {
  if (existsSync(PORTABLE_JAVA)) return PORTABLE_JAVA
  const home = process.env.JAVA_HOME
  if (home) {
    const exe = path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java")
    if (existsSync(exe)) return exe
  }
  return null
}

export function findWekaJar(): string | null {
  const candidates = [
    process.env.WEKA_JAR || "",
    path.join(LAB_WEKA_DIR, "weka.jar"),
    path.join(WEBSITE_ROOT, ".data", "weka-runtime", "weka.jar"),
  ]
  return candidates.find((p) => p && existsSync(p)) || null
}

export function wekaClasspath(): string | null {
  const weka = findWekaJar()
  if (!weka) return null
  const extra = [
    path.join(path.dirname(weka), "bounce.jar"),
    path.join(path.dirname(weka), "ecj.jar"),
    path.join(MTJ_LIB_DIR, "mtj-1.0.4.jar"),
    path.join(MTJ_LIB_DIR, "core-1.1.2.jar"),
    path.join(MTJ_LIB_DIR, "arpack_combined_all-0.1.jar"),
    path.join(MTJ_LIB_DIR, "java-cup-runtime-11b.jar"),
  ].filter((p) => existsSync(p))
  return [weka, ...extra].join(path.delimiter)
}

export function trailSessionArff(): string {
  return path.join(TRAIL_ARFF_DIR, "trail-ar-session.arff")
}

export function trailPredictionsArff(): string {
  return path.join(TRAIL_ARFF_DIR, "trail-ar-predictions.arff")
}

export function fixtureNumericNominalArff(): string {
  return path.join(FIXTURE_DIR, "compat_numeric_nominal.arff")
}

export function trailSessionSubsampleArff(): string {
  const derived = path.join(CAMPAIGN_SEP14_DIR, "derived")
  const exact = path.join(derived, "trail-ar-session-subsample-2000.arff")
  if (existsSync(exact)) return exact
  if (existsSync(derived)) {
    const hit = readdirSync(derived).find((name) => name.startsWith("trail-ar-session-subsample") && name.endsWith(".arff"))
    if (hit) return path.join(derived, hit)
  }
  return exact
}
