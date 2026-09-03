"use client"

import { useCallback, useEffect, useState } from "react"

import type { AlphaObservabilitySnapshot } from "@/lib/fusarium/alpha-observability/contracts"
import styles from "./stack-inventory.module.css"

const REFRESH_MS = 15_000

function formatValue(value: number | null, unit: string): string {
  if (value === null) return "Unavailable"
  if (unit === "cents") return `$${(value / 100).toFixed(2)}`
  return `${value.toLocaleString()} ${unit}`
}
export function AlphaObservabilityPanel() {
  const [snapshot, setSnapshot] = useState<AlphaObservabilitySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    setRefreshing(true)
    try {
      const response = await fetch("/api/fusarium/alpha-observability?hours=24", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const next = await response.json() as AlphaObservabilitySnapshot
      if (next.schemaVersion !== "fusarium.alpha-observability.v1") throw new Error("schema mismatch")
      setSnapshot(next)
      setError(null)
    } catch {
      setError("The owner-gated alpha snapshot is unavailable. No live state is inferred.")
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  return (
    <section className={styles.alphaPanel} aria-labelledby="alpha-observability-title">
      <header className={styles.alphaHead}>
        <div>
          <span>Alpha operations</span>
          <h2 id="alpha-observability-title">Live cost and traffic evidence</h2>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? "Reading…" : "Refresh evidence"}
        </button>
      </header>

      {error ? <p className={styles.alphaWarning}>{error}</p> : null}
      <div className={styles.alphaMetrics}>
        {(snapshot?.metrics ?? []).map((metric) => (
          <article key={metric.id} data-state={metric.state}>
            <span>{metric.label}</span>
            <strong>{formatValue(metric.value, metric.unit)}</strong>
            <small>{metric.state} · {metric.source}</small>
            <p>{metric.detail}</p>
          </article>
        ))}
        {!snapshot && !error ? <p>Reading owner-scoped operational ledgers…</p> : null}
      </div>

      <div className={styles.alphaServices}>
        {(snapshot?.services ?? []).map((service) => (
          <article key={service.id} data-state={service.state}>
            <b>{service.label}</b>
            <span>{service.state}{service.latencyMs === null ? "" : ` · ${service.latencyMs} ms`}</span>
            <small>{service.detail}</small>
          </article>
        ))}
      </div>

      {snapshot?.warnings.length ? (
        <ul className={styles.alphaWarnings}>
          {snapshot.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
    </section>
  )
}
