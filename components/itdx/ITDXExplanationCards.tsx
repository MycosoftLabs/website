"use client"

import { useEffect, useState } from "react"
import { snapshot } from "@/lib/itdx/replay-core.mjs"
import { useReplay } from "@/lib/itdx/replay-store"
import { buildCards } from "@/lib/itdx/run-narration.mjs"
import styles from "./itdx-explanation-cards.module.css"

interface BindState {
  formspace?: Record<string, unknown> | null
  nlm?: { model_loaded?: boolean; qualification?: string; task12_path?: string }
  official_injects?: { status?: string }
  ao_place?: string
  formspace_origin?: string
}

interface Task8State {
  source?: string
  roles?: Array<{ id: string; label: string; verdict: string; bound: boolean; note: string }>
  options?: Array<Record<string, unknown>>
  seven_role?: { qualification?: string; missing_artifact?: string }
  note?: string
}

interface ITDXExplanationCardsProps {
  compact?: boolean
}

export function ITDXExplanationCards({ compact = false }: ITDXExplanationCardsProps) {
  const replay = useReplay()
  const frame = snapshot(replay.index)
  const selected = frame.assets.find((asset) => asset.id === replay.selected) ?? frame.assets[0]
  const [bind, setBind] = useState<BindState | null>(null)
  const [task8, setTask8] = useState<Task8State | null>(null)
  const [formspace, setFormspace] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [runState, task] = await Promise.all([
        fetch("/api/fusarium/itdx/run-state", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/fusarium/itdx/task8", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ])
      if (cancelled) return
      setBind(runState)
      setTask8(task)
      setFormspace(runState?.formspace?.status === 200 ? runState.formspace : null)
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, replay.playing ? 2500 : 8000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [replay.playing, replay.index])

  const cards = buildCards({
    replayIndex: replay.index,
    selected,
    bind: {
      ...bind,
      replay_time: frame.replay_time,
      formspace_origin: (formspace?.origin as string) || (bind?.formspace as { origin?: string } | undefined)?.origin,
      nlm: bind?.nlm,
      nlm_checkpoints: (bind as { nlm?: { checkpoints?: unknown } } | null)?.nlm?.checkpoints,
      official_injects: bind?.official_injects,
      ao_place: bind?.ao_place || frame.model.ao_place,
    },
    formspace,
    task8,
  })

  return (
    <section
      className={`${styles.wrap} ${compact ? styles.compact : ""}`}
      data-testid="itdx-explanation-cards"
      aria-label="ITDX run walkthrough"
    >
      <p className={styles.kicker}>
        RUN NARRATION · sample {replay.index}/120 · {selected?.label ?? "no unit"} · {frame.replay_time.slice(11, 19)}Z
      </p>
      <p className={styles.meta} data-testid="itdx-card-live">
        {cards[0]?.live.join(" · ")}
      </p>
      <ol className={styles.list}>
        {cards.map((card) => (
          <li
            key={card.id}
            className={`${styles.card} ${card.active ? styles.active : ""} ${card.reached ? styles.reached : ""}`}
            data-card-id={card.id}
            data-active={card.active ? "true" : "false"}
          >
            <h3 className={styles.title}>
              {card.index + 1}. {card.title}
            </h3>
            <p className={styles.body}>{card.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
