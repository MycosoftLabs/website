"use client"

import { useCallback, useEffect, useState } from "react"
import { GitBranch, Navigation, Radio, Triangle, Waypoints } from "lucide-react"
import type { MovementSnapshot } from "@/lib/fusarium/movement/contracts"
import styles from "./device-movement-panel.module.css"

interface DeviceMovementPanelProps {
  title?: string
  compact?: boolean
  snapshot?: MovementSnapshot | null
  onSnapshot?: (snapshot: MovementSnapshot | null) => void
}

export function DeviceMovementPanel({
  title = "Device movement / C2",
  compact = false,
  snapshot: controlled,
  onSnapshot,
}: DeviceMovementPanelProps) {
  const [internal, setInternal] = useState<MovementSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<string | null>(null)
  const snapshot = controlled ?? internal

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/fusarium/movement/snapshot", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) {
        throw new Error(`Movement snapshot ${response.status}`)
      }
      const next = (await response.json()) as MovementSnapshot
      setInternal(next)
      onSnapshot?.(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Movement snapshot failed")
      setInternal(null)
      onSnapshot?.(null)
    } finally {
      setLoading(false)
    }
  }, [onSnapshot])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      void load()
    }, 30_000)
    const onVisibility = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [load])

  const proposeWaypoint = () => {
    if (!snapshot || snapshot.liveDeviceCount === 0) {
      setProposal("No live device to address. Proposal withheld.")
      return
    }
    const target = snapshot.devices[0]
    setProposal(
      `Propose only: waypoint hold for ${target.name} at last live fix ${target.fix.lat.toFixed(4)}, ${target.fix.lng.toFixed(4)}. Command API cannot accept waypoints. Receipt: NOT_SUPPLIED.`,
    )
  }

  return (
    <section className={styles.panel} data-compact={compact ? "true" : "false"} aria-label={title}>
      <header className={styles.header}>
        <div>
          <h2>{title}</h2>
          <p>Live positions from MAS / MINDEX / operator heartbeats only. Path tree and triangulation stay labeled when they are not a lock.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </header>

      {loading ? <p className={styles.status}>Loading live movement…</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {snapshot?.emptyReason ? (
        <p className={styles.empty} role="status">No live devices. {snapshot.emptyReason}</p>
      ) : null}

      {snapshot ? (
        <>
          <div className={styles.chips} aria-label="Movement truth">
            <span data-tone="live">Live {snapshot.liveDeviceCount}</span>
            <span data-tone="hyp">Path tree hypothesis</span>
            <span data-tone={snapshot.triangulation?.live ? "live" : "hyp"}>
              Triangle {snapshot.triangulation?.live ? "geometric fix" : "proposal"}
            </span>
            <span data-tone="gap">Trails {snapshot.sources.telemetryTrails}</span>
            <span data-tone="gap">Weka {snapshot.sources.itdxWeka}</span>
          </div>

          <ul className={styles.devices}>
            {snapshot.devices.map((device) => (
              <li key={device.id}>
                <strong>{device.name}</strong>
                <span>{device.status} · {device.source}</span>
                <span>
                  {device.fix.lat.toFixed(5)}, {device.fix.lng.toFixed(5)}
                </span>
                <em>{device.path === "NOT_SUPPLIED" ? "Path NOT_SUPPLIED" : `${device.path.length} recorded fixes`}</em>
              </li>
            ))}
          </ul>

          {snapshot.coordination.length > 0 ? (
            <div className={styles.math}>
              <h3><Radio aria-hidden="true" /> Coordination</h3>
              <ul>
                {snapshot.coordination.map((pair) => (
                  <li key={`${pair.fromId}-${pair.toId}`}>
                    {pair.fromId} → {pair.toId}: {Math.round(pair.rangeM)} m at {Math.round(pair.bearingDeg)}°
                    <small> {pair.formula}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.note}>Coordination needs ≥2 live devices.</p>
          )}

          <div className={styles.math}>
            <h3><Triangle aria-hidden="true" /> Triangulation</h3>
            <p>{snapshot.triangulation?.note}</p>
          </div>
          <div className={styles.math}>
            <h3><GitBranch aria-hidden="true" /> Path tree</h3>
            <p>{snapshot.pathTree.note}</p>
            <ul>
              {snapshot.pathTree.branches.map((branch) => (
                <li key={branch.id}>{branch.label} · {Math.round(branch.bearingDeg)}° · {Math.round(branch.distanceM)} m</li>
              ))}
            </ul>
          </div>

          <div className={styles.commands}>
            <button type="button" onClick={proposeWaypoint}>
              <Waypoints aria-hidden="true" /> Propose waypoint
            </button>
            <button type="button" disabled title={snapshot.commandSeam.note}>
              <Navigation aria-hidden="true" /> Send mission (unavailable)
            </button>
          </div>
          <p className={styles.gap}>{snapshot.commandSeam.note}</p>
          {proposal ? <p className={styles.proposal}>{proposal}</p> : null}
        </>
      ) : null}
    </section>
  )
}
