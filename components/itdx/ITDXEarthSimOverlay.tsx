"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { snapshot } from "@/lib/itdx/replay-core.mjs"
import { replay, useReplay } from "@/lib/itdx/replay-store"
import { useITDXContext } from "@/lib/itdx/session"
import { ITDXSyntheticArmyIntelBriefing } from "@/components/itdx/ITDXSyntheticArmyIntelBriefing"
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
  const frame = snapshot(state.index)
  const asset = frame.assets.find((row) => row.id === state.selected) ?? frame.assets[0]

  useEffect(() => {
    setOpen(readOpen())
    setReady(true)
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
        <span className={styles.badge}>ITDX · SYNTHETIC EXERCISE · live=false</span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="itdx-earth-sim-overlay-body"
          onClick={() => {
            const next = !open
            persist(next)
            if (!next) replay.pause()
          }}
        >
          {open ? "Collapse" : "Expand ITDX"}
        </button>
      </div>
      {open ? (
        <div id="itdx-earth-sim-overlay-body" className={styles.body}>
          <p className={styles.meta}>
            Run {context.runId || "none"} · origin {context.dataOrigin} · {frame.replay_time.slice(11, 19)}Z ·{" "}
            {asset.label}. Overlay is exercise-only. Unbound Weka / droids stay NOT_SUPPLIED — not a
            config failure.
          </p>
          <ITDXSyntheticArmyIntelBriefing variant="overlay" isActive={open} />
        </div>
      ) : (
        <p className={styles.meta}>Collapsed. Intel Feed → ITDX has the full exercise cite.</p>
      )}
    </aside>
  )
}
