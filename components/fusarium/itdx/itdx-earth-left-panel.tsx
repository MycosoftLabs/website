"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { selectITDXContext, useITDXContext } from "@/lib/itdx/session"
import { replay } from "@/lib/itdx/replay-store"
import { ITDXExplanationCards } from "@/components/itdx/ITDXExplanationCards"
import { ITDXTask8Panel } from "@/components/itdx/ITDXTask8Panel"
import { ITDXTruthPanel } from "@/components/itdx/ITDXTruthPanel"
import { ITDXSituationPanel } from "@/components/itdx/ITDXSituationPanel"
import { ITDXWekaWalkthrough } from "@/components/itdx/ITDXWekaWalkthrough"
import { ITDXSyntheticArmyIntelBriefing } from "@/components/itdx/ITDXSyntheticArmyIntelBriefing"
import { LOCAL_DATASET_ID } from "@/lib/itdx/run-narration.mjs"
import styles from "./itdx-earth-left-panel.module.css"

const LEFT_EXPAND_KEY = "itdx-earth-left-expanded"

/**
 * Fusarium Earth Intel Feed ITDX tab.
 * Connects the left-panel chrome to the dedicated /fusarium/itdx application
 * via shared replay + session refs. Overlay is synthetic; live COP stays CREP.
 */
export function ItdxEarthLeftPanel() {
  const context = useITDXContext()
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
    return () => {
      try {
        if (window.sessionStorage.getItem("itdx-earth-sim-overlay-open") !== "1") replay.pause()
      } catch {
        replay.pause()
      }
    }
  }, [])

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
      <p className={styles.kicker}>SYNTHETIC EXERCISE · live=false · not a live COP</p>
      <p className={styles.meta}>
        Intel Feed ITDX is an unclassified Army-intel framing for the Fort Stewart slice. Sources stay
        under <code>itdx-fictional-replay*</code>. Real aircraft / vessels / sats are unchanged.
      </p>
      <p className={styles.meta}>
        Run {context.runId || "none"} · dataset {context.datasetId || "none"} · origin {context.dataOrigin}
      </p>

      <ITDXSyntheticArmyIntelBriefing variant="intel-feed" isActive />

      <button
        type="button"
        className={styles.toggle}
        aria-expanded={detailsOpen}
        onClick={() => persistDetails(!detailsOpen)}
      >
        <span>Deep cite panels</span>
        <span className={detailsOpen ? styles.on : styles.off}>{detailsOpen ? "Collapse" : "Expand"}</span>
      </button>
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
          Deep Weka / situation / Task 8 cards stay collapsed. Unbound channels remain NOT_SUPPLIED /
          UNQUALIFIED — not a config failure.
        </p>
      )}

      <Link className={styles.action} href="/fusarium/itdx">
        <span>Open dedicated ITDX application</span>
        <span className={styles.on}>/fusarium/itdx</span>
      </Link>
    </div>
  )
}
