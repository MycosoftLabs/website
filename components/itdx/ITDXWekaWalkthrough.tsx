"use client"

import { useEffect, useState } from "react"
import type { WekaWalkthrough } from "@/lib/itdx/weka-v14-types"
import styles from "./itdx.module.css"

interface ITDXWekaWalkthroughProps {
  compact?: boolean
}

function formatMetric(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "undefined"
  if (Math.abs(value) > 0 && Math.abs(value) < 1e-9) return value.toExponential(2)
  return value.toFixed(4)
}

export function ITDXWekaWalkthrough({ compact = false }: ITDXWekaWalkthroughProps) {
  const [receipt, setReceipt] = useState<WekaWalkthrough | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch("/api/fusarium/itdx/weka-receipt", { cache: "no-store" })
        const data = (await response.json()) as WekaWalkthrough & { error?: string }
        if (cancelled) return
        if (!response.ok || data.verify_status !== "PASS") {
          setError(data.error || `Weka receipt ${data.verify_status || response.status}`)
          setReceipt(null)
          return
        }
        setError(null)
        setReceipt(data)
      } catch {
        if (!cancelled) {
          setError("Weka receipt request failed")
          setReceipt(null)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <article className={styles.card} data-testid="itdx-weka-walkthrough">
      <p className={styles.badge}>V1.4 WEKA + FORMSPACE MATH</p>
      <h2>Recorded-bundle Weka evaluation</h2>
      {!receipt && !error && <p className={styles.muted}>Loading the real receipt…</p>}
      {error && (
        <p className={styles.warning} data-testid="itdx-weka-status">
          UNAVAILABLE · {error}. No synthetic PASS is shown.
        </p>
      )}
      {receipt && (
        <>
          <p data-testid="itdx-weka-status">
            verify {receipt.verify_status} · receipt {receipt.receipt_status} · arithmetic{" "}
            {receipt.arithmetic_status} · {receipt.arithmetic_checks} checks · artifacts{" "}
            {receipt.artifacts_verified} · {receipt.weka_execution}
          </p>
          <p className={styles.muted}>
            run {receipt.run_id} · mode {receipt.execution_mode} · predictions{" "}
            {receipt.prediction_execution} · {receipt.live_kit_receipt ? "live kit receipt" : "vendored PASS bytes"}
          </p>
          <p className={styles.muted}>
            model {receipt.model_sha256.slice(0, 16)}… · dataset {receipt.dataset_sha256.slice(0, 16)}… · FormSpace ≠
            MAS · field {receipt.field_readiness || "NOT_ESTABLISHED"}
          </p>
          <p className={styles.warning}>
            Trial criteria {receipt.trial_criteria_status || "UNKNOWN"} · {receipt.criteria_authority}. Arithmetic PASS
            does not become Army acceptance.
          </p>
          {!compact && (
            <div className={styles.scroll}>
              <table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Task</th>
                    <th>Weka</th>
                    <th>F1</th>
                    <th>Brier</th>
                    <th>Abstain</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.cases.flatMap((entry) =>
                    entry.tasks.map((task) => (
                      <tr key={`${entry.case}-${task.task}`}>
                        <td>{entry.case}</td>
                        <td>{task.task}</td>
                        <td>{task.status}</td>
                        <td>{task.f1 == null ? "undefined" : formatMetric(task.f1)}</td>
                        <td>{formatMetric(task.brier_independent)}</td>
                        <td>{task.abstentions ?? "—"}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
          {receipt.failed_gates && receipt.failed_gates.length > 0 && (
            <ul className={styles.list}>
              {receipt.failed_gates.map((gate) => (
                <li key={gate.id} className={styles.muted}>
                  {gate.id} FAIL · observed {String(gate.observed)} vs {String(gate.criterion)} · {gate.claim}
                </li>
              ))}
            </ul>
          )}
          {!compact && (
            <p className={styles.muted}>{receipt.limits[0]} {receipt.windows_fix}</p>
          )}
        </>
      )}
    </article>
  )
}
