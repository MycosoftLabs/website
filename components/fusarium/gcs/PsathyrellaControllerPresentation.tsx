"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import {
  Anchor,
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
  Waves,
} from "lucide-react"
import {
  GLOBAL_CONTROL_DEVICE_PROFILES,
  globalControlProfile,
} from "@/lib/fusarium/gcs/device-profiles"

export const PSATHYRELLA_CONTROLLER_PATH = "/natureos/psathyrella" as const

/**
 * A passive Fusarium presentation surface for Psathyrella.
 *
 * This component intentionally does not import the protected console, telemetry hooks, command
 * hooks, or any `/api/fusarium/gcs/*` adapter. The plain relative anchor is not prefetched: the
 * protected controller is contacted only after an owner deliberately follows the link, and its
 * own route/API authorization and safety boundaries remain authoritative.
 */
export function PsathyrellaControllerPresentation({
  onProfileChange,
}: {
  onProfileChange: (profileId: "psathyrella" | "agaric" | "mushroom-1") => void
}) {
  const profile = globalControlProfile("psathyrella")

  return (
    <div
      className="psa-console dark fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#04070e] font-sans text-slate-200 [color-scheme:dark]"
      data-gcs-surface="presentation-only"
      data-gcs-profile="psathyrella"
    >
      <div className="z-[72] grid shrink-0 grid-cols-2 border-b border-cyan-400/20 bg-cyan-400/5 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-100 sm:grid-cols-4">
        <TruthCell icon={<Anchor className="h-3.5 w-3.5" />} label="Fusarium role" value="Presentation only" />
        <TruthCell icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Dedicated controller" value="Owner gated" />
        <TruthCell icon={<RadioTower className="h-3.5 w-3.5" />} label="Fusarium adapter" value="Unbound" />
        <TruthCell icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Actuation" value="Not invoked here" />
      </div>

      <header className="psa-glass-strong z-[70] flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 lg:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Waves className="h-5 w-5 shrink-0 text-cyan-300" />
          <div className="min-w-0">
            <div className="truncate text-sm font-black uppercase tracking-[0.16em] text-white">Global Control System</div>
            <div className="truncate text-[9px] uppercase tracking-[0.12em] text-slate-500">Fusarium vehicle presentation · controller isolation preserved</div>
          </div>
          <label className="ml-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500">
            <span className="hidden sm:inline">Vehicle</span>
            <select
              value={profile.id}
              onChange={(event) => onProfileChange(event.target.value as "psathyrella" | "agaric" | "mushroom-1")}
              className="rounded border border-white/10 bg-black/60 px-2 py-1.5 text-[10px] font-bold text-cyan-100"
              aria-label="Global Control System vehicle profile"
            >
              {GLOBAL_CONTROL_DEVICE_PROFILES.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.displayName} · {candidate.vehicleLabel}</option>
              ))}
            </select>
          </label>
        </div>

        <Link
          href="/fusarium"
          className="psa-glass-btn flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-cyan-500/40 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Fusarium
        </Link>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto grid min-h-full max-w-6xl content-center gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="psa-glass-strong rounded-2xl border border-cyan-400/20 p-5 sm:p-7" aria-labelledby="psathyrella-presentation-title">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Protected controller handoff</p>
            <h1 id="psathyrella-presentation-title" className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl">
              Psathyrella
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.12em] text-slate-400">{profile.vehicleLabel} · {profile.operationLabel} profile</p>
            <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-300">
              Fusarium presents this vehicle profile without loading telemetry or mounting a second control station.
              The existing Psathyrella controller remains the only device-specific control surface and retains its
              own owner gate, command lifecycle, interlocks, and evidence boundaries.
            </p>

            <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100">
              <strong className="block text-xs uppercase tracking-[0.16em]">Presentation is not actuation</strong>
              <span className="mt-2 block leading-6 text-amber-100/75">
                Opening the protected controller is navigation only. It does not connect a vehicle, submit a command,
                acknowledge execution, or prove that Psathyrella is available.
              </span>
            </div>

            <a
              href={PSATHYRELLA_CONTROLLER_PATH}
              target="_blank"
              rel="noopener noreferrer"
              data-gcs-action="navigate-to-protected-controller"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/15 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              Open protected Psathyrella controller <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="mt-2 text-xs text-slate-500">Same-origin owner-gated route · opens in a new tab · no prefetch</p>
          </section>

          <aside className="grid gap-4" aria-label="Psathyrella presentation truth">
            <InfoPanel title="Declared profile — not live evidence">
              <List items={profile.capabilities} />
            </InfoPanel>
            <InfoPanel title="Fusarium adapter boundary">
              <dl className="grid gap-3 text-xs">
                <Definition label="Presentation" value="Available" />
                <Definition label="Telemetry in Fusarium" value="Unbound" />
                <Definition label="Commands in Fusarium" value="Unbound" />
                <Definition label="Device connection" value="Not probed" />
                <Definition label="Physical execution" value="Not asserted" />
              </dl>
            </InfoPanel>
            <InfoPanel title="Other vehicle profiles">
              <p className="text-xs leading-5 text-slate-400">
                Agaric and Mushroom 1 remain selectable presentation profiles with their own vehicle-specific layouts.
                Both adapters and every command control remain visibly unbound.
              </p>
            </InfoPanel>
          </aside>
        </div>
      </main>
    </div>
  )
}

function TruthCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-cyan-400/15 px-3 py-1.5">
      <span className="shrink-0 text-cyan-300">{icon}</span>
      <span className="min-w-0 truncate"><span className="text-cyan-100/55">{label}</span> · {value}</span>
    </div>
  )
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="psa-glass rounded-xl border border-white/10 p-4">
      <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-1">
      {items.map((item) => (
        <li key={item} className="flex gap-2"><span className="text-cyan-400" aria-hidden="true">·</span><span>{item}</span></li>
      ))}
    </ul>
  )
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-bold uppercase tracking-wide text-slate-200">{value}</dd>
    </div>
  )
}

export default PsathyrellaControllerPresentation
