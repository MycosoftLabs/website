"use client"

import { useState, type FormEvent } from "react"
import { Compass, Database, Loader2, MapPin, ShieldAlert, Wind } from "lucide-react"
import {
  buildMonitoringWeatherBbox,
  classifyMonitoringWeatherContext,
  COVERAGE_PLANNING_UNBOUND,
  parseMonitoringCandidateCoordinates,
  WEATHER_CONTEXT_HALF_SPAN_DEG,
  type MonitoringWeatherContext,
  type MonitoringWeatherObservation,
} from "@/lib/fusarium/aerosol/environmental-coverage-planning"
import styles from "./aerosol-map-workbench.module.css"

function metric(value: number | null | undefined, suffix: string) {
  return value == null ? "unbound" : `${Number(value.toFixed(2))}${suffix}`
}

function observationLabel(observation: MonitoringWeatherObservation | null) {
  if (!observation) return "qualified observation unavailable"
  return observation.stationName || observation.stationId || observation.source
}

function observedAt(observation: MonitoringWeatherObservation | null) {
  if (!observation) return "timestamp unavailable"
  const date = new Date(observation.observedAt)
  return Number.isNaN(date.getTime()) ? observation.observedAt : date.toLocaleString()
}

export function EnvironmentalCoveragePlanningPanel() {
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [context, setContext] = useState<MonitoringWeatherContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadContext = async (event: FormEvent) => {
    event.preventDefault()
    const candidate = parseMonitoringCandidateCoordinates(latitude, longitude)
    if (!candidate.ok) {
      setError(candidate.reason)
      setContext(null)
      return
    }

    setLoading(true)
    setError(null)
    const bbox = buildMonitoringWeatherBbox(candidate.value)
    const bboxText = [bbox.west, bbox.south, bbox.east, bbox.north].join(",")
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch(`/api/crep/environment/weather?bbox=${encodeURIComponent(bboxText)}&limit=500`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`weather context status ${response.status}`)
      const payload = await response.json() as unknown
      setContext(classifyMonitoringWeatherContext(payload, candidate.value, new Date().toISOString()))
    } catch (loadError) {
      const reason = loadError instanceof DOMException && loadError.name === "AbortError"
        ? "Weather context request timed out. Candidate coordinates are retained, but environmental context remains unbound."
        : loadError instanceof Error ? loadError.message : "Weather context request failed."
      setError(reason)
      setContext(classifyMonitoringWeatherContext(null, candidate.value, new Date().toISOString()))
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  const wind = context?.nearestWindObservation ?? null
  const humidity = context?.nearestHumidityObservation ?? null
  const nearest = context?.nearestObservation ?? null

  return (
    <section className={styles.coveragePlanning} data-testid="environmental-coverage-planning">
      <header>
        <div>
          <span>Candidate context · operator supplied</span>
          <h4><Compass size={15} /> Environmental monitoring coverage planning</h4>
        </div>
        <b>no score · no recommendation</b>
      </header>
      <p className={styles.coveragePlanningIntro}>
        Enter a candidate coordinate to inspect qualified weather observations. No location is assumed, ranked, or recommended, and the retrieval window is not device coverage.
      </p>

      <form onSubmit={loadContext} className={styles.coveragePlanningForm}>
        <label>
          <span>Candidate latitude</span>
          <input
            type="number"
            min={-90}
            max={90}
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.currentTarget.value)}
            placeholder="not supplied"
            inputMode="decimal"
          />
        </label>
        <label>
          <span>Candidate longitude</span>
          <input
            type="number"
            min={-180}
            max={180}
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.currentTarget.value)}
            placeholder="not supplied"
            inputMode="decimal"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? <Loader2 size={14} className={styles.spin} /> : <MapPin size={14} />}
          {loading ? "Loading context" : "Load verified context"}
        </button>
      </form>
      <small className={styles.coveragePlanningWindow}>
        Observation retrieval window: ±{WEATHER_CONTEXT_HALF_SPAN_DEG}° around the candidate. This window is a query boundary, not a sampling or network footprint.
      </small>

      {error ? <p className={styles.coveragePlanningError} role="alert">{error}</p> : null}

      {context ? (
        <div className={styles.coveragePlanningResults} aria-live="polite">
          <div className={styles.coveragePlanningState} data-state={context.state}>
            <span><MapPin size={13} /> {context.candidate.latitude.toFixed(6)}, {context.candidate.longitude.toFixed(6)}</span>
            <b>{context.state}</b>
            <small>{context.reason}</small>
          </div>

          <div className={styles.coverageEvidenceGrid}>
            <article>
              <span><Wind size={13} /> Wind observation</span>
              <strong>{metric(wind?.windSpeedMs, " m/s")} · {metric(wind?.windDirection, "°")}</strong>
              <small>{observationLabel(wind)} · {wind ? `${wind.distanceKm.toFixed(1)} km from candidate` : "distance unavailable"}</small>
              <small>{observedAt(wind)}</small>
            </article>
            <article>
              <span>Humidity observation</span>
              <strong>{metric(humidity?.humidityPct, "% RH")}</strong>
              <small>{observationLabel(humidity)} · {humidity ? `${humidity.distanceKm.toFixed(1)} km from candidate` : "distance unavailable"}</small>
              <small>{observedAt(humidity)}</small>
            </article>
            <article>
              <span>Weather context</span>
              <strong>{metric(nearest?.temperatureC, " °C")} · {metric(nearest?.precipitationMm, " mm precip")}</strong>
              <small>{nearest?.conditions || "conditions unbound"} · {nearest?.cloudCoverPct == null ? "cloud cover unbound" : `${nearest.cloudCoverPct}% cloud`}</small>
              <small>Soil moisture: unbound</small>
            </article>
          </div>

          <div className={styles.coverageUnboundGrid}>
            <article>
              <span><ShieldAlert size={13} /> Access</span>
              <b>unbound</b>
              <p>{COVERAGE_PLANNING_UNBOUND.access}</p>
            </article>
            <article>
              <span><ShieldAlert size={13} /> Device coverage</span>
              <b>unbound</b>
              <p>{COVERAGE_PLANNING_UNBOUND.deviceCoverage}</p>
            </article>
            <article>
              <span><ShieldAlert size={13} /> Soil moisture</span>
              <b>unbound</b>
              <p>{COVERAGE_PLANNING_UNBOUND.soilMoisture}</p>
            </article>
          </div>

          <section className={styles.coverageProvenance}>
            <h5><Database size={13} /> Weather provenance</h5>
            <dl>
              <div><dt>Endpoint</dt><dd>{context.provenance.endpoint}</dd></div>
              <div><dt>Source</dt><dd>{context.provenance.source ?? "unbound"}</dd></div>
              <div><dt>Upstream</dt><dd>{context.provenance.upstream ?? "unbound"}</dd></div>
              <div><dt>Retrieved</dt><dd>{context.provenance.retrievedAt ?? "unbound"}</dd></div>
              <div><dt>Observations</dt><dd>{context.observations.length} timestamp-qualified</dd></div>
              <div><dt>Decision</dt><dd>{context.decisionState}</dd></div>
            </dl>
          </section>
        </div>
      ) : (
        <div className={styles.coveragePlanningEmpty}>
          <MapPin size={18} />
          <span>No candidate coordinate has been supplied.</span>
        </div>
      )}
    </section>
  )
}
