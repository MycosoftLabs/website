"use client"

/**
 * ITDXFlyBrainPanel — FlyWire whole-brain LIF (Shiu et al. 2024) plugged into the ITDX workspace.
 *
 * Everything shown is SIMULATED. The panel renders exactly what MAS 188 `/api/flybrain/*` returned
 * through the owner-gated BFF (`/api/fusarium/flybrain/...`): no connectome / no detector / no
 * session is written out as such, with the reason. Droid plug sessions are always dry-run and the
 * panel has no actuate control at all.
 */

import { useMemo, useState } from "react"
import { useFlyBrainSession } from "@/hooks/use-flybrain-session"
import type { Detection, Observation, PlugName } from "@/lib/flybrain/contract"
import styles from "./itdx-flybrain-panel.module.css"

const PLUGS: Array<{ id: PlugName; label: string }> = [
  { id: "standalone", label: "standalone" },
  { id: "itdx", label: "itdx" },
  { id: "earthsim", label: "earthsim" },
  { id: "droid", label: "droid" },
]

/**
 * Optional simulated optogenetic-style drive sent as a `raw_rates` observation. These are the
 * Shiu et al. 2024 experiment stimuli (P9 @ 100 Hz, sugar GRNs @ 200 Hz), not sensor data.
 */
const DRIVES: Array<{ id: string; label: string; rates: Record<string, number> | null }> = [
  { id: "none", label: "no drive (spontaneous only)", rates: null },
  { id: "p9", label: "P9 L+R @ 100 Hz (forward walking)", rates: { p9_left: 100, p9_right: 100 } },
  { id: "p9_left", label: "P9 left @ 100 Hz", rates: { p9_left: 100 } },
  { id: "p9_right", label: "P9 right @ 100 Hz", rates: { p9_right: 100 } },
  { id: "sugar", label: "sugar GRNs @ 200 Hz (feeding)", rates: { sugar_grn: 200 } },
]

const FETCH_HINT = "No connectome on MAS 188 — run scripts/flybrain_fetch_connectome.py"

const fmt = (value: number | null | undefined, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—"

function detectionGeometry(detection: Detection) {
  const bearing = typeof detection.bearing_deg === "number" ? `${detection.bearing_deg.toFixed(0)}°` : null
  const range =
    typeof detection.range_m === "number"
      ? `${detection.range_m.toFixed(0)} m${detection.range_source === "estimate" ? " (est.)" : ""}`
      : null
  if (!bearing && !range) return "—"
  return [bearing, range].filter(Boolean).join(" / ")
}

export function ITDXFlyBrainPanel() {
  const fb = useFlyBrainSession()
  const [plug, setPlug] = useState<PlugName>("standalone")
  const [drive, setDrive] = useState("p9")

  const health = fb.health
  // `connectome.loaded` is lazy in-memory state on MAS 188: it is false after every MAS restart even
  // when the FlyWire files are on disk, and the first POST /sessions is what loads them. Gate the
  // controls on availability (health.status !== "unavailable"); use `loaded` only for the chip text.
  const connectomeLoaded = Boolean(health?.connectome?.loaded)
  const connectomeAvailable = Boolean(health) && health?.status !== "unavailable"
  const visionAvailable = Boolean(health?.vision?.available)
  const backend = health?.backend || "—"
  const session = fb.session
  const tick = fb.lastTick

  const healthLine = (() => {
    if (fb.healthStatus === null) return "Probing /api/fusarium/flybrain/health…"
    if (fb.healthStatus === 0) return "Health request failed in the browser (network)."
    if (!health) return `MAS FlyBrain health not returned (HTTP ${fb.healthStatus}) — router not mounted, MAS 188 unreachable, or not owner.`
    return `MAS FlyBrain ${health.status} (HTTP ${fb.healthStatus})${health.note ? ` · ${health.note}` : ""}`
  })()

  const topRates = useMemo(() => {
    const rates = tick?.brain?.rates_hz || {}
    return Object.entries(rates)
      .filter(([, hz]) => typeof hz === "number" && Number.isFinite(hz))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [tick])
  const maxRate = topRates.reduce((max, [, hz]) => Math.max(max, hz), 0)

  const observations = (): Observation[] => {
    const chosen = DRIVES.find((row) => row.id === drive)
    if (!chosen?.rates) return []
    return [{ kind: "raw_rates", payload: { ...chosen.rates }, source: "itdx-panel" }]
  }

  const startDisabled = fb.busy || !connectomeAvailable || Boolean(session)
  const startTitle = !connectomeAvailable ? FETCH_HINT : session ? "Stop the current session first" : "Create a dry-run session on MAS 188"
  // Live indicator comes from what MAS reports (autopilot task alive) or a request in flight from
  // this panel — never from a client-side status string, which the hook cannot keep in sync.
  const sessionLive = session ? (session.autopilot ? "autopilot running" : fb.busy ? "request in flight" : session.error ? "error" : "idle") : ""

  return (
    <section className={styles.wrap} data-testid="itdx-flybrain-panel">
      <p className={styles.kicker}>ITDX plug · MAS 188 /api/flybrain via owner BFF</p>
      <h2 className={styles.title}>FlyBrain · FlyWire whole-brain LIF · SIMULATED</h2>
      <p className={styles.meta}>{healthLine}</p>
      {fb.error ? <p className={styles.warn}>{fb.error}</p> : null}

      <div className={styles.chips} data-testid="itdx-flybrain-status">
        <span className={styles.chip} data-state={connectomeLoaded ? "on" : "off"} data-testid="itdx-flybrain-chip-connectome">
          connectome {health ? (connectomeLoaded ? `loaded · ${health.connectome.n_neurons.toLocaleString()} neurons · ${health.connectome.n_synapses.toLocaleString()} synapses` : connectomeAvailable ? "present on disk, not loaded yet" : "not on disk") : "unknown"}
        </span>
        <span className={styles.chip} data-state={visionAvailable ? "on" : "off"} data-testid="itdx-flybrain-chip-vision">
          vision {health ? (visionAvailable ? `${health.vision.engine || "available"}${health.vision.sahi ? " + SAHI" : ""}` : "unavailable") : "unknown"}
        </span>
        <span className={styles.chip} data-state={health ? "on" : "off"}>
          backend {backend}
          {health?.cuda_available ? " · cuda" : ""}
        </span>
        <span className={styles.chip} data-state={health ? (health.sessions > 0 ? "on" : "off") : "off"}>
          sessions {health ? `${health.sessions} · autopilots ${health.autopilots}` : "unknown"}
        </span>
      </div>
      {health && !connectomeAvailable ? (
        <p className={styles.warn}>
          {FETCH_HINT}
          {health.connectome.reason ? ` · ${health.connectome.reason}` : ""}
        </p>
      ) : null}
      {health && !visionAvailable ? (
        <p className={styles.meta}>Vision unavailable: {health.vision.reason || "no YOLO26 weights or remote detector on MAS 188"}. No detections will be shown.</p>
      ) : null}

      <div className={styles.controls}>
        <label>
          plug
          <select value={plug} onChange={(event) => setPlug(event.target.value as PlugName)} disabled={Boolean(session)} data-testid="itdx-flybrain-plug">
            {PLUGS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        {plug === "droid" ? <span className={styles.badge} data-testid="itdx-flybrain-dry-run">dry-run</span> : null}
        <label>
          drive
          <select value={drive} onChange={(event) => setDrive(event.target.value)} data-testid="itdx-flybrain-drive">
            {DRIVES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void fb.createSession(plug)} disabled={startDisabled} title={startTitle} data-testid="itdx-flybrain-start">
          Start session
        </button>
        <button type="button" onClick={() => void fb.tick(observations())} disabled={fb.busy || !session} data-testid="itdx-flybrain-tick">
          Tick
        </button>
        <button type="button" onClick={() => void fb.toggleAutopilot()} disabled={fb.busy || !session} aria-pressed={Boolean(session?.autopilot)} data-testid="itdx-flybrain-autopilot">
          Autopilot {session?.autopilot ? "on" : "off"}
        </button>
        <button type="button" onClick={() => void fb.stop()} disabled={fb.busy || !session} data-testid="itdx-flybrain-stop">
          Stop
        </button>
      </div>

      <p className={styles.meta} data-testid="itdx-flybrain-session">
        {session
          ? `session ${session.session_id} · plug ${session.config?.plug || "?"} · ${sessionLive} · backend ${session.backend} · ${session.n_neurons.toLocaleString()} neurons · ticks ${session.ticks} · t ${fmt(session.t_ms, 1)} ms · dry_run ${session.config?.dry_run === false ? "false" : "true"}${session.error ? ` · error ${session.error}` : ""}`
          : connectomeAvailable
            ? connectomeLoaded
              ? "No session. Start one to allocate a whole-brain engine on MAS 188 (dry-run)."
              : "No session. Start one to load the connectome from disk and allocate a whole-brain engine on MAS 188 (dry-run)."
            : "No session — sessions are 503 until a connectome is on disk on MAS 188."}
      </p>

      <div className={styles.grid}>
        <article className={styles.card}>
          <p className={styles.kicker}>Population rates (Hz, simulated, top 12)</p>
          {topRates.length === 0 ? (
            <p className={styles.meta}>{tick ? "No group rates in the last tick (brain silent in this window or atlas groups empty)." : session ? "No tick yet — press Tick to run one window." : "No session, so no rates."}</p>
          ) : (
            <table className={styles.rates} data-testid="itdx-flybrain-rates">
              <thead>
                <tr>
                  <th>group</th>
                  <th className={styles.barCell}>rate</th>
                  <th>Hz</th>
                </tr>
              </thead>
              <tbody>
                {topRates.map(([group, hz]) => (
                  <tr key={group}>
                    <td>{group}</td>
                    <td className={styles.barCell}>
                      <div className={styles.bar} role="img" aria-label={`${group} ${hz.toFixed(1)} Hz`}>
                        <div className={styles.barFill} style={{ width: `${maxRate > 0 ? Math.max(0, Math.min(100, (hz / maxRate) * 100)) : 0}%` }} />
                      </div>
                    </td>
                    <td className={styles.num}>{hz.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tick ? (
            <p className={styles.meta}>
              tick {tick.tick} · t {fmt(tick.t_ms, 1)} ms · window {fmt(tick.brain.window_ms, 0)} ms · spikes {tick.brain.spike_count_window} · active {tick.brain.n_active}/{tick.brain.n_neurons} · wall {fmt(tick.wall_ms, 0)} ms
              {typeof tick.brain.realtime_ratio === "number" ? ` · ${fmt(tick.brain.realtime_ratio, 2)}× realtime` : ""} · origin {tick.origin}
            </p>
          ) : null}
        </article>

        <article className={styles.card}>
          <p className={styles.kicker}>Motor action (decoded)</p>
          {tick ? (
            <dl className={styles.dl} data-testid="itdx-flybrain-action">
              <dt>kind</dt>
              <dd>{tick.action.kind}</dd>
              <dt>forward</dt>
              <dd>{fmt(tick.action.forward)}</dd>
              <dt>turn</dt>
              <dd>{fmt(tick.action.turn)} {tick.action.turn < 0 ? "(left)" : tick.action.turn > 0 ? "(right)" : ""}</dd>
              <dt>heading Δ</dt>
              <dd>{fmt(tick.action.heading_delta_deg, 1)}°</dd>
              <dt>throttle</dt>
              <dd>{fmt(tick.action.throttle_pct, 0)}%</dd>
              <dt>confidence</dt>
              <dd>{fmt(tick.action.confidence)}</dd>
              {tick.action.note ? (
                <>
                  <dt>note</dt>
                  <dd>{tick.action.note}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className={styles.meta}>No action — nothing decoded until a tick runs.</p>
          )}
          {tick?.plug === "droid" ? <p className={styles.meta}>droid plug: guidance only, dry_run {String(tick.dry_run)} — nothing was actuated from this panel.</p> : null}
          {tick?.notes?.length ? <p className={styles.meta}>{tick.notes.join(" · ")}</p> : null}
        </article>

        <article className={styles.card}>
          <p className={styles.kicker}>Nav path</p>
          {tick?.nav ? (
            <>
              <p className={tick.nav.feasible ? styles.on : styles.warn}>
                {tick.nav.feasible ? "feasible" : "infeasible"} · {tick.nav.waypoints.length} waypoints · blocked {tick.nav.blocked_cells}/{tick.nav.total_cells} cells · cost {fmt(tick.nav.cost, 1)} · turn bias {fmt(tick.nav.turn_bias)}
                {tick.nav.note ? ` · ${tick.nav.note}` : ""}
              </p>
              {tick.nav.waypoints.length > 0 ? (
                <ol className={styles.list} data-testid="itdx-flybrain-waypoints">
                  {tick.nav.waypoints.map((wp, index) => (
                    <li key={`${index}-${wp.lat}-${wp.lon}`} className={styles.row}>
                      <span>
                        {index + 1}. {wp.lat.toFixed(5)}, {wp.lon.toFixed(5)}
                      </span>
                      <span className={styles.off}>
                        {wp.hold_seconds ? `hold ${wp.hold_seconds}s` : ""}
                        {wp.note ? ` ${wp.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.meta}>No waypoints — planner returned none{tick.nav.note ? `: ${tick.nav.note}` : "."}</p>
              )}
            </>
          ) : (
            <p className={styles.meta}>
              {tick
                ? `No NavPath in the last tick — the ${tick.plug} plug did not plan (needs an AO/occupancy grid; standalone never navigates).`
                : "No nav path — no tick yet."}
            </p>
          )}
        </article>

        <article className={styles.card}>
          <p className={styles.kicker}>Detections (YOLO26 + SAHI)</p>
          {tick?.detections ? (
            tick.detections.available ? (
              tick.detections.detections.length > 0 ? (
                <ul className={styles.list} data-testid="itdx-flybrain-detections">
                  {tick.detections.detections.map((det) => (
                    <li key={det.id} className={styles.row}>
                      <span>
                        {det.cls} · {det.category} · {fmt(det.conf)}
                      </span>
                      <span className={styles.off}>
                        {det.taxon?.matched && det.taxon.scientific_name ? det.taxon.scientific_name : "—"} · {detectionGeometry(det)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.meta}>Detector ran ({tick.detections.engine || "engine ?"}{tick.detections.sahi ? `, SAHI ${tick.detections.slices} slices` : ""}) and found nothing{tick.detections.note ? ` · ${tick.detections.note}` : "."}</p>
              )
            ) : (
              <p className={styles.meta}>Detections unavailable: {tick.detections.note || "no detector on MAS 188"}. No boxes are invented.</p>
            )
          ) : (
            <p className={styles.meta}>
              {tick
                ? `Last tick carried no DetectionFrame (${tick.plug} plug sent no camera observation${visionAvailable ? "" : "; vision is unavailable on MAS 188"}).`
                : visionAvailable
                  ? "No detections — no tick yet."
                  : `No detections — vision unavailable on MAS 188${health?.vision?.reason ? ` (${health.vision.reason})` : ""}.`}
            </p>
          )}
        </article>
      </div>

      <p className={styles.meta}>
        Model: Shiu et al. 2024 whole-brain LIF on FlyWire v783 (138,639 neurons). Rates are simulation output, not biological measurements. Website sessions are dry-run; actuation is gated on MAS (FLYBRAIN_DROID_ACTUATE + AVANI) and never reachable from here.
      </p>
    </section>
  )
}
