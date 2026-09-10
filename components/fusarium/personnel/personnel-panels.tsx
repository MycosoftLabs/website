"use client"

import { useEffect, useMemo, useState } from "react"
import { useFusariumRole } from "@/lib/fusarium/personnel/role-context"

interface OutcomesPayload {
  n: { surveys: number; telemetry: number; inferences: number }
  tiles: Record<string, { display: string; value: number | null; source_class: string; note?: string; unit?: string | null }>
  surveys: Array<{ id: string; submitted_at: string; instrument: string; role_id: string; comments?: string | null }>
  inferences: Array<{ id: string; hypothesis: string; uncertainty: string; source_class: string }>
  honesty: string[]
  package_calc_checks_passed: number
  in_boundary_cui: { copy: string; status: string }
  live_cop: boolean
}

const TLX_KEYS = ["mental", "physical", "temporal", "performance", "effort", "frustration"] as const

export function FusariumSurveyPanel() {
  const { role, persona, roles } = useFusariumRole()
  const [roleId, setRoleId] = useState(role?.role_id || "")
  const [instrument, setInstrument] = useState<"NASA-TLX" | "NIOSH-WellBQ-SCORES" | "REST_ERROR_INCIDENT">("NASA-TLX")
  const [scores, setScores] = useState<Record<string, number>>({
    mental: 50,
    physical: 50,
    temporal: 50,
    performance: 50,
    effort: 50,
    frustration: 50,
    overall: 50,
  })
  const [comments, setComments] = useState("")
  const [restHours, setRestHours] = useState("")
  const [errorEvents, setErrorEvents] = useState("")
  const [errorOpps, setErrorOpps] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (role?.role_id) setRoleId(role.role_id)
  }, [role?.role_id])

  async function submit() {
    setStatus("Saving…")
    const payload: Record<string, unknown> = {
      role_id: roleId,
      instrument,
      instrument_version:
        instrument === "NASA-TLX"
          ? "NASA-TLX raw unweighted (explicit modification)"
          : instrument === "NIOSH-WellBQ-SCORES"
            ? "NIOSH WellBQ domain scores entered after official scoring — item bank not reproduced"
            : "REST_ERROR_INCIDENT v1",
      comments,
      scores:
        instrument === "NASA-TLX"
          ? Object.fromEntries(TLX_KEYS.map((key) => [key, scores[key]]))
          : instrument === "NIOSH-WellBQ-SCORES"
            ? { overall: scores.overall }
            : {},
      rest_hours_observed: restHours === "" ? null : Number(restHours),
      error_events: errorEvents === "" ? null : Number(errorEvents),
      error_opportunities: errorOpps === "" ? null : Number(errorOpps),
    }
    const res = await fetch("/api/fusarium/personnel/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setStatus(res.ok ? `Saved survey ${data.survey?.id}` : data.error || "Save failed")
  }

  return (
    <section className="fusarium-personnel-panel" data-testid="fusarium-survey-panel">
      <h2>Personnel survey</h2>
      <p>
        Duty lens: {persona.title}. Responses store role_id, timestamp, instrument, and scores. Blank fields stay
        blank. Stress/error/fatality percentages are not computed from this form.
      </p>
      <label>
        Catalog role
        <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
          <option value="">Select a catalog role</option>
          {roles.map((item) => (
            <option key={item.role_id} value={item.role_id}>
              {item.service} {item.specialty_code} {item.role_title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Instrument
        <select value={instrument} onChange={(event) => setInstrument(event.target.value as typeof instrument)}>
          <option value="NASA-TLX">NASA-TLX workload</option>
          <option value="NIOSH-WellBQ-SCORES">NIOSH WellBQ scored domains</option>
          <option value="REST_ERROR_INCIDENT">Rest / error / incident items</option>
        </select>
      </label>
      {instrument === "NASA-TLX" &&
        TLX_KEYS.map((key) => (
          <label key={key}>
            {key} (0–100)
            <input
              type="range"
              min={0}
              max={100}
              value={scores[key]}
              onChange={(event) => setScores((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
            />
            <span>{scores[key]}</span>
          </label>
        ))}
      {instrument === "NIOSH-WellBQ-SCORES" && (
        <label>
          Official domain/overall score already computed outside this app
          <input
            type="number"
            min={0}
            max={100}
            value={scores.overall}
            onChange={(event) => setScores((prev) => ({ ...prev, overall: Number(event.target.value) }))}
          />
        </label>
      )}
      {instrument === "REST_ERROR_INCIDENT" && (
        <>
          <label>
            Observed rest hours
            <input value={restHours} onChange={(event) => setRestHours(event.target.value)} inputMode="decimal" />
          </label>
          <label>
            Adjudicated error events
            <input value={errorEvents} onChange={(event) => setErrorEvents(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            Error opportunities
            <input value={errorOpps} onChange={(event) => setErrorOpps(event.target.value)} inputMode="numeric" />
          </label>
        </>
      )}
      <label>
        Comments
        <textarea value={comments} onChange={(event) => setComments(event.target.value)} rows={3} />
      </label>
      <button type="button" onClick={() => void submit()} disabled={!roleId}>
        Submit survey
      </button>
      <p>{status}</p>
    </section>
  )
}

export function FusariumOutcomesPanel() {
  const { role } = useFusariumRole()
  const [payload, setPayload] = useState<OutcomesPayload | null>(null)
  const query = useMemo(() => (role?.role_id ? `?role_id=${encodeURIComponent(role.role_id)}` : ""), [role?.role_id])

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/fusarium/personnel/outcomes${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPayload(data as OutcomesPayload)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [query])

  if (!payload) {
    return <p>Loading outcomes…</p>
  }

  return (
    <section className="fusarium-personnel-panel" data-testid="fusarium-outcomes-panel">
      <h2>KO / command decision support</h2>
      <p>Not a live COP. Not a CMMC-compliant claim. Package calculation checks passed: {payload.package_calc_checks_passed} (fixtures only).</p>
      <p>{payload.in_boundary_cui.copy}</p>
      <div className="fusarium-outcome-tiles">
        {Object.entries(payload.tiles).map(([key, tile]) => (
          <article key={key} data-source={tile.source_class}>
            <h3>{key.replaceAll("_", " ")}</h3>
            <p className="fusarium-not-measured">{tile.display}</p>
            {tile.unit ? <p>{tile.unit}</p> : null}
            {tile.note ? <p>{tile.note}</p> : null}
          </article>
        ))}
      </div>
      <h3>Submitted surveys</h3>
      {payload.surveys.length === 0 ? (
        <p>No surveys yet. Empty until a real submit.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Role</th>
              <th>Instrument</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {payload.surveys.map((row) => (
              <tr key={row.id}>
                <td>{row.submitted_at}</td>
                <td>{row.role_id}</td>
                <td>{row.instrument}</td>
                <td>{row.comments || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>Inferred hypotheses</h3>
      {payload.inferences.length === 0 ? (
        <p>No inferred rows. Inference never fills fatality %.</p>
      ) : (
        <ul>
          {payload.inferences.map((row) => (
            <li key={row.id}>
              <strong>{row.source_class}</strong> — {row.hypothesis} ({row.uncertainty})
            </li>
          ))}
        </ul>
      )}
      <ul>
        {payload.honesty.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

export function FusariumCatalogBrowser() {
  const { roles, persona, setDuty } = useFusariumRole()
  const [service, setService] = useState("ALL")
  const [query, setQuery] = useState("")
  const filtered = roles.filter((item) => {
    if (service !== "ALL" && item.service !== service) return false
    const hay = `${item.role_title} ${item.specialty_code} ${item.role_id}`.toLowerCase()
    return hay.includes(query.toLowerCase())
  })
  const services = ["ALL", ...Array.from(new Set(roles.map((item) => item.service)))]

  return (
    <section className="fusarium-personnel-panel" data-testid="fusarium-catalog-browser">
      <h2>180 proposed user roles</h2>
      <p>
        Possible users, not required headcount. Provisional codes stay flagged. Current duty: {persona.title}. Loaded:{" "}
        {roles.length}.
      </p>
      <div className="fusarium-chip-row">
        {services.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={service === item}
            onClick={() => setService(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Service</th>
              <th>Code</th>
              <th>Persona</th>
              <th>Verification</th>
              <th>Outcomes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.role_id}>
                <td>{item.role_title}</td>
                <td>{item.service}</td>
                <td>{item.specialty_code || "—"}</td>
                <td>{item.persona_id}</td>
                <td>{item.specialty_verification}</td>
                <td>Not measured</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setDuty({ personaId: item.persona_id, roleId: item.role_id })}
                  >
                    Use duty
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
