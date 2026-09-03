"use client"

import type { ReactNode } from "react"
import {
  Bot,
  Camera,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Database,
  LockKeyhole,
  MapPinned,
  Plane,
  Radio,
  Route,
  Satellite,
  ShieldAlert,
} from "lucide-react"
import {
  globalControlViewLabel,
  type GlobalControlDeviceProfile,
  type GlobalControlView,
} from "@/lib/fusarium/gcs/device-profiles"
import { Readout, StatLED, ViewBadge } from "@/components/fusarium/gcs/ui"

export function CenterViewport({ profile, view }: { profile: GlobalControlDeviceProfile; view: GlobalControlView }) {
  return (
    <div
      className="relative h-full w-full overflow-auto bg-[#050912]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(34,211,238,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.055) 1px, transparent 1px), radial-gradient(circle at 50% 45%, rgba(8,145,178,.14), transparent 48%)",
        backgroundSize: "36px 36px, 36px 36px, 100% 100%",
      }}
    >
      <ViewBadge>{profile.displayName} · {globalControlViewLabel(profile, view)}</ViewBadge>
      {view === "overview" ? <Overview profile={profile} /> : null}
      {view === "mission" ? <Mission profile={profile} /> : null}
      {view === "payload" ? <Payload profile={profile} /> : null}
      {view === "systems" ? <Systems profile={profile} /> : null}
    </div>
  )
}

function Overview({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <div className="flex min-h-full flex-col px-4 pb-4 pt-14 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative flex min-h-[22rem] items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/15 bg-black/25">
          <div className="absolute left-4 top-4 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/55">Vehicle digital twin · no live pose</div>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/[0.07] px-2 py-1 text-[9px] font-bold uppercase text-amber-200">
            <CircleDashed className="h-3.5 w-3.5" /> Adapter unbound
          </div>
          <VehicleSchematic profile={profile} />
          <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {profile.statusFields.map((field) => (
              <div key={field.label} className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
                <Readout label={field.label} value={null} unit={field.unit} />
                <div className="mt-1 text-[8px] uppercase tracking-wide text-slate-600">No source</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <section className="psa-glass rounded-xl border border-cyan-500/15 p-4">
            <div className="flex items-start gap-3">
              {profile.kind === "flying" ? <Plane className="mt-0.5 h-6 w-6 text-violet-300" /> : <Bot className="mt-0.5 h-6 w-6 text-amber-300" />}
              <div>
                <h1 className="text-lg font-black uppercase tracking-[0.16em] text-white">{profile.displayName}</h1>
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/70">{profile.vehicleLabel}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <State label="Telemetry" value="Not connected" />
              <State label="Commands" value="Locked" />
              <State label="Authority" value="None" />
              <State label="Simulation" value="Disabled" />
            </div>
          </section>

          <section className="psa-glass rounded-xl border border-white/10 p-4">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300/65">Profile capability model</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.capabilities.map((capability) => (
                <span key={capability} className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-2 py-1 text-[9px] uppercase text-slate-300">{capability}</span>
              ))}
            </div>
            <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Capabilities describe the planned adapter contract. They are not evidence that a device or subsystem is online.</p>
          </section>
        </div>
      </div>
    </div>
  )
}

function Mission({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-4 pt-14 sm:px-6">
      <div className="grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="relative min-h-[28rem] overflow-hidden rounded-2xl border border-cyan-500/15 bg-black/30">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(34,211,238,.3) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <MapPinned className="h-12 w-12 text-slate-600" />
            <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">No verified vehicle position</div>
            <p className="max-w-md text-[10px] leading-relaxed text-slate-500">The {profile.operationLabel.toLowerCase()} plan canvas remains empty until the {profile.displayName} adapter supplies a sourced position and mission boundary.</p>
            <button type="button" disabled className="mt-2 cursor-not-allowed rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <Route className="mr-1.5 inline h-3.5 w-3.5" /> Add mission point · locked
            </button>
          </div>
        </section>
        <section className="psa-glass rounded-2xl border border-white/10 p-4">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">{profile.operationLabel} release checks</h2>
          <div className="mt-4 space-y-2">
            {profile.missionChecks.map((check) => (
              <div key={check} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
                <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                <div><div className="text-[9px] font-bold uppercase text-slate-300">{check}</div><div className="mt-0.5 text-[8px] uppercase text-slate-600">Not verified</div></div>
              </div>
            ))}
          </div>
          <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-md border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-300/45">
            Upload mission · command authority required
          </button>
        </section>
      </div>
    </div>
  )
}

function Payload({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-4 pt-14 sm:px-6">
      <div className="grid w-full max-w-6xl gap-4 md:grid-cols-2">
        <Inventory title="Sensor interfaces" icon={<Satellite className="h-4 w-4" />} rows={profile.sensors} />
        <Inventory title="Payload roles" icon={<Camera className="h-4 w-4" />} rows={profile.payloads} />
        <section className="psa-glass rounded-2xl border border-white/10 p-4 md:col-span-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200"><ShieldAlert className="h-4 w-4" /> Payload truth boundary</div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">No payload stream, device identifier, calibration record, or provenance record has been received. Every interface remains unbound; the empty panels do not assert that the environment is clear.</p>
        </section>
      </div>
    </div>
  )
}

function Systems({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-4 pt-14 sm:px-6">
      <div className="w-full max-w-6xl">
        <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Boundary icon={<Database className="h-5 w-5" />} title="Telemetry adapter" detail="Endpoint not configured" />
          <Flow />
          <Boundary icon={<Cpu className="h-5 w-5" />} title="Fusarium GCS" detail={`${profile.displayName} profile loaded`} active />
          <Flow />
          <Boundary icon={<Radio className="h-5 w-5" />} title="Command adapter" detail="Endpoint not configured" />
        </div>
        <section className="psa-glass mt-4 rounded-2xl border border-white/10 p-4">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">Adapter acceptance gates</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Gate label="Identity" detail="Vehicle identity and hardware revision" />
            <Gate label="Telemetry" detail="Schema, freshness, calibration, provenance" />
            <Gate label="Authority" detail="Operator role and command scope" />
            <Gate label="Safety" detail="Deadman, limits, acknowledgements, audit" />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/[0.05] p-3 text-[9px] uppercase tracking-wide text-green-200/80">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> The protected Psathyrella test station is not imported, addressed, or modified by this profile.
          </div>
        </section>
      </div>
    </div>
  )
}

function VehicleSchematic({ profile }: { profile: GlobalControlDeviceProfile }) {
  if (profile.kind === "flying") {
    return (
      <div className="relative mb-14 h-64 w-64 text-violet-300/90">
        <div className="absolute inset-8 rounded-full border border-dashed border-violet-400/20" />
        <div className="absolute inset-16 rounded-full border border-cyan-400/15" />
        <div className="absolute left-1/2 top-1/2 h-3 w-40 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-gradient-to-r from-violet-500/30 via-cyan-200/90 to-violet-500/30" />
        <div className="absolute left-1/2 top-1/2 h-3 w-40 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-gradient-to-r from-violet-500/30 via-cyan-200/90 to-violet-500/30" />
        {[[36,36],[164,36],[36,164],[164,164]].map(([left, top]) => <div key={`${left}-${top}`} className="absolute h-16 w-16 rounded-full border-2 border-violet-300/60 bg-violet-500/[0.06] shadow-[0_0_30px_rgba(167,139,250,.12)]" style={{ left, top }} />)}
        <div className="absolute left-1/2 top-1/2 flex h-16 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[45%] border border-cyan-300/60 bg-cyan-500/15 shadow-[0_0_40px_rgba(34,211,238,.2)]"><Plane className="h-8 w-8" /></div>
      </div>
    )
  }
  return (
    <div className="relative mb-14 h-64 w-64 text-amber-300/90">
      <div className="absolute inset-8 rounded-full border border-dashed border-amber-400/20" />
      <div className="absolute left-1/2 top-1/2 h-20 w-28 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-300/60 bg-cyan-500/15 shadow-[0_0_40px_rgba(34,211,238,.2)]" />
      {[[60,58,-28],[164,58,28],[60,154,28],[164,154,-28]].map(([left, top, rotate]) => (
        <div key={`${left}-${top}`} className="absolute h-24 w-3 origin-top rounded-full bg-gradient-to-b from-amber-200/80 to-amber-500/20" style={{ left, top, transform: `rotate(${rotate}deg)` }}><div className="absolute -bottom-2 -left-2 h-5 w-7 rounded-full border border-amber-300/50 bg-amber-500/10" /></div>
      ))}
      <div className="absolute left-1/2 top-1/2 flex h-20 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center"><Bot className="h-9 w-9" /></div>
    </div>
  )
}

function State({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2"><div className="text-[8px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase text-amber-200"><StatLED color="slate" />{value}</div></div>
}

function Inventory({ title, icon, rows }: { title: string; icon: ReactNode; rows: readonly string[] }) {
  return <section className="psa-glass rounded-2xl border border-white/10 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white"><span className="text-cyan-300">{icon}</span>{title}</div><div className="mt-4 grid gap-2 sm:grid-cols-2">{rows.map((row) => <div key={row} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5"><span className="text-[10px] font-semibold uppercase text-slate-300">{row}</span><span className="flex items-center gap-1 text-[8px] font-bold uppercase text-slate-600"><StatLED color="slate" />Unbound</span></div>)}</div></section>
}

function Boundary({ icon, title, detail, active = false }: { icon: ReactNode; title: string; detail: string; active?: boolean }) {
  return <div className={`flex min-h-36 flex-col items-center justify-center rounded-2xl border p-4 text-center ${active ? "border-cyan-500/30 bg-cyan-500/[0.07]" : "border-white/10 bg-black/25"}`}><span className={active ? "text-cyan-300" : "text-slate-600"}>{icon}</span><div className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white">{title}</div><div className={`mt-1 text-[9px] uppercase ${active ? "text-cyan-200/70" : "text-slate-600"}`}>{detail}</div></div>
}

function Flow() {
  return <div className="hidden items-center justify-center lg:flex"><div className="h-px w-10 border-t border-dashed border-slate-700" /><LockKeyhole className="mx-1 h-3.5 w-3.5 text-amber-400/70" /><div className="h-px w-10 border-t border-dashed border-slate-700" /></div>
}

function Gate({ label, detail }: { label: string; detail: string }) {
  return <div className="rounded-lg border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-300"><CircleDashed className="h-3.5 w-3.5 text-slate-600" />{label}</div><p className="mt-1.5 text-[8px] leading-relaxed text-slate-600">{detail}</p></div>
}
