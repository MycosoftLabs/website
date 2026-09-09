"use client"

import { useEffect, useState } from "react"
import { ITDXGoogleTrafficOverlay } from "./ITDXGoogleTrafficOverlay"
import styles from "./itdx-task8-panel.module.css"

interface WikiCite {
  title: string
  url?: string
}

interface ChannelFacts {
  reason?: string | null
  capability_class?: string | null
  live?: boolean | null
  temperature_c?: number
  nws?: string
  nws_cwa?: string | null
  open_meteo?: string
  gbif_count?: number
  inaturalist_count?: number
  wikipedia?: WikiCite[]
  nominatim?: string[]
}

interface Citation {
  name: string
  url?: string
  count?: number | null
}

interface SourceRow {
  id: string
  status: string
  note?: string
  reason?: string | null
  rows?: number
  http_status?: number
  path?: string
  source_url?: string
  verdict?: string
  bound?: boolean
  label?: string
  name?: string
  configured?: boolean
  facts?: ChannelFacts
  citations?: Citation[]
  chips?: Array<{ id: string; label: string; kind: string; synthetic?: boolean; live?: boolean }>
  geojson?: { type: string; features?: unknown[] } | null
}

interface SituationPayload {
  situation_status?: number
  situation?: { schema_version?: string; channels?: SourceRow[]; note?: string; source_url?: string }
  demo?: SourceRow[]
  google?: SourceRow
  pathways?: SourceRow
  base?: SourceRow
  devices?: SourceRow
  task8?: { path?: string; roles?: SourceRow[]; source?: string }
  health_status?: number
  mindex?: { note?: string; sources?: SourceRow[]; base?: string }
}

function isLiveStatus(status: string) {
  return status === "SUPPLIED" || status === "BOUND"
}

function channelById(channels: SourceRow[], id: string) {
  return channels.find((channel) => channel.id === id) || null
}

function weatherLine(channel: SourceRow | null) {
  if (!channel) return "Weather not returned."
  if (channel.status !== "SUPPLIED" || channel.facts?.temperature_c == null) {
    return `${channel.status}${channel.reason ? ` · ${channel.reason}` : channel.note ? ` · ${channel.note}` : ""}`
  }
  return `${channel.facts.temperature_c}°C Open-Meteo · NWS 31.8697,-81.6072${channel.facts.nws_cwa ? ` ${channel.facts.nws_cwa}` : ""}`
}

function biologyLine(channel: SourceRow | null) {
  if (!channel) return "Biology not returned."
  if (channel.status !== "SUPPLIED") {
    return `${channel.status}${channel.reason ? ` · ${channel.reason}` : ""}`
  }
  return `GBIF ${channel.facts?.gbif_count ?? "—"} fungi · iNaturalist ${channel.facts?.inaturalist_count ?? "—"}`
}

export function ITDXSituationPanel() {
  const [data, setData] = useState<SituationPayload | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch("/api/fusarium/itdx/situation", { cache: "no-store" })
        const payload = (await response.json()) as SituationPayload & { error?: string }
        if (cancelled) return
        if (!response.ok) {
          setError(payload.error || `Situation ${response.status}`)
          return
        }
        setError("")
        setData(payload)
        window.dispatchEvent(new CustomEvent("fusarium:itdx-pathways", { detail: payload.pathways || null }))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Situation unavailable")
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 8000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const masChannels = data?.situation?.channels || []
  const demoCards = data?.demo || []
  const mindexSources = data?.mindex?.sources || []
  const roles = data?.task8?.roles || []
  const chips = data?.devices?.chips || []
  const weather = channelById(masChannels, "weather")
  const biology = channelById(masChannels, "biology")
  const information = channelById(masChannels, "information")
  const equipment = channelById(masChannels, "equipment_weapons_assets")
  const wikiPages = information?.facts?.wikipedia || []

  return (
    <section className={styles.wrap} data-testid="itdx-situation-panel">
      <p className={styles.kicker}>Intel Feed · MAS 188 situation-assessment</p>
      <p className={styles.meta}>
        POST /api/itdx/situation-assessment {data?.situation_status || "—"} · GET /api/itdx/health{" "}
        {data?.health_status || "—"} · Task 8 {data?.task8?.path || "unbound"}
      </p>
      {error ? <p className={styles.warn}>{error}</p> : null}

      <ul className={styles.list} data-testid="itdx-intel-feed">
        <li className={styles.row} data-status={weather?.status || "NOT_SUPPLIED"} data-testid="itdx-intel-weather">
          <span>weather</span>
          <span className={isLiveStatus(weather?.status || "") ? styles.on : styles.off}>{weatherLine(weather)}</span>
          {weather?.facts?.nws ? (
            <a className={styles.cite} href={weather.facts.nws} target="_blank" rel="noreferrer">
              NWS
            </a>
          ) : null}
          {weather?.facts?.open_meteo ? (
            <a className={styles.cite} href={weather.facts.open_meteo} target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          ) : null}
        </li>
        <li className={styles.row} data-status={biology?.status || "NOT_SUPPLIED"} data-testid="itdx-intel-biology">
          <span>biology</span>
          <span className={isLiveStatus(biology?.status || "") ? styles.on : styles.off}>{biologyLine(biology)}</span>
        </li>
        <li className={styles.row} data-status={information?.status || "NOT_SUPPLIED"} data-testid="itdx-intel-information">
          <span>information</span>
          <span className={isLiveStatus(information?.status || "") ? styles.on : styles.off}>
            {information?.status || "NOT_SUPPLIED"}
            {wikiPages.length === 0 ? " · Wikipedia not supplied" : ""}
          </span>
          {wikiPages.map((page) =>
            page.url ? (
              <a key={page.title} className={styles.cite} href={page.url} target="_blank" rel="noreferrer" data-testid="itdx-intel-wiki">
                {page.title}
              </a>
            ) : (
              <span key={page.title} className={styles.cite}>
                {page.title}
              </span>
            ),
          )}
        </li>
        <li className={styles.row} data-status={equipment?.status || "NOT_SUPPLIED"} data-testid="itdx-intel-equipment">
          <span>equipment_weapons_assets</span>
          <span className={isLiveStatus(equipment?.status || "") ? styles.on : styles.off}>
            {equipment?.status || "NOT_SUPPLIED"}
            {equipment?.facts?.capability_class ? ` · ${equipment.facts.capability_class}` : ""}
            {equipment?.facts?.live === false ? " · live=false" : ""}
          </span>
        </li>
      </ul>

      <p className={styles.kicker}>Demo channels</p>
      <ul className={styles.list} data-testid="itdx-demo-channels">
        {demoCards.length === 0 ? (
          <li className={styles.meta}>Demo traffic / pathways / navigation not queried yet.</li>
        ) : (
          demoCards.map((channel) => (
            <li key={channel.id} className={styles.row} data-status={channel.status} data-testid={`itdx-demo-${channel.id}`}>
              <span>{channel.id}</span>
              <span className={isLiveStatus(channel.status) ? styles.on : styles.off}>
                {channel.status}
                {channel.reason ? ` · ${channel.reason}` : channel.rows ? ` · ${channel.rows}` : ""}
                {channel.note && !channel.reason ? ` · ${channel.note}` : ""}
              </span>
            </li>
          ))
        )}
      </ul>
      {data?.google?.configured ? <ITDXGoogleTrafficOverlay /> : (
        <p className={styles.warn} data-testid="itdx-google-missing">
          {data?.google?.reason || data?.google?.note || "google_maps_key_missing. Traffic is not faked."}
        </p>
      )}
      {chips.length > 0 ? (
        <div className={styles.chips} data-testid="itdx-vehicle-chips">
          {chips.map((chip) => (
            <span key={chip.id} className={styles.chip}>
              {chip.label} · {chip.kind}
              {chip.live === false ? " · live=false" : ""}
              {chip.synthetic ? " · synthetic" : ""}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.meta}>Vehicle/asset chips: {data?.devices?.note || "NOT_SUPPLIED until MAS returns inventory."}</p>
      )}

      <p className={styles.kicker}>MAS situation channels</p>
      <ul className={styles.list} data-testid="itdx-situation-channels">
        {masChannels.length === 0 ? (
          <li className={styles.meta}>MAS situation channels not yet returned.</li>
        ) : (
          masChannels.map((channel) => (
            <li key={channel.id} className={styles.row} data-status={channel.status}>
              <span>{channel.id}</span>
              <span className={isLiveStatus(channel.status) ? styles.on : styles.off}>
                {channel.status}
                {channel.reason ? ` · ${channel.reason}` : channel.note ? ` · ${channel.note}` : ""}
              </span>
            </li>
          ))
        )}
      </ul>
      <p className={styles.kicker}>MINDEX sources</p>
      <p className={styles.meta}>{data?.mindex?.note || "MINDEX not queried yet."}</p>
      <ul className={styles.list} data-testid="itdx-mindex-sources">
        {mindexSources.map((source) => (
          <li key={source.id} className={styles.row} data-status={source.status}>
            <span>{source.id}</span>
            <span className={isLiveStatus(source.status) ? styles.on : styles.off}>
              {source.status}
              {source.rows ? ` · ${source.rows} rows` : ""}
              {source.http_status ? ` · HTTP ${source.http_status}` : ""}
              {source.note ? ` · ${source.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {roles.length > 0 ? (
        <p className={styles.meta} data-testid="itdx-situation-task8">
          Task 8 roles {roles.map((role) => `${role.label || role.id}:${role.verdict || role.status}`).join(" · ")}
        </p>
      ) : (
        <p className={styles.warn}>Task 8 roles not in this payload.</p>
      )}
    </section>
  )
}
