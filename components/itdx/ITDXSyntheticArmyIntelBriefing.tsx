"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { ASSETS, SAMPLE_COUNT, snapshot } from "@/lib/itdx/replay-core.mjs"
import {
  ITDX_REPLAY_SPEEDS,
  replay,
  useReplay,
  type ItdxReplayLayerKey,
  type ItdxReplaySpeed,
} from "@/lib/itdx/replay-store"
import { useItdxSyntheticBriefing } from "@/hooks/use-itdx-synthetic-briefing"
import {
  ITDX_BRIEFING_BANNER,
  ITDX_BRIEFING_CLASSIFICATION,
  TRAINING_PIRS,
  aoCopy,
  biologyAnswer,
  channelById,
  defaultOpenSections,
  isSupplied,
  movementLines,
  osintPlaceHits,
  shortSha,
  weatherAnswer,
  wekaLine,
  type ItdxBriefingSectionId,
  type ItdxBriefingVariant,
} from "@/lib/itdx/synthetic-briefing"
import styles from "./itdx-synthetic-army-intel-briefing.module.css"

const SECTION_STORAGE = "itdx-briefing-sections"
const LAYER_ROWS: Array<{ id: ItdxReplayLayerKey | "overlay"; label: string }> = [
  { id: "overlay", label: "Exercise overlay" },
  { id: "assets", label: "Units / assets" },
  { id: "tracks", label: "Movement pathways" },
  { id: "uncertainty", label: "Uncertainty" },
  { id: "boundary", label: "AO boundary" },
  { id: "corridor", label: "Collection corridor" },
]

interface ITDXSyntheticArmyIntelBriefingProps {
  variant: ItdxBriefingVariant
  isActive?: boolean
}

function readOpen(variant: ItdxBriefingVariant): ItdxBriefingSectionId[] {
  try {
    const raw = window.sessionStorage.getItem(`${SECTION_STORAGE}:${variant}`)
    if (!raw) return defaultOpenSections(variant)
    const parsed = JSON.parse(raw) as ItdxBriefingSectionId[]
    return Array.isArray(parsed) ? parsed : defaultOpenSections(variant)
  } catch {
    return defaultOpenSections(variant)
  }
}

function statusClass(ok: boolean) {
  return ok ? styles.on : styles.off
}

export function ITDXSyntheticArmyIntelBriefing({
  variant,
  isActive = true,
}: ITDXSyntheticArmyIntelBriefingProps) {
  const state = useReplay()
  const frame = snapshot(state.index)
  const selected = frame.assets.find((asset) => asset.id === state.selected) ?? frame.assets[0]
  const ao = aoCopy()
  const { bundle, ticks } = useItdxSyntheticBriefing({
    isActive,
    isPlaying: state.playing,
    replayIndex: state.index,
  })
  const [open, setOpen] = useState<ItdxBriefingSectionId[]>(() => defaultOpenSections(variant))

  useEffect(() => {
    setOpen(readOpen(variant))
  }, [variant])

  function persist(next: ItdxBriefingSectionId[]) {
    setOpen(next)
    try {
      window.sessionStorage.setItem(`${SECTION_STORAGE}:${variant}`, JSON.stringify(next))
    } catch {
      /* collapse still applies this session */
    }
  }

  function toggleSection(id: ItdxBriefingSectionId) {
    persist(open.includes(id) ? open.filter((row) => row !== id) : [...open, id])
  }

  function layerOn(id: ItdxReplayLayerKey | "overlay") {
    if (id === "overlay") return state.enabled
    return state.enabled && state.layers[id]
  }

  function toggleLayer(id: ItdxReplayLayerKey | "overlay") {
    if (id === "overlay") {
      replay.enable(!state.enabled)
      if (!state.enabled) replay.focus()
      return
    }
    replay.setLayer(id, !state.layers[id])
  }

  const channels = bundle.situation?.situation?.channels || []
  const demo = bundle.situation?.demo || []
  const weather = channelById(channels, "weather")
  const biology = channelById(channels, "biology")
  const information = channelById(channels, "information")
  const traffic = channelById(demo, "traffic") || bundle.situation?.google || null
  const pathways = bundle.situation?.pathways || channelById(demo, "pathways")
  const navigation = channelById(demo, "navigation")
  const placeHits = osintPlaceHits([...demo, ...channels, pathways, traffic, navigation].filter(Boolean) as typeof demo)
  const nlm = bundle.nlm?.nlm
  const injects =
    bundle.situation?.official_injects?.status ||
    bundle.situation?.situation?.official_injects?.status ||
    "NOT_SUPPLIED"
  const pathTree = bundle.movement?.pathTree
  const demoBranch =
    pathTree?.branches[(Math.floor(state.index / 40) % Math.max(1, pathTree.branches.length || 1))] || null

  const pirAnswers: Record<string, string> = {
    "PIR-W": weatherAnswer(weather),
    "PIR-M":
      placeHits.length > 0
        ? `${placeHits.join(" · ")}. ${pathways?.status || navigation?.status || "OSINT only"}.`
        : `${pathways?.status || "NOT_SUPPLIED"} pathways · ${navigation?.status || "NOT_SUPPLIED"} navigation · ${
            traffic?.status || "NOT_SUPPLIED"
          } traffic. Not targeting data.`,
    "PIR-B": biologyAnswer(biology),
    "PIR-P": `Hypothesis path tree live=false · ${pathTree?.source || "pending"} · Weka/NLM movement ${
      bundle.movement?.sources.itdxWeka || "NOT_SUPPLIED"
    }.`,
  }

  return (
    <div
      className={styles.wrap}
      data-testid="itdx-synthetic-army-intel-briefing"
      data-variant={variant}
      data-itdx-live="false"
    >
      <div className={styles.banner} role="status" data-testid="itdx-synthetic-exercise-banner">
        <p className={styles.bannerTitle}>{ITDX_BRIEFING_BANNER}</p>
        <p className={styles.bannerMeta}>
          {ITDX_BRIEFING_CLASSIFICATION} commercial demo · not a live COP · live=false · official Army
          injects {injects}
        </p>
      </div>

      <BriefingSection
        id="ao"
        title="AO / terrain"
        isOpen={open.includes("ao")}
        onToggle={toggleSection}
      >
        <p className={styles.line} data-testid={variant === "intel-feed" ? "itdx-ao-place" : "itdx-briefing-ao"}>
          {ao.place} · {ao.lat.toFixed(4)}°N, {Math.abs(ao.lng).toFixed(4)}°W · bbox {ao.bbox.join(", ")}
        </p>
        <p className={styles.meta}>{ao.geocode}</p>
        <p className={styles.meta}>{ao.openTopo}</p>
        <p className={styles.meta}>
          Earth Sim Nature → Environment already hosts OpenTopo, wind, PM, modeled dispersal. Smoke
          renderer stays NOT_SUPPLIED.
        </p>
      </BriefingSection>

      <BriefingSection
        id="pirs"
        title="Training / synthetic PIRs"
        isOpen={open.includes("pirs")}
        onToggle={toggleSection}
      >
        <p className={styles.meta}>
          Generic public-language lines for this exercise. Not unit CCIR. Not a live PIR set.
        </p>
        {TRAINING_PIRS.map((pir) => (
          <article key={pir.id} className={styles.pir} data-testid={`itdx-training-pir-${pir.id}`}>
            <p className={styles.pirId}>
              {pir.id} · {pir.shortLabel}
            </p>
            <p className={styles.line}>{pir.question}</p>
            <p className={styles.meta}>{pirAnswers[pir.id]}</p>
          </article>
        ))}
      </BriefingSection>

      <BriefingSection
        id="playback"
        title="Synthetic situation playback"
        isOpen={open.includes("playback")}
        onToggle={toggleSection}
      >
        <div className={styles.row}>
          <button
            type="button"
            className={styles.btn}
            data-testid={variant === "intel-feed" ? "itdx-replay-play" : "itdx-briefing-play"}
            onClick={replay.play}
          >
            {state.playing ? "Pause" : `Play ${state.speed}×`}
          </button>
          <button type="button" className={styles.btn} onClick={() => replay.seek(0)}>
            Reset
          </button>
          <button type="button" className={styles.btn} onClick={replay.focus}>
            Focus AO
          </button>
        </div>
        <div className={styles.row} aria-label="Replay speed">
          {ITDX_REPLAY_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={styles.speed}
              aria-pressed={state.speed === speed}
              onClick={() => replay.setSpeed(speed as ItdxReplaySpeed)}
            >
              {speed}×
            </button>
          ))}
        </div>
        <input
          className={styles.range}
          type="range"
          aria-label="ITDX synthetic clock"
          min={0}
          max={SAMPLE_COUNT - 1}
          value={state.index}
          onChange={(event) => replay.seek(Number(event.target.value))}
        />
        <p className={styles.line} data-testid={variant === "intel-feed" ? "itdx-replay-sample" : "itdx-briefing-clock"}>
          {frame.replay_time} · sample {state.index}/{SAMPLE_COUNT - 1} · {state.layerStatus} ·{" "}
          {selected?.label ?? "no marker"} · {selected?.current_position_status.replaceAll("_", " ")}
        </p>
        <div className={styles.row}>
          {LAYER_ROWS.map((row) => (
            <button
              key={row.id}
              type="button"
              className={styles.btn}
              aria-pressed={layerOn(row.id)}
              onClick={() => toggleLayer(row.id)}
            >
              {row.label} {layerOn(row.id) ? "On" : "Off"}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          {ASSETS.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={styles.btn}
              aria-pressed={asset.id === selected?.id}
              onClick={() => replay.select(asset.id)}
            >
              {asset.label.replace("DEMO ", "")}
            </button>
          ))}
        </div>
        <p className={styles.meta}>
          Polylines and the hypothesis tree animate as demo only. Pause when this tab is hidden.
        </p>
      </BriefingSection>

      <BriefingSection
        id="models"
        title="NLM / Weka / MYCA / AVANI"
        isOpen={open.includes("models")}
        onToggle={toggleSection}
      >
        <div className={styles.strip}>
          <article className={styles.stripCard} data-testid="itdx-briefing-nlm">
            <p className={styles.kicker}>NLM (not Ollama)</p>
            <p className={statusClass(Boolean(nlm?.model_loaded))}>
              model_loaded={String(nlm?.model_loaded ?? "unknown")} · SHA {shortSha(nlm?.weights_sha256)}
            </p>
            <p className={styles.meta}>
              forecast_qualified={String(nlm?.forecast_qualified ?? false)} · bound_to_ollama=
              {String(nlm?.bound_to_ollama ?? false)} · p=null · {bundle.nlm?.engine?.state || "pending"}
            </p>
            <p className={styles.meta}>
              {bundle.nlm?.provenance?.note ||
                "Archived SYNTHETIC_TEST checkpoint is not a calibrated Fusarium forecast."}
            </p>
            {bundle.nlmError ? <p className={styles.warn}>{bundle.nlmError}</p> : null}
          </article>
          <article className={styles.stripCard} data-testid="itdx-briefing-weka">
            <p className={styles.kicker}>Weka eval</p>
            <p className={styles.line}>{wekaLine(bundle.weka, bundle.wekaError)}</p>
            <p className={styles.meta}>
              Inputs: recorded-bundle features. Cite /api/fusarium/itdx/weka-receipt. Abstention if
              verify ≠ PASS.
            </p>
          </article>
          <article className={styles.stripCard} data-testid="itdx-briefing-myca">
            <p className={styles.kicker}>MYCA proposal</p>
            <p className={styles.line}>
              {bundle.task8?.myca?.state || bundle.task8?.myca?.status || "MYCA unbound"} · HTTP{" "}
              {bundle.task8?.myca_status ?? "—"} · source {bundle.task8?.source || "none"}
            </p>
            <p className={styles.meta}>
              {(bundle.task8?.options || []).length
                ? bundle.task8?.options
                    ?.slice(0, 3)
                    .map((option) => option.title || option.id)
                    .join(" · ")
                : "No MYCA COA titles in this payload. None invented."}
            </p>
            {bundle.task8Error ? <p className={styles.warn}>{bundle.task8Error}</p> : null}
          </article>
          <article className={styles.stripCard} data-testid="itdx-briefing-avani">
            <p className={styles.kicker}>AVANI disposition</p>
            <p className={styles.line}>
              seven-role {bundle.task8?.seven_role?.qualification || "UNQUALIFIED"} · path{" "}
              {bundle.task8?.path || "—"}
            </p>
            {(bundle.task8?.governor || []).length > 0 ? (
              <ul className={styles.tree}>
                {bundle.task8?.governor?.slice(0, 3).map((row) => (
                  <li key={row.id} className={styles.meta}>
                    {row.title || row.id}: local {row.local_gate || "—"} · MAS{" "}
                    {row.mas_status === 200 ? (row.mas_approved ? "APPROVED" : "DENIED") : "UNREACHABLE"}
                    {row.mas_reason ? ` · ${row.mas_reason}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.meta}>
                {bundle.task8?.seven_role?.missing_artifact ||
                  "No per-role AVANI chorus. Abstain rather than invent seven PASS badges."}
              </p>
            )}
          </article>
        </div>
      </BriefingSection>

      <BriefingSection
        id="movement"
        title="Movement / C2 (honest)"
        isOpen={open.includes("movement")}
        onToggle={toggleSection}
      >
        {movementLines(bundle.movement, bundle.movementError).map((line) => (
          <p key={line} className={styles.line}>
            {line}
          </p>
        ))}
        {pathTree ? (
          <ul className={styles.tree} data-testid="itdx-briefing-path-tree">
            {pathTree.branches.map((branch) => (
              <li
                key={branch.id}
                className={styles.treeItem}
                data-active={demoBranch?.id === branch.id ? "true" : "false"}
              >
                <span>{branch.label}</span>
                <span className={styles.meta}>
                  {branch.bearingDeg.toFixed(0)}° · {Math.round(branch.distanceM)} m
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.meta}>Path tree pending from movement snapshot.</p>
        )}
        <p className={styles.meta}>
          Highlighted branch is a synthetic reveal on the exercise clock. live=false. Not a live
          enemy track.
        </p>
        {(bundle.movement?.devices || []).map((device) => (
          <p key={device.id} className={styles.meta}>
            {device.name} · live={String(device.live)} · path{" "}
            {device.path === "NOT_SUPPLIED" ? "NOT_SUPPLIED" : `${device.path.length} fixes`}
          </p>
        ))}
      </BriefingSection>

      <BriefingSection
        id="traffic"
        title="Traffic / pathways (cited OSINT)"
        isOpen={open.includes("traffic")}
        onToggle={toggleSection}
      >
        <p className={styles.line} data-testid="itdx-briefing-traffic">
          Traffic {traffic?.status || "NOT_SUPPLIED"}
          {traffic?.reason ? ` · ${traffic.reason}` : ""}
          {traffic?.note ? ` · ${traffic.note}` : ""}
        </p>
        <p className={styles.line}>
          Pathways {pathways?.status || "NOT_SUPPLIED"}
          {pathways?.rows ? ` · ${pathways.rows} OSM ways` : ""}
          {pathways?.note ? ` · ${pathways.note}` : ""}
        </p>
        <p className={styles.line}>
          Navigation {navigation?.status || "NOT_SUPPLIED"}
          {navigation?.note ? ` · ${navigation.note}` : ""}
        </p>
        {placeHits.length > 0 ? (
          <p className={styles.line}>{placeHits.join(" · ")}</p>
        ) : (
          <p className={styles.meta}>
            Hunter AAF / Hinesville ETAs stay hidden unless MAS situation-assessment cites them.
          </p>
        )}
        {information?.facts?.wikipedia?.length ? (
          <p className={styles.meta}>
            Wiki{" "}
            {information.facts.wikipedia.map((page) =>
              page.url ? (
                <a key={page.title} className={styles.cite} href={page.url} target="_blank" rel="noreferrer">
                  {page.title}
                </a>
              ) : (
                <span key={page.title}> {page.title}</span>
              ),
            )}
          </p>
        ) : (
          <p className={styles.meta}>Wikipedia pages NOT_SUPPLIED in this situation payload.</p>
        )}
        {bundle.situationError ? <p className={styles.warn}>{bundle.situationError}</p> : null}
      </BriefingSection>

      <BriefingSection
        id="ticks"
        title="Situation ticks"
        isOpen={open.includes("ticks")}
        onToggle={toggleSection}
      >
        <p className={styles.meta}>
          Situation HTTP {bundle.situation?.situation_status ?? "—"} · clock{" "}
          {bundle.situation?.situation?.clock || frame.replay_time} · fetched{" "}
          {bundle.loadedAt?.slice(11, 19) || "—"}Z
        </p>
        <ul className={styles.ticks} data-testid={variant === "intel-feed" ? "itdx-demo-log" : "itdx-briefing-ticks"}>
          {ticks.length === 0 ? (
            <li className={styles.meta}>No persisted demo ticks yet. Press Play to write the exercise log.</li>
          ) : (
            ticks
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.type}-${entry.clock}-${index}`} className={styles.meta}>
                  {entry.type} · {entry.clock ?? "—"} · {entry.assetId ?? "—"} · idx {entry.index ?? "—"} ·
                  live=false
                </li>
              ))
          )}
        </ul>
        {variant !== "workspace" ? (
          <Link className={styles.btn} href="/fusarium/itdx">
            Open ITDX workspace
          </Link>
        ) : (
          <Link className={styles.btn} href="/fusarium/earth-simulator">
            Open Earth Simulator
          </Link>
        )}
      </BriefingSection>
    </div>
  )
}

interface BriefingSectionProps {
  id: ItdxBriefingSectionId
  title: string
  isOpen: boolean
  onToggle: (id: ItdxBriefingSectionId) => void
  children: ReactNode
}

function BriefingSection({ id, title, isOpen, onToggle, children }: BriefingSectionProps) {
  return (
    <section className={styles.section} aria-labelledby={`itdx-brief-${id}`}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls={`itdx-brief-${id}-body`}
        onClick={() => onToggle(id)}
      >
        <span id={`itdx-brief-${id}`}>{title}</span>
        <span className={isOpen ? styles.on : styles.meta}>{isOpen ? "Collapse" : "Expand"}</span>
      </button>
      {isOpen ? (
        <div id={`itdx-brief-${id}-body`} className={styles.body}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
