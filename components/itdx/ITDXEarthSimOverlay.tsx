"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ASSETS, snapshot } from "@/lib/itdx/replay-core.mjs"
import { replay, useReplay } from "@/lib/itdx/replay-store"
import { useITDXContext } from "@/lib/itdx/session"
import styles from "./itdx-earth-sim-overlay.module.css"

const STORAGE_KEY = "itdx-earth-sim-overlay-open"
const EARTH_SIM_PREFIX = "/fusarium/earth-simulator"

function readOpen(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * Earth Simulator–only ITDX chip. Never mounts from the Fusarium shell.
 * Default collapsed so the globe stays usable; expand state is session-persisted.
 */
export function ITDXEarthSimOverlay() {
  const pathname = usePathname() || ""
  const context = useITDXContext()
  const state = useReplay()
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [nlmLine, setNlmLine] = useState("NLM cite pending")
  const frame = snapshot(state.index)
  const asset = frame.assets.find((row) => row.id === state.selected) ?? frame.assets[0]

  useEffect(() => {
    setOpen(readOpen())
    setReady(true)
    let cancelled = false
    fetch("/api/fusarium/nlm/status", { cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (cancelled || !data) return
        const forecast = Boolean(data?.engine?.health && data?.training)
        const loaded = String(data?.engine?.state || "unavailable")
        setNlmLine(
          `MAS NLM ${loaded}. forecast_qualified=false. p=null. live=false.`,
        )
        void forecast
      })
      .catch(() => {
        if (!cancelled) setNlmLine("NLM status NOT_SUPPLIED from website BFF")
      })
    return () => {
      cancelled = true
    }
  }, [])

  function persist(next: boolean) {
    setOpen(next)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      /* sessionStorage blocked — collapse still works for this render */
    }
  }

  if (!pathname.startsWith(EARTH_SIM_PREFIX) || !ready || !asset) return null

  return (
    <aside
      className={`${styles.overlay} ${open ? styles.open : styles.collapsed}`}
      data-testid="itdx-earth-sim-overlay"
      data-itdx-live="false"
      aria-label="ITDX Earth Simulator panel"
    >
      <div className={styles.bar}>
        <span className={styles.badge}>ITDX · SYNTHETIC · live=false</span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="itdx-earth-sim-overlay-body"
          onClick={() => persist(!open)}
        >
          {open ? "Collapse" : "Expand ITDX"}
        </button>
      </div>
      {open ? (
        <div id="itdx-earth-sim-overlay-body" className={styles.body}>
          <p className={styles.meta}>
            Run {context.runId || "none"} · origin {context.dataOrigin} · Fort Stewart AO. Overlay is
            exercise-only. {nlmLine} Unbound Weka / droids stay NOT_SUPPLIED — not a config
            failure.
          </p>
          <div className={styles.row}>
            <label className={styles.check}>
              <input
                type="checkbox"
                className="text-base"
                checked={state.enabled}
                onChange={(event) => replay.enable(event.target.checked)}
              />
              Show demo layer
            </label>
            <button type="button" className={styles.btn} onClick={replay.focus}>
              Focus
            </button>
            <button type="button" className={styles.btn} onClick={replay.play}>
              {state.playing ? "Pause" : "Play 20×"}
            </button>
            <button type="button" className={styles.btn} onClick={() => replay.seek(0)}>
              Reset
            </button>
          </div>
          <input
            className={`${styles.range} text-base`}
            type="range"
            aria-label="ITDX replay sample"
            min={0}
            max={120}
            value={state.index}
            onChange={(event) => replay.seek(Number(event.target.value))}
          />
          <p className={styles.meta}>
            {frame.replay_time.slice(11, 19)}Z · {asset.label} ·{" "}
            {asset.current_position_status.replaceAll("_", " ")}
          </p>
          <div className={styles.row}>
            {ASSETS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={styles.btn}
                aria-pressed={row.id === asset.id}
                onClick={() => replay.select(row.id)}
              >
                {row.label.replace("DEMO ", "")}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <Link className={styles.btn} href="/fusarium/itdx">
              ITDX workspace
            </Link>
          </div>
        </div>
      ) : (
        <p className={styles.meta}>Collapsed. Intel Feed → ITDX has the full exercise cite.</p>
      )}
    </aside>
  )
}
