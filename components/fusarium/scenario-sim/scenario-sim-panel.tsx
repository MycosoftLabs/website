"use client"

import Link from "next/link"
import { useEffect } from "react"
import { scenarioSim, useScenarioSim } from "@/lib/fusarium/scenario-sim/store"
import styles from "./scenario-sim.module.css"

export function ScenarioSimBanner() {
  return (
    <div className={styles.banner} role="status" data-testid="scenario-sim-banner">
      SYNTHETIC EXERCISE — NOT A LIVE OPERATIONAL PICTURE · live=false
    </div>
  )
}

export function ScenarioSimPanel() {
  const frame = useScenarioSim()
  const v = frame.variables

  useEffect(() => {
    if (!frame.running) return
    let cancelled = false
    void fetch("/api/fusarium/itdx/situation", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const weather = Array.isArray(data?.situation?.channels)
          ? data.situation.channels.find((row: { id?: string }) => row.id === "weather")
          : null
        const temp = weather?.facts?.temperature_c
        if (typeof temp === "number") scenarioSim.attachWeatherCite(temp)
      })
      .catch(() => {
        /* cite stays empty; do not invent */
      })
    return () => {
      cancelled = true
    }
  }, [frame.running])

  return (
    <section className={styles.panel} data-testid="scenario-sim-panel" data-live="false" data-running={frame.running}>
      <ScenarioSimBanner />
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          aria-pressed={frame.running}
          data-testid="run-simulation-test"
          onClick={() => void scenarioSim.toggle()}
        >
          {frame.running ? "Stop simulation test" : "Run simulation test"}
        </button>
        <span className={styles.chip} data-live="false">
          {frame.ao.place} · {frame.ao.lng}, {frame.ao.lat}
        </span>
        <span className={styles.chip} data-live="false">
          clock {frame.clockIso.slice(11, 19)}Z · {frame.index}
        </span>
        <span className={styles.chip} data-live="false">
          {v.scenarioId} · {v.intelBeat.id}
        </span>
      </div>
      <p className={styles.muted}>
        Shared Fort Stewart bus. One clock with ITDX replay (400ms floor). Live Earth Sim weather/species stay off
        unless you turn Live Data on. Official injects remain NOT_SUPPLIED.
      </p>
      <div className={styles.row} aria-label="Scenario variables">
        <span className={styles.chip} data-live="false">
          weather {v.weather.temperatureC == null ? "cite" : `${v.weather.temperatureC}°C`}
        </span>
        <span className={styles.chip} data-live="false">
          units {v.units.length}
        </span>
        <span className={styles.chip} data-live="false">
          duty {v.personnel.personaTitle}
        </span>
        <span className={styles.chip} data-live="false">
          NLM loaded={String(v.nlm.loaded)} ollama=false p=null weights={v.nlm.weights.length}
        </span>
      </div>
      {v.nlm.weights.length ? (
        <ul className={styles.muted} data-testid="nlm-weight-list">
          {v.nlm.weights.map((weight) => (
            <li key={weight.id}>
              {weight.path || weight.id}
              {weight.sha256 ? ` · ${weight.sha256.slice(0, 12)}…` : " · sha not returned"}
              {weight.bytes != null ? ` · ${weight.bytes} B` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>NLM weights: none listed until MAS checkpoints answer. Not stubbed.</p>
      )}
      <div className={styles.grid} aria-label="Bound Fusarium surfaces">
        {frame.surfaces.map((surface) => (
          <Link
            key={surface.id}
            href={surface.href}
            className={styles.surface}
            data-bind={surface.bind}
            data-lit={surface.lit}
            title={surface.note}
          >
            {surface.title} · {surface.bind}
          </Link>
        ))}
      </div>
    </section>
  )
}

export function ScenarioSimLite({ label }: { label: string }) {
  const frame = useScenarioSim()
  return (
    <div className={styles.row} data-testid="scenario-sim-lite" data-running={frame.running}>
      <span className={styles.banner} style={{ margin: 0 }}>
        {frame.banner} · {label} · live=false
      </span>
      {frame.running ? (
        <span className={styles.chip} data-live="false">
          LIT · {frame.index} · {frame.variables.intelBeat.id}
        </span>
      ) : null}
    </div>
  )
}
