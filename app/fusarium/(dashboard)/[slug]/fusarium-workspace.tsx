"use client"

import { useEffect, useState } from "react"
import {
  FxButton,
  FxLink,
  FxMeta,
  FxPageHead,
  FxPanel,
  FxTile,
  FxTiles,
} from "@/components/fusarium/fx"
import {
  SENSE_STATUS_LABEL,
  SIX_SENSES,
  senseFor,
} from "@/components/fusarium/fusarium-senses"
import {
  C2_SCAFFOLD,
  FUSION_MODALITIES,
  OEI_SCAFFOLD,
  PORTAL_SCAFFOLD,
  STACK_SCAFFOLD,
  type ScaffoldRow,
} from "@/components/fusarium/fusarium-scaffolds"

/** Slugs that are one of the six senses — they render the sense panel instead
 *  of the generic workspace note. */
const SENSE_SLUGS = new Set(SIX_SENSES.map((s) => s.href.replace("/fusarium/", "")))

/**
 * A console workspace.
 *
 * Everything shown is read from the Fusarium runtime — the platform catalog for
 * what this app is and what it binds to, and the operator state for the live
 * figures. Where a bind does not exist the panel says so in those words. It
 * never renders a plausible-looking zero, because on a defense console a zero
 * reads as a measurement.
 *
 * The Operations workspaces (situational awareness, threat assessment, data
 * fusion, command and control) get the panels the runtime SPA gave them; every
 * other app gets the same frame with its own binds.
 */

interface CatalogItem {
  id: string
  title: string
  path: string
  blurb?: string
  bindings?: string[]
}

interface Fusion {
  run_id?: string
  threat_score?: number
  classification?: string
  avani?: { action?: string }
}

interface OperatorState {
  classification?: string
  auth_mode?: string
  fusion?: Fusion | null
  nlm?: { deployed?: boolean }
  honest_gaps?: string[]
  partner_mesh?: { name: string; category: string }[]
  adapters?: Record<string, { configured?: boolean }>
}

interface DeviceRow {
  name?: string
  deviceType?: string
  type?: string
  status?: string
}

/** "Structure exists, nothing behind it" — stated per row, with what it needs. */
function Scaffold({ rows }: { rows: ScaffoldRow[] }) {
  return (
    <ul className="fx-list">
      {rows.map((r) => (
        <li key={r.label}>
          <strong>{r.label}</strong> — not bound. {r.needs}
        </li>
      ))}
    </ul>
  )
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="fx-empty">{empty}</p>
  return (
    <ul className="fx-list">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}

export function FusariumWorkspace({
  appId,
  title,
  section,
}: {
  appId: string
  title: string
  section: string
}) {
  const [item, setItem] = useState<CatalogItem | null>(null)
  const [state, setState] = useState<OperatorState | null>(null)
  const [devices, setDevices] = useState<DeviceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [catRes, stateRes] = await Promise.all([
          fetch("/api/fusarium/platform/catalog", { cache: "no-store" }),
          fetch("/api/fusarium/operator/state", { cache: "no-store" }),
        ])
        if (!catRes.ok || !stateRes.ok) {
          throw new Error(`runtime returned ${catRes.status}/${stateRes.status}`)
        }
        const cat = await catRes.json()
        const found = (cat.sections || [])
          .flatMap((s: { items: CatalogItem[] }) => s.items)
          .find((i: CatalogItem) => i.id === appId)
        const st = (await stateRes.json()) as OperatorState
        if (!alive) return
        setItem(found ?? null)
        setState(st)
        setError(null)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    }

    load()
    const id = setInterval(load, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [appId])

  // Devices back the sensor-network panels. A failure here is not fatal to the
  // page — the panel reports it and the rest of the workspace still renders.
  useEffect(() => {
    let alive = true
    fetch("/api/Devices", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (alive) setDevices(Array.isArray(d) ? d : d?.devices || d?.items || [])
      })
      .catch(() => {
        if (alive) setDevices([])
      })
    return () => {
      alive = false
    }
  }, [])

  const sense = senseFor(appId)
  const fusion = state?.fusion ?? null
  const deviceLines = (devices ?? []).map(
    (d) => `${d.name ?? "unnamed"} · ${d.deviceType ?? d.type ?? "unknown"} · ${d.status ?? "unknown"}`,
  )

  return (
    <div className="fx-page">
      <FxPageHead title={title} blurb={item?.blurb} binds={item?.bindings} />

      {error ? (
        <p className="fx-notice" role="status">
          Runtime unreachable — nothing on this page is estimated in its place.
          /api/fusarium said: {error}.
        </p>
      ) : null}

      <FxTiles>
        <FxTile
          label="Workspace"
          value={section.toLowerCase()}
          hint={item ? "Declared in the platform catalog." : "Not found in the catalog."}
        />
        <FxTile
          label="Live binds"
          value={item?.bindings?.length ? String(item.bindings.length) : "0"}
          hint={item?.bindings?.length ? item.bindings.join(" · ") : "No bind yet."}
        />
        <FxTile
          label="Classification"
          value={state?.classification ? String(state.classification) : error ? "—" : "…"}
        />
        <FxTile
          label="Auth mode"
          value={state?.auth_mode ? String(state.auth_mode) : error ? "—" : "…"}
        />
      </FxTiles>

      {appId === "situational-awareness" ? (
        <>
          <FxPanel title="Sensor network" actions={<FxLink href="/fusarium/devices">Device Network</FxLink>}>
            <List items={deviceLines} empty="No sensors registered. The COP stays empty." />
          </FxPanel>
          <FxPanel title="Alert queue" actions={<FxLink href="/fusarium/data-fusion">Data Fusion</FxLink>}>
            <List
              items={
                fusion
                  ? [`Fusion run ${fusion.run_id || "recorded"} · score ${fusion.threat_score ?? "—"}`]
                  : []
              }
              empty="No fusion alerts."
            />
          </FxPanel>
          <FxPanel title="Common operating picture">
            <p>
              The COP renderer is not bound on this host. Layers are listed by the catalog but
              nothing is drawn, rather than showing an empty map that reads as "no activity".
            </p>
            <FxLink href="/fusarium/earth-simulator">Open Earth Simulator</FxLink>
          </FxPanel>
        </>
      ) : null}

      {appId === "threat-assessment" ? (
        <>
          <FxPanel title="Threat board">
            {fusion ? (
              <FxMeta
                rows={[
                  ["Score", String(fusion.threat_score ?? "—"), "holds"],
                  ["AVANI", fusion.avani?.action || "idle"],
                  ["Classification", fusion.classification || "UNCLASSIFIED"],
                ]}
              />
            ) : (
              <p className="fx-empty">
                No assessments submitted. Ranked threats are not invented.
              </p>
            )}
          </FxPanel>
          <FxPanel title="AVANI gate">
            <p>
              pass / gate_for_human_review / veto. Ecological safety is required on products, and
              the gate holds by default — it is not a formality.
            </p>
            <FxLink href="/fusarium/avani">AVANI Guardian</FxLink>
          </FxPanel>
        </>
      ) : null}

      {appId === "data-fusion" ? (
        <FxPanel title={`MINDEX modalities — ${FUSION_MODALITIES.length} planned, 0 bound`}>
          <p>
            The namespaces below are the intended MINDEX addresses for each modality. None is
            bound, so none carries a record count. The design mock showed volumes and sync states;
            those were invented, and a fabricated storage figure on a fusion console is not a
            placeholder.
          </p>
          <ul className="fx-list">
            {FUSION_MODALITIES.map((m) => (
              <li key={m.id}>
                <strong>{m.label}</strong> — <code>{m.namespace}</code>
                {m.sense ? ` · ${m.sense} sense` : ""} · not bound
              </li>
            ))}
          </ul>
        </FxPanel>
      ) : null}

      {appId === "data-fusion" ? (
        <FxPanel
          title="Fusion runs"
          actions={<FxLink href="/fusarium/threat-assessment">Threat Assessment</FxLink>}
        >
          {fusion ? (
            <FxMeta
              rows={[
                ["Run", fusion.run_id || "recorded", "holds"],
                ["Threat score", String(fusion.threat_score ?? "—")],
                ["Classification", fusion.classification || "UNCLASSIFIED"],
              ]}
            />
          ) : (
            <p className="fx-empty">
              No fusion run recorded. Correlations are not generated to fill the panel.
            </p>
          )}
        </FxPanel>
      ) : null}

      {appId === "command-control" ? (
        <>
          <FxPanel title="Tasking">
            <p>
              No command path is bound on this host. Tasking is deliberately inert: a control
              surface that looks live but is not is worse than one that says it is not.
            </p>
          </FxPanel>
          <FxPanel title="What this node still needs">
            <Scaffold rows={C2_SCAFFOLD} />
          </FxPanel>
          <FxPanel title="Fleet" actions={<FxLink href="/fusarium/devices">Device Network</FxLink>}>
            <List items={deviceLines} empty="No devices registered." />
          </FxPanel>
        </>
      ) : null}

      {sense ? (
        <FxPanel
          title={`${sense.sense} sense — ${SENSE_STATUS_LABEL[sense.status].toLowerCase()}`}
          actions={<FxLink href="/fusarium/sensing">All six senses</FxLink>}
        >
          <FxMeta
            rows={[
              ["Sense", sense.sense],
              ["Tool", sense.tool ?? "not named yet", sense.tool ? "holds" : "unset"],
              ["Status", SENSE_STATUS_LABEL[sense.status], sense.status === "built" ? "holds" : "unset"],
            ]}
          />
          <p style={{ marginTop: "0.7rem" }}>{sense.scope}</p>
          {sense.gap ? <p className="fx-sense-gap">{sense.gap}</p> : null}
        </FxPanel>
      ) : null}

      {appId === "thermal" ? (
        <FxPanel title="What this tool has to do">
          <p>
            Nothing is implemented behind this route. It is scoped so the work is visible, not so
            the console looks complete.
          </p>
          <ul className="fx-list">
            <li>Radiometric capture — per-pixel calibrated temperature, not a false-colour image</li>
            <li>Emissivity and ambient correction, so readings are comparable between scenes</li>
            <li>Differential thermal: scene against baseline, and against its own history</li>
            <li>Time-series signatures — heating and cooling curves as the identifying feature</li>
            <li>A bind to real thermal hardware; until then this workspace stays empty</li>
          </ul>
        </FxPanel>
      ) : null}

      {appId === "mechanical" ? (
        <FxPanel title="What this tool has to do">
          <p>
            The largest of the two gaps: this is not only a sensor readout, it needs a training
            loop. Nothing is implemented behind this route.
          </p>
          <ul className="fx-list">
            <li>Tactile skin — contact, bump and collision detection across a body, not one point</li>
            <li>Pressure and force sensing, with magnitude and direction</li>
            <li>Proprioception — joint and limb state as its own sensed channel</li>
            <li>
              A simulation loop against NVIDIA GR00T policies in Omniverse, so physical interaction
              is trained rather than hand-tuned
            </li>
            <li>Sim-to-real transfer back onto the fleet, and a bind to real tactile hardware</li>
          </ul>
        </FxPanel>
      ) : null}

      {appId === "bluesight" ? (
        <FxPanel title="Scope gap">
          <p>
            BlueSight serves the spectral sense, but today it covers only the visible band. Spectral
            means the whole electromagnetic spectrum, and each band below is a distinct pipeline —
            not a filter on the visual one.
          </p>
          <ul className="fx-list">
            <li>Radio — signal detection, direction finding, spectrum occupancy</li>
            <li>Radar — active ranging, doppler, synthetic aperture</li>
            <li>Lidar — point cloud, ranging, structure</li>
            <li>Infrared — near and short-wave IR, distinct from the thermal sense</li>
            <li>Visible — what BlueSight does today</li>
            <li>Ultraviolet, X-ray and gamma — emission and radiation detection</li>
          </ul>
        </FxPanel>
      ) : null}

      {appId === "oei" ? (
        <FxPanel title="What the narrative surface needs">
          <p>
            The design shows generated prose over live mycorrhizae channels, with a MINDEX context
            panel and an AVANI gate. Every part of that is unbuilt; the prose in the mock was
            written by the mock.
          </p>
          <Scaffold rows={OEI_SCAFFOLD} />
        </FxPanel>
      ) : null}

      {appId === "stack" ? (
        <FxPanel title="What the inventory needs">
          <p>
            Edge device registry and model readiness. The mock showed batteries, attestation states
            and readiness percentages for named models — none of those figures existed.
          </p>
          <Scaffold rows={STACK_SCAFFOLD} />
        </FxPanel>
      ) : null}

      {appId === "settings" ? (
        <FxPanel title="Access and identity">
          <p>
            The console is gated on an email allowlist enforced in middleware. CAC/PIV is the
            intended credential and is not integrated.
          </p>
          <Scaffold rows={PORTAL_SCAFFOLD} />
        </FxPanel>
      ) : null}

      {!SENSE_SLUGS.has(appId) &&
      ![
        "situational-awareness",
        "threat-assessment",
        "data-fusion",
        "command-control",
        "oei",
        "stack",
        "settings",
      ].includes(appId) ? (
        <FxPanel title="Workspace">
          <p>
            {item?.bindings?.length
              ? "This workspace is bound to the runtime. Its surfaces render from those binds only."
              : "This workspace has no runtime bind yet, so it renders nothing rather than showing seeded content."}
          </p>
          <FxLink href="/fusarium">Back to Overview</FxLink>
        </FxPanel>
      ) : null}

      {state?.honest_gaps && state.honest_gaps.length > 0 ? (
        <FxPanel title="Declared gaps">
          <List items={state.honest_gaps} empty="None declared." />
        </FxPanel>
      ) : null}
    </div>
  )
}
