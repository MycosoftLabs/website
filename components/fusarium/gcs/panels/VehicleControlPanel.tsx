"use client"

import { Bot, Gauge, LockKeyhole, Plane, ShieldAlert, SlidersHorizontal } from "lucide-react"
import type { GlobalControlDeviceProfile } from "@/lib/fusarium/gcs/device-profiles"
import { Panel, SectionLabel, TacButton } from "@/components/fusarium/gcs/ui"

export function NavPropulsionPanel({ profile }: { profile: GlobalControlDeviceProfile }) {
  const VehicleIcon = profile.kind === "flying" ? Plane : Bot

  return (
    <Panel
      title={`${profile.operationLabel} controls`}
      icon={<VehicleIcon className="h-4 w-4" />}
      right={<span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-200">Locked</span>}
      className="h-full"
      fit={false}
      bodyClassName="overflow-y-auto"
    >
      <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-2.5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-200">
          <LockKeyhole className="h-3.5 w-3.5" /> No command authority
        </div>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
          {profile.displayName} has no verified adapter or operator session. Controls are rendered for interface acceptance only and cannot transmit.
        </p>
      </div>

      <SectionLabel>{profile.operationLabel} mode</SectionLabel>
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {profile.modes.map((mode) => (
          <TacButton key={mode} disabled className="min-h-8 px-1 text-[9px]" title={`${mode} is unavailable until a verified adapter is bound`}>
            {mode}
          </TacButton>
        ))}
      </div>

      <SectionLabel>Manual axes · neutral</SectionLabel>
      <div className="mb-3 space-y-2.5 rounded-lg border border-white/10 bg-black/20 p-2.5">
        {profile.axes.map((axis) => (
          <label key={axis.label} className="block">
            <span className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-slate-400">
              <span>{axis.negative}</span>
              <span className="font-bold text-cyan-200">{axis.label} · locked</span>
              <span>{axis.positive}</span>
            </span>
            <input
              type="range"
              min={-100}
              max={100}
              value={0}
              disabled
              readOnly
              aria-label={`${profile.displayName} ${axis.label} command locked`}
              className="w-full cursor-not-allowed accent-cyan-400 opacity-40"
            />
          </label>
        ))}
      </div>

      <SectionLabel>Vehicle safeguards</SectionLabel>
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <StateCard label="Adapter" value="Unbound" />
        <StateCard label="Authority" value="None" />
        <StateCard label="Arm state" value="Unverified" />
        <StateCard label="Deadman" value="Not bound" />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <TacButton disabled tone="go" title="Arm is unavailable without verified command authority">
          <Gauge className="h-3.5 w-3.5" /> Arm locked
        </TacButton>
        <TacButton disabled tone="danger" title="No command channel exists to receive a stop command">
          <ShieldAlert className="h-3.5 w-3.5" /> Stop unbound
        </TacButton>
      </div>

      <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] p-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300/80">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Intended capabilities
        </div>
        <ul className="mt-1.5 space-y-1 text-[9px] text-slate-400">
          {profile.capabilities.map((capability) => <li key={capability}>• {capability}</li>)}
        </ul>
      </div>
    </Panel>
  )
}

function StateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] px-2 py-1.5">
      <div className="text-[8px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase text-amber-200/85">{value}</div>
    </div>
  )
}
