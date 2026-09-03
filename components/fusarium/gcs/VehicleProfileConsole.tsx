"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bot,
  Camera,
  Cpu,
  Hand,
  LayoutDashboard,
  LockKeyhole,
  Monitor,
  Moon,
  Plane,
  Route,
  ShieldCheck,
  Sun,
} from "lucide-react"
import {
  GLOBAL_CONTROL_DEVICE_PROFILES,
  globalControlProfile,
  globalControlViewLabel,
  type GlobalControlView,
} from "@/lib/fusarium/gcs/device-profiles"
import { useDisplayMode } from "@/lib/fusarium/gcs/useDisplayMode"
import { CenterViewport } from "./VehicleCenterViewport"
import { NavPropulsionPanel } from "./panels/VehicleControlPanel"
import { RightPanel } from "./panels/VehicleRightPanel"
import { StatusBar } from "./panels/VehicleStatusBar"
import { BottomSheet, StatLED } from "./ui"

const VIEWS: readonly GlobalControlView[] = ["overview", "mission", "payload", "systems"]
const VIEW_ICON: Record<GlobalControlView, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  mission: Route,
  payload: Camera,
  systems: Cpu,
}

/**
 * Fusarium's Global Control System is a segregated derivative surface. It deliberately does not
 * mount the Psathyrella telemetry, simulation, command, or maritime-control hooks. Until a verified
 * Agaric or Mushroom 1 adapter and operator authority are bound, every command surface is disabled.
 */
export function VehicleProfileConsole({
  profileId,
  onProfileChange,
}: {
  profileId: "agaric" | "mushroom-1"
  onProfileChange: (profileId: "psathyrella" | "agaric" | "mushroom-1") => void
}) {
  const [view, setView] = useState<GlobalControlView>("overview")
  const [sheet, setSheet] = useState<"controls" | "systems" | null>(null)
  const display = useDisplayMode()
  const profile = globalControlProfile(profileId)
  const VehicleIcon = profile.kind === "flying" ? Plane : Bot

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previous = { html: html.style.overflow, body: body.style.overflow }
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = previous.html
      body.style.overflow = previous.body
    }
  }, [])

  return (
    <div data-gcs-profile={profile.id} className={`psa-console dark [color-scheme:dark] fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#04070e] font-sans text-slate-200 ${display.rootClass}`}>
      <div className="z-[72] grid shrink-0 grid-cols-2 border-b border-amber-400/25 bg-amber-400/5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100 sm:grid-cols-4">
        <TruthCell icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Command authority" value="None" />
        <TruthCell icon={<StatLED color="slate" />} label="Vehicle adapter" value="Unbound" />
        <TruthCell icon={<StatLED color="slate" />} label="Telemetry" value="Not connected" />
        <TruthCell icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Vehicle state" value="Unverified · commands locked" />
      </div>

      <header className="psa-glass-strong z-[70] flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 lg:flex-nowrap lg:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <VehicleIcon className="h-5 w-5 shrink-0 text-cyan-300" />
          <div className="min-w-0">
            <div className="truncate text-sm font-black uppercase tracking-[0.16em] text-white">Global Control System</div>
            <div className="truncate text-[9px] uppercase tracking-[0.12em] text-slate-500">Fusarium vehicle operations · segregated from Psathyrella</div>
          </div>
          <label className="ml-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500">
            <span className="hidden sm:inline">Vehicle</span>
            <select
              value={profile.id}
              onChange={(event) => {
                onProfileChange(event.target.value as "psathyrella" | "agaric" | "mushroom-1")
                setView("overview")
              }}
              className="rounded border border-white/10 bg-black/60 px-2 py-1.5 text-[10px] font-bold text-cyan-100"
              aria-label="Global Control System vehicle profile"
            >
              {GLOBAL_CONTROL_DEVICE_PROFILES.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.displayName} · {candidate.vehicleLabel}</option>
              ))}
            </select>
          </label>
        </div>

        <nav className="order-3 flex min-w-0 basis-full items-center justify-center gap-1 overflow-x-auto lg:order-none lg:basis-auto" aria-label={`${profile.displayName} control views`}>
          {VIEWS.map((candidate) => {
            const Icon = VIEW_ICON[candidate]
            const active = view === candidate
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => setView(candidate)}
                aria-pressed={active}
                className={`psa-glass-btn flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
                  active
                    ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100"
                    : "border-white/10 text-slate-400 hover:border-cyan-500/35 hover:text-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {globalControlViewLabel(profile, candidate)}
              </button>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setSheet("controls")}
            className="psa-glass-btn rounded-md border border-white/10 px-2 py-1.5 text-[9px] font-bold uppercase text-slate-300 md:hidden"
          >
            Controls
          </button>
          <button
            type="button"
            onClick={() => setSheet("systems")}
            className="psa-glass-btn rounded-md border border-white/10 px-2 py-1.5 text-[9px] font-bold uppercase text-slate-300 md:hidden"
          >
            Systems
          </button>
          <button
            type="button"
            onClick={display.cycleTheme}
            className={`psa-glass-btn rounded-md border p-1.5 ${display.theme !== "standard" ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-slate-400"}`}
            title={`Display: ${display.theme}`}
            aria-label={`Display theme: ${display.theme}. Change theme.`}
          >
            {display.theme === "night" ? <Moon className="h-3.5 w-3.5" /> : display.theme === "day" ? <Sun className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={display.toggleField}
            className={`psa-glass-btn rounded-md border p-1.5 ${display.field ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-slate-400"}`}
            title="Toggle glove mode"
            aria-pressed={display.field}
          >
            <Hand className="h-3.5 w-3.5" />
          </button>
          <Link
            href="/fusarium"
            className="psa-glass-btn flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-cyan-500/40 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Fusarium
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 p-2 md:block xl:w-72">
          <NavPropulsionPanel profile={profile} />
        </aside>

        <main className="relative min-w-0 flex-1 p-2">
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-cyan-500/15">
            <CenterViewport profile={profile} view={view} />
          </div>
        </main>

        <aside className="hidden w-60 shrink-0 p-2 md:block xl:w-72">
          <RightPanel profile={profile} />
        </aside>
      </div>

      <StatusBar profile={profile} />

      <BottomSheet open={sheet === "controls"} onClose={() => setSheet(null)} title={`${profile.operationLabel} controls`} icon={<VehicleIcon className="h-4 w-4" />}>
        <NavPropulsionPanel profile={profile} />
      </BottomSheet>
      <BottomSheet open={sheet === "systems"} onClose={() => setSheet(null)} title={`${profile.displayName} systems`} icon={<Cpu className="h-4 w-4" />}>
        <RightPanel profile={profile} />
      </BottomSheet>
    </div>
  )
}

function TruthCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-amber-400/15 px-3 py-1.5">
      <span className="shrink-0 text-amber-300">{icon}</span>
      <span className="min-w-0 truncate"><span className="text-amber-100/55">{label}</span> · {value}</span>
    </div>
  )
}

export default VehicleProfileConsole
