"use client"

import { useEffect, useState } from "react"
import { snapshot } from "@/lib/itdx/replay-core.mjs"
import { useReplay } from "@/lib/itdx/replay-store"
import { FUSION_FORMULA } from "@/lib/itdx/truth-fusion.mjs"
import { logDemoEvent } from "@/lib/itdx/demo-log"
import styles from "./itdx-truth-panel.module.css"

interface TruthChannel {
  id: string
  status: string
  score: number | null
  weight: number
  note: string
  decider?: { agent_id: string; role: string } | null
}

interface TruthAsset {
  asset_id: string
  label: string
  p_truth: number | null
  p_unsupported: number | null
  p_truth_pct: string
  p_unsupported_pct: string
  quality: string
  quality_flags: string[]
  deception_status: string
  coercion_status: string
  confusion_status: string
  counterintel_status: string
  log_odds: number | null
  active_weight_sum: number
  channels: TruthChannel[]
  who_decided: Array<{ agent_id: string; role: string }>
  formula: string
}

interface TruthPayload {
  selected?: TruthAsset
  byId?: Record<string, TruthAsset>
  binds?: { nlm?: { qualification?: string; model_loaded?: boolean; predict_called?: boolean } }
}

export function ITDXTruthPanel() {
  const replay = useReplay()
  const frame = snapshot(replay.index)
  const local = frame.assets.find((asset) => asset.id === replay.selected) ?? frame.assets[0]
  const [remote, setRemote] = useState<TruthPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const response = await fetch(
        `/api/fusarium/itdx/truth?index=${replay.index}&selected=${encodeURIComponent(replay.selected)}`,
        { cache: "no-store" },
      ).catch(() => null)
      if (!response || !response.ok || cancelled) return
      const data = (await response.json()) as TruthPayload
      if (cancelled) return
      setRemote(data)
      window.dispatchEvent(new CustomEvent("fusarium:itdx-truth", { detail: data }))
      const selected = data.selected
      if (selected) {
        logDemoEvent({
          type: "truth-fusion",
          clock: frame.replay_time,
          index: replay.index,
          assetId: selected.asset_id,
          note: `P(truth)=${selected.p_truth_pct} quality=${selected.quality} nlm=${data.binds?.nlm?.qualification || "—"}`,
        })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [replay.index, replay.selected, replay.playing, frame.replay_time])

  const fused = remote?.selected?.asset_id === local?.id ? remote.selected : null
  const pTruth = fused?.p_truth ?? local?.p_truth
  const pUnsupported = fused?.p_unsupported ?? local?.p_unsupported
  const channels = fused?.channels || local?.truth_fusion?.channels || []
  const who = fused?.who_decided || local?.truth_fusion?.who_decided || []

  return (
    <section className={styles.wrap} data-testid="itdx-truth-panel" aria-label="Truth and deception fusion">
      <p className={styles.kicker}>Truth / deception · geometry + MAS/NLM</p>
      <p className={styles.hero} data-testid="itdx-truth-p">
        P(truth) {typeof pTruth === "number" ? `${(100 * pTruth).toFixed(1)}%` : "—"}
        <span>
          P(unsupported) {typeof pUnsupported === "number" ? `${(100 * pUnsupported).toFixed(1)}%` : "—"}
        </span>
      </p>
      <p className={styles.meta} data-testid="itdx-truth-quality">
        Data {(fused?.quality || local?.data_quality || "—").toString()}
        {(fused?.quality_flags || local?.quality_flags || []).length
          ? ` · ${(fused?.quality_flags || local?.quality_flags || []).join(", ")}`
          : " · no fault flags"}
      </p>
      <p className={styles.meta}>
        Deception {fused?.deception_status || "NOT_SUPPLIED"} · coercion{" "}
        {fused?.coercion_status || "NOT_SUPPLIED"} · confusion {fused?.confusion_status || "NOT_SUPPLIED"} ·
        counterintel {fused?.counterintel_status || "NOT_SUPPLIED"}
      </p>
      <p className={styles.formula} data-testid="itdx-truth-formula">
        {fused?.formula || FUSION_FORMULA}
      </p>
      <p className={styles.meta} data-testid="itdx-truth-who">
        Who decided: {who.length ? who.map((item) => `${item.agent_id}/${item.role}`).join(" · ") : "itdx-geometry/math"}
      </p>
      <p className={styles.meta}>
        NLM {remote?.binds?.nlm?.qualification || "UNQUALIFIED"} · predict_called=
        {String(remote?.binds?.nlm?.predict_called ?? false)} · class-p is not a geo radius · synthetic=true live=false
      </p>
      <ul className={styles.list} data-testid="itdx-truth-channels">
        {channels.map((channel) => (
          <li key={channel.id} className={styles.row} data-status={channel.status}>
            <span>{channel.id}</span>
            <span className={channel.status === "BOUND" && channel.score != null ? styles.on : styles.off}>
              {channel.status}
              {typeof channel.score === "number" ? ` · ${(100 * channel.score).toFixed(0)}%` : ""}
              {` · w=${channel.weight}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
