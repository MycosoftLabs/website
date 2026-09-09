import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { WekaWalkthrough, WekaWalkthroughCase, WekaWalkthroughTask } from "./weka-v14-types"

export type { WekaWalkthrough, WekaWalkthroughCase, WekaWalkthroughTask }

const KIT_ROOTS = [
  "C:\\Users\\Owner1\\Downloads\\Mycosoft_ITDX26_v1.4.0_Standalone_Lab\\Mycosoft_ITDX26_v1.4.0",
  "C:\\Users\\admin2\\Downloads\\Mycosoft_ITDX26_v1.4.0_Standalone_Lab\\Mycosoft_ITDX26_v1.4.0",
]

function vendoredPath() {
  return join(process.cwd(), "itdx", "artifacts", "weka-v14-replay-pass.json")
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
}

function summarizeLiveReceipt(runFolder: string): WekaWalkthrough | null {
  const receiptPath = join(runFolder, "receipt.json")
  const checksPath = join(runFolder, "weka_checks.json")
  if (!existsSync(receiptPath) || !existsSync(checksPath)) return null
  const receipt = readJson(receiptPath)
  const checks = readJson(checksPath)
  if (receipt.status !== "COMPLETE" || receipt.arithmetic_status !== "PASS") return null
  const qualification = existsSync(join(runFolder, "qualification.json"))
    ? readJson(join(runFolder, "qualification.json"))
    : null
  const gates = Array.isArray(qualification?.gates) ? (qualification.gates as Array<Record<string, unknown>>) : []
  const cases: WekaWalkthroughCase[] = []
  for (const entry of (checks.checks as Array<Record<string, unknown>>) || []) {
    const tasks: WekaWalkthroughTask[] = []
    for (const check of (entry.checks as Array<Record<string, unknown>>) || []) {
      const weka = (check.weka as Record<string, unknown>) || {}
      const own = (check.python_argmax as Record<string, unknown>) || {}
      tasks.push({
        task: String(check.task || ""),
        status: String(check.status || ""),
        f1: typeof weka.f1 === "number" ? weka.f1 : weka.f1 == null ? null : Number(weka.f1),
        brier_independent:
          typeof weka.brier_independent === "number" ? weka.brier_independent : weka.brier_independent == null ? null : Number(weka.brier_independent),
        abstentions: typeof own.abstentions === "number" ? own.abstentions : null,
        input_sha256: typeof check.input_sha256 === "string" ? check.input_sha256 : undefined,
      })
    }
    cases.push({ case: String(entry.case || ""), tasks })
  }
  return {
    schema: "itdx-weka-v14-walkthrough/v1",
    source: "v1.4 TEST_WEKA.py --mode replay",
    kit_version: String(receipt.app_version || "1.4.0"),
    verify_status: "PASS",
    receipt_status: String(receipt.status),
    arithmetic_status: String(receipt.arithmetic_status),
    arithmetic_checks: Number(receipt.arithmetic_checks || 0),
    artifacts_verified: Object.keys((receipt.artifacts as object) || {}).length,
    weka_execution: String(receipt.weka_execution || ""),
    prediction_execution: String(receipt.prediction_execution || ""),
    execution_mode: String(receipt.execution_mode || "replay"),
    run_id: String(receipt.run_id || ""),
    app_version: String(receipt.app_version || "1.4.0"),
    model_sha256: String(receipt.model_sha256 || ""),
    dataset_sha256: String(receipt.dataset_sha256 || ""),
    request_sha256: String(receipt.request_sha256 || ""),
    qualification: String(receipt.qualification || ""),
    formspace_is_not_mas: true,
    java_note: "Java 17+ required; this machine used the known JRE via JAVA_HOME. System JDK not required.",
    windows_fix: "lab_worker writes POSIX artifact keys; verify_run normalizes historical backslashes.",
    limits: Array.isArray(receipt.limits) ? (receipt.limits as string[]).slice(0, 6) : [],
    cases,
    trial_criteria_status: qualification ? String(qualification.status || "") : undefined,
    criteria_authority: qualification ? String(qualification.criteria_authority || "") : undefined,
    field_readiness: qualification ? String(qualification.field_readiness || "") : undefined,
    failed_gates: gates
      .filter((gate) => gate.status === "FAIL")
      .map((gate) => ({
        id: String(gate.id),
        observed: gate.observed,
        criterion: gate.criterion,
        claim: String(gate.claim || ""),
      })),
    passed_arithmetic_gate: true,
    live_kit_receipt: true,
  }
}

function latestKitWalkthrough() {
  for (const root of KIT_ROOTS) {
    const runs = join(root, "local_data", "cli_runs")
    if (!existsSync(runs)) continue
    const newest = readdirSync(runs)
      .filter((name) => existsSync(join(runs, name, "receipt.json")))
      .sort()
      .reverse()
    for (const name of newest) {
      const summary = summarizeLiveReceipt(join(runs, name))
      if (summary) return summary
    }
  }
  return null
}

export function loadWekaWalkthrough(): WekaWalkthrough {
  const live = latestKitWalkthrough()
  if (live) return live
  const path = vendoredPath()
  if (!existsSync(path)) {
    throw new Error("No v1.4 Weka PASS receipt is available")
  }
  const vendored = readJson(path) as unknown as WekaWalkthrough
  return { ...vendored, formspace_is_not_mas: true, live_kit_receipt: false }
}
