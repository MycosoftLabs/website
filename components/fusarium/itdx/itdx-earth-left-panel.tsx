"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ASSETS, AO_GEOCODE_SOURCE, AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE, snapshot } from "@/lib/itdx/replay-core.mjs"
import { replay, useReplay, type ItdxReplayLayerKey } from "@/lib/itdx/replay-store"
import { readDemoLog, type ItdxDemoLogEvent } from "@/lib/itdx/demo-log"
import { selectITDXContext, useITDXContext } from "@/lib/itdx/session"
import { ITDXExplanationCards } from "@/components/itdx/ITDXExplanationCards"
import { ITDXTask8Panel } from "@/components/itdx/ITDXTask8Panel"
import { ITDXTruthPanel } from "@/components/itdx/ITDXTruthPanel"
import { ITDXSituationPanel } from "@/components/itdx/ITDXSituationPanel"
import { ITDXWekaWalkthrough } from "@/components/itdx/ITDXWekaWalkthrough"
import { LOCAL_DATASET_ID } from "@/lib/itdx/run-narration.mjs"
import styles from "./itdx-earth-left-panel.module.css"

const LEFT_EXPAND_KEY = "itdx-earth-left-expanded"

const LAYER_ROWS: Array<{ id: ItdxReplayLayerKey | "overlay"; label: string }> = [
  { id: "overlay", label: "Exercise overlay" },
  { id: "assets", label: "Units / assets" },
  { id: "tracks", label: "Movement pathways" },
  { id: "uncertainty", label: "Uncertainty circles" },
  { id: "boundary", label: "Scenario AO / boundary" },
  { id: "corridor", label: "Collection / display corridor" },
]

/**
 * Fusarium Earth Intel Feed ITDX tab.
 * Connects the left-panel chrome to the dedicated /fusarium/itdx application
 * via shared replay + session refs. Overlay is synthetic; live COP stays CREP.
 */
export function ItdxEarthLeftPanel() {
  const state = useReplay()
  const context = useITDXContext()
  const frame = snapshot(state.index)
  const selected = frame.assets.find((asset) => asset.id === state.selected) ?? frame.assets[0]
  const [logEntries, setLogEntries] = useState<ItdxDemoLogEvent[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    try {
      setDetailsOpen(window.sessionStorage.getItem(LEFT_EXPAND_KEY) === "1")
    } catch {
      /* default compact */
    }
    replay.enable(true)
    if (replay.getState().focusRequest === 0) replay.focus()
    try {
      window.sessionStorage.setItem("itdx-run-id", "itdx-bulldog-demo")
      selectITDXContext({ runId: "itdx-bulldog-demo", datasetId: LOCAL_DATASET_ID, dataOrigin: "SYNTHETIC_EXERCISE" })
    } catch {
      /* Shared context is optional if another consumer already holds it. */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const entries = await readDemoLog(8)
      if (!cancelled) setLogEntries(entries)
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 2500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [state.index, state.selected, state.layerStatus, state.playing])


  function layerOn(id: ItdxReplayLayerKey | "overlay") {
    if (id === "overlay") return state.enabled
    return state.enabled && state.layers[id]
  }

  function toggle(id: ItdxReplayLayerKey | "overlay") {
    if (id === "overlay") {
      replay.enable(!state.enabled)
      if (!state.enabled) replay.focus()
      return
    }
    replay.setLayer(id, !state.layers[id])
  }

  function persistDetails(next: boolean) {
    setDetailsOpen(next)
    try {
      window.sessionStorage.setItem(LEFT_EXPAND_KEY, next ? "1" : "0")
    } catch {
      /* collapse still applies this session */
    }
  }

  return (
    <div className={styles.wrap} data-testid="itdx-left-panel" data-itdx-live="false">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={detailsOpen}
        onClick={() => persistDetails(!detailsOpen)}
      >
        <span>ITDX cite panels</span>
        <span className={detailsOpen ? styles.on : styles.off}>{detailsOpen ? "Collapse" : "Expand"}</span>
      </button>
      <p className={styles.kicker}>SYNTHETIC · EXERCISE · live=false · replay=true</p>
      <p className={styles.meta}>
        Codex v1.3 fictional replay on the shared CREP globe. Sources stay under{" "}
        <code>itdx-fictional-replay*</code>. Real aircraft / vessels / sats are unchanged.
      </p>
      <p className={styles.meta} data-testid="itdx-ao-place">
        Land AO {AO_PLACE} · {AO_ORIGIN_LAT.toFixed(4)}°N, {Math.abs(AO_ORIGIN_LNG).toFixed(4)}°W
      </p>
      <p className={styles.meta}>{AO_GEOCODE_SOURCE}</p>
      <p className={styles.meta}>
        ITDX app run {context.runId || "none"} · dataset {context.datasetId || "none"} · origin{" "}
        {context.dataOrigin}
      </p>

      <section aria-labelledby="itdx-earth-layers-h">
        <h3 id="itdx-earth-layers-h" className={styles.h}>
          Data layers
        </h3>
        <ul className={styles.list}>
          {LAYER_ROWS.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={layerOn(row.id)}
                onClick={() => toggle(row.id)}
              >
                <span>{row.label}</span>
                <span className={layerOn(row.id) ? styles.on : styles.off}>{layerOn(row.id) ? "On" : "Off"}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          Toggles change the shared CREP overlay only. Sources stay under <code>itdx-fictional-replay*</code>.
        </p>
      </section>

      <section aria-labelledby="itdx-earth-replay-h">
        <h3 id="itdx-earth-replay-h" className={styles.h}>
          Replay
        </h3>
        <div className={styles.row}>
          <button type="button" data-testid="itdx-replay-play" onClick={replay.play}>
            {state.playing ? "Pause" : "Play 20×"}
          </button>
          <button type="button" onClick={() => replay.seek(0)}>
            Reset
          </button>
          <button type="button" onClick={replay.focus}>
            Focus demo
          </button>
        </div>
        <input
          className={styles.range}
          type="range"
          aria-label="ITDX replay sample"
          min={0}
          max={120}
          value={state.index}
          onChange={(event) => replay.seek(Number(event.target.value))}
        />
        <p className={styles.meta} data-testid="itdx-replay-sample">
          {frame.replay_time} · sample {state.index}/120 · {state.layerStatus}
        </p>
        <div className={styles.row}>
          {ASSETS.map((asset) => (
            <button
              key={asset.id}
              type="button"
              aria-pressed={asset.id === state.selected}
              onClick={() => replay.select(asset.id)}
            >
              {asset.label.replace("DEMO ", "")}
            </button>
          ))}
        </div>
      </section>

      {detailsOpen ? (
        <>
          <ITDXExplanationCards compact />
          <ITDXWekaWalkthrough compact />
          <ITDXSituationPanel />
          <ITDXTruthPanel />
          <ITDXTask8Panel />
        </>
      ) : (
        <p className={styles.meta}>
          Cite panels collapsed so the globe stays usable. Expand for Weka / situation / Task 8.
          Unbound channels stay NOT_SUPPLIED / UNQUALIFIED.
        </p>
      )}

      {detailsOpen ? (
        <>
      <section aria-labelledby="itdx-earth-insights-h">
        <h3 id="itdx-earth-insights-h" className={styles.h}>
          Insights
        </h3>
        <p className={styles.meta} data-testid="itdx-selected-truth">
          {selected?.label ?? "No asset at this sample"} · P(truth){" "}
          {typeof selected?.p_truth === "number" ? `${(100 * selected.p_truth).toFixed(1)}%` : "—"} ·{" "}
          {selected?.data_quality || "—"}
        </p>
        <p className={styles.formula}>{frame.model.formula}</p>
        <p className={styles.meta}>
          Observation age {selected?.age_seconds ?? "—"} s · nominal 95% radius{" "}
          {selected?.nominal_radius_m?.toFixed(1) ?? "—"} m
        </p>
        <p className={styles.meta}>
          Measured coverage{" "}
          {selected.empirical_coverage === null
            ? "—"
            : `${(100 * selected.empirical_coverage).toFixed(1)}% (${selected.coverage_count}/${selected.valid_reports})`}{" "}
          · RMSE {selected.rmse_m?.toFixed(1) ?? "—"} m
        </p>
        <p className={styles.warn}>{(selected?.current_position_status ?? "NO_OBSERVATION").replaceAll("_", " ")}</p>
        <p className={styles.meta} data-testid="itdx-math-status">
          Task 12/13 FormSpace math is the v1.4 Weka receipt below (14 arithmetic PASS, trial criteria
          NOT_MET). Task 14 position_uncertainty=NOT_ESTIMATED · class-p is not a geo radius · FormSpace
          ≠ MAS · NLM UNQUALIFIED
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Asset</th>
                <th>cover</th>
                <th>RMSE</th>
              </tr>
            </thead>
            <tbody>
              {frame.assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.id}</td>
                  <td>
                    {asset.empirical_coverage === null
                      ? "—"
                      : `${asset.coverage_count}/${asset.valid_reports}`}
                  </td>
                  <td className={asset.id === "demo-vehicle-02" && state.index >= 40 ? styles.warn : styles.ok}>
                    {asset.rmse_m?.toFixed(1) ?? "—"}
                    {typeof asset.p_truth === "number" ? ` · ${(100 * asset.p_truth).toFixed(0)}%T` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="itdx-earth-log-h">
        <h3 id="itdx-earth-log-h" className={styles.h}>
          Situation log
        </h3>
        <ul className={styles.list} data-testid="itdx-demo-log">
          {logEntries.length === 0 ? (
            <li className={styles.meta}>No persisted demo events yet.</li>
          ) : (
            logEntries.slice().reverse().map((entry, index) => (
              <li key={`${entry.type}-${entry.clock ?? "t"}-${entry.index ?? "i"}-${index}`} className={styles.meta}>
                {entry.type} · {entry.clock ?? "—"} · {entry.assetId ?? "—"} · idx {entry.index ?? "—"}
              </li>
            ))
          )}
        </ul>
      </section>
        </>
      ) : null}

      <Link className={styles.action} href="/fusarium/itdx">
        <span>Open dedicated ITDX application</span>
        <span className={styles.on}>/fusarium/itdx</span>
      </Link>
    </div>
  )
}
