"use client"

import type { ReactNode } from "react"
import { BatteryCharging, Bot, Compass, Link2Off, LockKeyhole, MapPin, Plane, Radio } from "lucide-react"
import type { GlobalControlDeviceProfile } from "@/lib/fusarium/gcs/device-profiles"
import { Readout, StatLED } from "@/components/fusarium/gcs/ui"

function Group({ children }: { children: ReactNode }) {
  return <div className="flex min-h-14 items-center gap-3 border-r border-white/5 px-3">{children}</div>
}

export function StatusBar({ profile }: { profile: GlobalControlDeviceProfile }) {
  const VehicleIcon = profile.kind === "flying" ? Plane : Bot
  return (
    <div className="psa-glass-strong flex min-h-14 shrink-0 flex-wrap items-stretch justify-center overflow-hidden text-slate-200">
      <Group>
        <VehicleIcon className={`h-4 w-4 ${profile.kind === "flying" ? "text-violet-300" : "text-amber-300"}`} />
        <div>
          <div className="text-[8px] uppercase tracking-wide text-slate-500">{profile.vehicleLabel}</div>
          <div className="text-[11px] font-black uppercase tracking-wide text-white">{profile.displayName}</div>
        </div>
        <StatLED color="slate" />
      </Group>

      <Group>
        <MapPin className="h-4 w-4 text-slate-600" />
        <Readout label="Latitude" value={null} />
        <Readout label="Longitude" value={null} />
        <span className="text-[8px] font-bold uppercase text-slate-600">No position source</span>
      </Group>

      <Group>
        <Compass className="h-4 w-4 text-slate-600" />
        {profile.statusFields.slice(0, 2).map((field) => <Readout key={field.label} label={field.label} value={null} unit={field.unit} />)}
      </Group>

      <Group>
        <BatteryCharging className="h-4 w-4 text-slate-600" />
        <Readout label="Battery" value={null} unit="%" />
        <Radio className="h-4 w-4 text-slate-600" />
        <Readout label="Link" value={null} />
      </Group>

      <div className="flex min-h-14 items-center gap-2 px-3">
        <span className="flex items-center gap-1.5 rounded border border-slate-500/20 bg-slate-500/[0.05] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500"><Link2Off className="h-3.5 w-3.5" /> Adapter unbound</span>
        <span className="flex items-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-200"><LockKeyhole className="h-3.5 w-3.5" /> Commands locked</span>
      </div>
    </div>
  )
}
