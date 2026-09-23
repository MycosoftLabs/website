import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { spawnSync } from "child_process"
import path from "path"
import {
  CAMPAIGN_SEP14_DIR,
  LOCAL_SCORE_DIR,
  findJava,
  findWekaJar,
  fixtureNumericNominalArff,
  trailPredictionsArff,
  trailSessionArff,
  trailSessionSubsampleArff,
  wekaClasspath,
} from "@/lib/fusarium/itdx/runtime-paths"

const JOB_TIMEOUT_MS = 15000

export type ScoreHonesty = "SYNTHETIC" | "NOT_YET_SCORED" | "MEASURED"

export interface LocalWekaJobResult {
  id: string
  family: "classifier" | "clusterer" | "filter"
  scheme: string
  dataset_id: string
  arff: string
  honesty: ScoreHonesty
  origin: string
  ran: boolean
  exit_code: number | null
  percent_correct: number | null
  f1_weighted: number | null
  detail: string
  stdout_path: string | null
  output_arff: string | null
}

export interface LocalWekaLedger {
  schema: "itdx-local-weka/v1"
  live: false
  forecast_p: null
  weka_is_not_nlm: true
  scientific_readiness_established: false
  trail_score: "not yet scored"
  written_at: string
  java: string | null
  weka_jar: string | null
  result_dir: string
  jobs: LocalWekaJobResult[]
}

function parseClassify(stdout: string): { percent_correct: number | null; f1_weighted: number | null } {
  const pctMatches = [...stdout.matchAll(/Correctly Classified Instances\s+\d+\s+([0-9.]+)\s*%/g)]
  const pct = pctMatches.length ? Number(pctMatches[pctMatches.length - 1][1]) : null
  const weightedMatches = [...stdout.matchAll(/Weighted Avg\.\s+(.+)/g)]
  let f1: number | null = null
  if (weightedMatches.length) {
    const cols = weightedMatches[weightedMatches.length - 1][1]
      .trim()
      .split(/\s+/)
    const fMeasure = Number(cols[4])
    if (Number.isFinite(fMeasure)) f1 = fMeasure
  }
  return { percent_correct: Number.isFinite(pct as number) ? pct : null, f1_weighted: f1 }
}

function runJava(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const java = findJava()
  const cp = wekaClasspath()
  if (!java || !cp) {
    return { status: null, stdout: "", stderr: "Java or weka.jar not found for local WEKA" }
  }
  const spawned = spawnSync(java, ["-cp", cp, ...args], {
    encoding: "utf8",
    timeout: JOB_TIMEOUT_MS,
    windowsHide: true,
  })
  return {
    status: spawned.status,
    stdout: spawned.stdout || "",
    stderr: spawned.stderr || "",
  }
}

function writeSidecar(file: string, body: string): void {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, body, "utf8")
}

function classifyJob(input: {
  id: string
  scheme: string
  arff: string
  dataset_id: string
  honesty: ScoreHonesty
  origin: string
}): LocalWekaJobResult {
  const stdoutPath = path.join(LOCAL_SCORE_DIR, `${input.id}.stdout.txt`)
  if (!existsSync(input.arff)) {
    return {
      ...emptyJob(input),
      ran: false,
      detail: `ARFF missing: ${input.arff}`,
    }
  }
  const ran = runJava([input.scheme, "-t", input.arff, "-x", "10"])
  const combined = `${ran.stdout}\n${ran.stderr}`
  writeSidecar(stdoutPath, combined)
  const parsed = parseClassify(ran.stdout)
  const unlabeled =
    /Ignored Class Unknown Instances|UnassignedClassException|Class is not set|cannot handle|unlabeled|missing class/i.test(
      combined,
    ) ||
    (ran.status !== 0 && parsed.percent_correct === null)
  return {
    id: input.id,
    family: "classifier",
    scheme: input.scheme,
    dataset_id: input.dataset_id,
    arff: input.arff,
    honesty: unlabeled ? "NOT_YET_SCORED" : input.honesty,
    origin: input.origin,
    ran: ran.status === 0,
    exit_code: ran.status,
    percent_correct: unlabeled ? null : parsed.percent_correct,
    f1_weighted: unlabeled ? null : parsed.f1_weighted,
    detail: unlabeled
      ? "WEKA CLI could not score this view (missing/unlabeled class). Trail F1 stays not yet scored."
      : ran.status === 0
        ? "Real WEKA CLI 10-fold output. Label is SYNTHETIC unless an independently labeled hike exists."
        : combined.slice(0, 600),
    stdout_path: stdoutPath,
    output_arff: null,
  }
}

function emptyJob(input: {
  id: string
  scheme: string
  arff: string
  dataset_id: string
  honesty: ScoreHonesty
  origin: string
  family?: LocalWekaJobResult["family"]
}): LocalWekaJobResult {
  return {
    id: input.id,
    family: input.family ?? "classifier",
    scheme: input.scheme,
    dataset_id: input.dataset_id,
    arff: input.arff,
    honesty: input.honesty,
    origin: input.origin,
    ran: false,
    exit_code: null,
    percent_correct: null,
    f1_weighted: null,
    detail: "",
    stdout_path: null,
    output_arff: null,
  }
}

function filterJob(): LocalWekaJobResult {
  const input = fixtureNumericNominalArff()
  const output = path.join(LOCAL_SCORE_DIR, "normalize_fixture_numeric_nominal.arff")
  const stdoutPath = path.join(LOCAL_SCORE_DIR, "filter_normalize.stdout.txt")
  if (!existsSync(input)) {
    return {
      ...emptyJob({
        id: "filter_normalize_fixture",
        scheme: "weka.filters.unsupervised.attribute.Normalize",
        arff: input,
        dataset_id: "fixture_numeric_nominal",
        honesty: "SYNTHETIC",
        origin: "SYNTHETIC_CONTRACT_FIXTURE",
        family: "filter",
      }),
      detail: `ARFF missing: ${input}`,
    }
  }
  const ran = runJava([
    "weka.filters.unsupervised.attribute.Normalize",
    "-i",
    input,
    "-o",
    output,
  ])
  writeSidecar(stdoutPath, `${ran.stdout}\n${ran.stderr}`)
  return {
    id: "filter_normalize_fixture",
    family: "filter",
    scheme: "weka.filters.unsupervised.attribute.Normalize",
    dataset_id: "fixture_numeric_nominal",
    arff: input,
    honesty: "SYNTHETIC",
    origin: "SYNTHETIC_CONTRACT_FIXTURE",
    ran: ran.status === 0 && existsSync(output),
    exit_code: ran.status,
    percent_correct: null,
    f1_weighted: null,
    detail:
      ran.status === 0 && existsSync(output)
        ? "Real WEKA filter wrote a normalized ARFF. Filters do not produce F1."
        : (ran.stderr || ran.stdout || "Normalize failed").slice(0, 600),
    stdout_path: stdoutPath,
    output_arff: existsSync(output) ? output : null,
  }
}

function clusterJob(): LocalWekaJobResult {
  const subsample = trailSessionSubsampleArff()
  const session = trailSessionArff()
  const arff = existsSync(subsample) ? subsample : session
  const stdoutPath = path.join(LOCAL_SCORE_DIR, "cluster_simplekmeans_trail.stdout.txt")
  if (!existsSync(arff)) {
    return {
      ...emptyJob({
        id: "cluster_trail",
        scheme: "weka.clusterers.SimpleKMeans",
        arff,
        dataset_id: "trail_session",
        honesty: "NOT_YET_SCORED",
        origin: "RECORDED_UNLABELED",
        family: "clusterer",
      }),
      detail: `ARFF missing: ${arff}`,
    }
  }
  const numericArff = path.join(LOCAL_SCORE_DIR, "trail_session_numeric.arff")
  const strip = runJava([
    "weka.filters.unsupervised.attribute.RemoveType",
    "-T",
    "string",
    "-i",
    arff,
    "-o",
    numericArff,
  ])
  const clusterTarget = strip.status === 0 && existsSync(numericArff) ? numericArff : arff
  const ran = runJava(["weka.clusterers.SimpleKMeans", "-t", clusterTarget, "-N", "3", "-I", "20"])
  writeSidecar(stdoutPath, `${strip.stdout}\n${strip.stderr}\n${ran.stdout}\n${ran.stderr}`)
  return {
    id: "cluster_trail",
    family: "clusterer",
    scheme: "weka.clusterers.SimpleKMeans",
    dataset_id: existsSync(subsample) ? "trail_session_subsample" : "trail_session",
    arff: clusterTarget,
    honesty: "NOT_YET_SCORED",
    origin: "RECORDED_UNLABELED",
    ran: ran.status === 0,
    exit_code: ran.status,
    percent_correct: null,
    f1_weighted: null,
    detail:
      ran.status === 0
        ? "Real WEKA SimpleKMeans CLI after RemoveType string. ARI/NMI not yet scored — no reference partition."
        : (ran.stderr || ran.stdout || "cluster failed").slice(0, 600),
    stdout_path: stdoutPath,
    output_arff: existsSync(numericArff) ? numericArff : null,
  }
}

export function readLocalWekaLedger(): LocalWekaLedger | null {
  const file = path.join(LOCAL_SCORE_DIR, "scores.json")
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, "utf8")) as LocalWekaLedger
}

export function campaignDiskPeek(): Record<string, unknown> {
  const statusFile = path.join(CAMPAIGN_SEP14_DIR, "status.json")
  const coverageFile = path.join(CAMPAIGN_SEP14_DIR, "coverage.json")
  return {
    campaign_dir: CAMPAIGN_SEP14_DIR,
    status_present: existsSync(statusFile),
    coverage_present: existsSync(coverageFile),
    results_csv: existsSync(path.join(CAMPAIGN_SEP14_DIR, "results.csv")),
    results_jsonl: existsSync(path.join(CAMPAIGN_SEP14_DIR, "results.jsonl")),
    scientific_readiness_established: false,
    trail_score: "not yet scored",
    coverage: existsSync(coverageFile)
      ? (JSON.parse(readFileSync(coverageFile, "utf8")) as Record<string, unknown>)
      : null,
  }
}

export function runLocalWekaScores(): LocalWekaLedger {
  mkdirSync(LOCAL_SCORE_DIR, { recursive: true })
  const fixture = fixtureNumericNominalArff()
  const jobs: LocalWekaJobResult[] = [
    classifyJob({
      id: "zeror_fixture_numeric_nominal",
      scheme: "weka.classifiers.rules.ZeroR",
      arff: fixture,
      dataset_id: "fixture_numeric_nominal",
      honesty: "SYNTHETIC",
      origin: "SYNTHETIC_CONTRACT_FIXTURE",
    }),
    classifyJob({
      id: "j48_fixture_numeric_nominal",
      scheme: "weka.classifiers.trees.J48",
      arff: fixture,
      dataset_id: "fixture_numeric_nominal",
      honesty: "SYNTHETIC",
      origin: "SYNTHETIC_CONTRACT_FIXTURE",
    }),
    classifyJob({
      id: "j48_trail_predictions",
      scheme: "weka.classifiers.trees.J48",
      arff: trailPredictionsArff(),
      dataset_id: "trail_ar_predictions",
      honesty: "NOT_YET_SCORED",
      origin: "RECORDED_UNLABELED",
    }),
    filterJob(),
    clusterJob(),
  ]

  const ledger: LocalWekaLedger = {
    schema: "itdx-local-weka/v1",
    live: false,
    forecast_p: null,
    weka_is_not_nlm: true,
    scientific_readiness_established: false,
    trail_score: "not yet scored",
    written_at: new Date().toISOString(),
    java: findJava(),
    weka_jar: findWekaJar(),
    result_dir: LOCAL_SCORE_DIR,
    jobs,
  }

  writeFileSync(path.join(LOCAL_SCORE_DIR, "scores.json"), JSON.stringify(ledger, null, 2), "utf8")
  const csv = [
    "id,family,scheme,dataset_id,honesty,ran,percent_correct,f1_weighted",
    ...jobs.map(
      (job) =>
        `${job.id},${job.family},${job.scheme},${job.dataset_id},${job.honesty},${job.ran},${job.percent_correct ?? ""},${job.f1_weighted ?? ""}`,
    ),
  ].join("\n")
  writeFileSync(path.join(LOCAL_SCORE_DIR, "scores.csv"), `${csv}\n`, "utf8")
  return ledger
}
