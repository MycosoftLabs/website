"use client"

import { useState, type ReactNode } from "react"
import { CircleDashed, FileClock, LockKeyhole, Radio, Route, Satellite, ShieldCheck } from "lucide-react"
import type { GlobalControlDeviceProfile } from "@/lib/fusarium/gcs/device-profiles"
import { cn } from "@/lib/utils"
import { Panel, SectionLabel, StatLED } from "@/components/fusarium/gcs/ui"

const TABS = [
  { key: "adapter", label: "Adapter" },
  { key: "sensors", label: "Sensors" },
  { key: "mission", label: "Mission" },
  { key: "audit", label: "Audit" },
] as const
type Tab = (typeof TABS)[number]["key"]

export function RightPanel({ profile }: { profile: GlobalControlDeviceProfile }) {
  const [tab, setTab] = useState<Tab>("adapter")
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="psa-glass grid shrink-0 grid-cols-2 gap-1 rounded-lg p-1 xl:grid-cols-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "psa-glass-btn rounded-md border border-white/10 px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-wide",
              tab === key ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100" : "text-slate-500 hover:text-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "adapter" ? <AdapterPanel profile={profile} /> : null}
        {tab === "sensors" ? <SensorsPanel profile={profile} /> : null}
        {tab === "mission" ? <MissionPanel profile={profile} /> : null}
        {tab === "audit" ? <AuditPanel profile={profile} /> : null}
      </div>
    </div>
  )
}

function AdapterPanel({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <Panel title="Vehicle adapter" icon={<Radio className="h-4 w-4" />} className="h-full" fit={false} bodyClassName="overflow-y-auto">
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-200"><LockKeyhole className="h-3.5 w-3.5" /> Unbound by design</div>
        <p className="mt-1.5 text-[9px] leading-relaxed text-slate-400">No adapter has been verified for {profile.displayName}. No connection attempt is made from this page.</p>
      </div>
      <SectionLabel className="mt-3">Contract state</SectionLabel>
      <div className="space-y-1.5">
        <ContractRow label="Vehicle profile" value={`${profile.displayName} · ${profile.kind}`} tone="cyan" />
        <ContractRow label="Telemetry endpoint" value="Not configured" />
        <ContractRow label="Command endpoint" value="Not configured" />
        <ContractRow label="Command authority" value="None" />
        <ContractRow label="Simulation provider" value="Disabled" />
      </div>
      <SectionLabel className="mt-3">Required before binding</SectionLabel>
      <div className="space-y-1.5 text-[9px] text-slate-400">
        <Check label="Verified vehicle identity" />
        <Check label="Versioned telemetry schema" />
        <Check label="Explicit command authority" />
        <Check label="Deadman and limit contract" />
        <Check label="Acknowledgement and audit path" />
      </div>
    </Panel>
  )
}

function SensorsPanel({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <Panel title="Sensor interfaces" icon={<Satellite className="h-4 w-4" />} className="h-full" fit={false} bodyClassName="overflow-y-auto">
      <p className="mb-3 text-[9px] leading-relaxed text-slate-500">Expected interfaces from the {profile.displayName} product profile. Unbound does not mean absent or clear.</p>
      <div className="space-y-1.5">
        {profile.sensors.map((sensor) => (
          <div key={sensor} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <span className="text-[9px] font-semibold uppercase text-slate-300">{sensor}</span>
            <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-slate-600"><StatLED color="slate" /> Unbound</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-[8px] leading-relaxed text-slate-600">No sample values, timestamps, calibration state, or provenance records have been supplied.</div>
    </Panel>
  )
}

function MissionPanel({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <Panel title={`${profile.operationLabel} mission`} icon={<Route className="h-4 w-4" />} className="h-full" fit={false} bodyClassName="overflow-y-auto">
      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
        <Route className="mx-auto h-7 w-7 text-slate-600" />
        <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">No mission staged</div>
        <div className="mt-1 text-[8px] uppercase text-slate-600">Position and boundary sources unbound</div>
      </div>
      <SectionLabel className="mt-3">Release gates</SectionLabel>
      <div className="space-y-1.5">
        {profile.missionChecks.map((check) => <Check key={check} label={check} />)}
      </div>
      <button type="button" disabled className="mt-3 w-full cursor-not-allowed rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">Mission upload locked</button>
    </Panel>
  )
}

function AuditPanel({ profile }: { profile: GlobalControlDeviceProfile }) {
  return (
    <Panel title="Session audit" icon={<FileClock className="h-4 w-4" />} className="h-full" fit={false} bodyClassName="overflow-y-auto">
      <div className="space-y-2">
        <AuditEvent icon={<ShieldCheck className="h-3.5 w-3.5" />} title="Protected station isolated" detail="The Psathyrella test application remains outside this Fusarium profile." />
        <AuditEvent icon={<LockKeyhole className="h-3.5 w-3.5" />} title="Commands locked" detail="No command authority, endpoint, or local simulation is mounted." />
        <AuditEvent icon={<Radio className="h-3.5 w-3.5" />} title="No connection attempts" detail={`No ${profile.displayName} telemetry or command request has been issued.`} />
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] p-2.5 text-[8px] leading-relaxed text-slate-500">A future command ledger must record intent, authorization, transport, acknowledgement, application, and expiry as separate states.</div>
    </Panel>
  )
}

function ContractRow({ label, value, tone = "amber" }: { label: string; value: string; tone?: "amber" | "cyan" }) {
  return <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-2"><span className="text-[8px] uppercase tracking-wide text-slate-500">{label}</span><span className={`text-right text-[9px] font-bold uppercase ${tone === "cyan" ? "text-cyan-200" : "text-amber-200/80"}`}>{value}</span></div>
}

function Check({ label }: { label: string }) {
  return <div className="flex items-start gap-1.5 rounded-md border border-white/10 bg-black/15 px-2.5 py-2"><CircleDashed className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" /><span className="text-[9px] uppercase text-slate-400">{label}</span><span className="ml-auto shrink-0 text-[8px] font-bold uppercase text-slate-600">Not verified</span></div>
}

function AuditEvent({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="rounded-lg border border-white/10 bg-black/20 p-2.5"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-300"><span className="text-cyan-300">{icon}</span>{title}</div><p className="mt-1 text-[8px] leading-relaxed text-slate-600">{detail}</p></div>
}
