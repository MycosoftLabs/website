"use client";

import { Sun, BatteryCharging, Gauge, MapPin, Compass, Thermometer, Wind, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AckState } from "@/lib/psathyrella/useBuoyTelemetry";
import { type BuoyTelemetry } from "@/lib/psathyrella/contract";
import { Readout, Bar, StatLED } from "@/components/psathyrella/ui";

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 border-r border-white/5 px-3">{children}</div>;
}

export function StatusBar({ telemetry, ack }: { telemetry: BuoyTelemetry; ack: AckState | null }) {
  const { power, pose, bme } = telemetry;
  const socFrac = power.batterySocPct != null ? power.batterySocPct / 100 : null;
  const sumCurrent = telemetry.propulsion.thrusters.reduce((a, t) => a + (t.currentA ?? 0), 0);
  const a = bme.a;

  return (
    <div className="flex min-h-16 shrink-0 flex-wrap items-stretch overflow-hidden bg-[#0a0f1e]/95 text-slate-200">
      {/* Solar */}
      <Group>
        <Sun className={`h-4 w-4 ${power.sunRepositionSuggested ? "text-amber-300" : "text-slate-400"}`} />
        <Readout label="Solar in" value={power.solarInputW != null ? Math.round(power.solarInputW) : null} unit="W" status={power.sunRepositionSuggested ? "warn" : "ok"} />
        {power.sunRepositionSuggested && <span className="text-[9px] uppercase text-amber-300">reposition</span>}
      </Group>

      {/* Battery */}
      <Group>
        <BatteryCharging className="h-4 w-4 text-green-300" />
        <div className="w-24">
          <div className="flex justify-between text-[9px] uppercase text-slate-500"><span>Battery</span><span className="font-mono text-slate-300">{power.batterySocPct != null ? `${Math.round(power.batterySocPct)}%` : "—"}</span></div>
          <Bar value={socFrac} color={socFrac != null && socFrac < 0.2 ? "red" : "green"} />
        </div>
        <Readout label="Load" value={power.loadW != null ? Math.round(power.loadW) : null} unit="W" />
      </Group>

      {/* Position */}
      <Group>
        <MapPin className="h-4 w-4 text-cyan-300" />
        <Readout label="Lat" value={pose.lat != null ? pose.lat.toFixed(5) : null} />
        <Readout label="Lon" value={pose.lon != null ? pose.lon.toFixed(5) : null} />
        <div className="flex items-center gap-1">
          <StatLED color={pose.gpsLock === "locked" ? "green" : pose.gpsLock === "site" ? "cyan" : pose.gpsLock === "drift" ? "amber" : "slate"} />
          <span className="text-[9px] uppercase text-slate-500">{pose.gpsLock}</span>
        </div>
      </Group>

      {/* Motion */}
      <Group>
        <Compass className="h-4 w-4 text-cyan-300" />
        <Readout label="Hdg" value={pose.headingDeg != null ? Math.round(pose.headingDeg) : null} unit="°" />
        <Readout label="Depth" value={pose.depthM != null ? pose.depthM.toFixed(1) : null} unit="m" />
        <Readout label="Thr I" value={sumCurrent > 0 ? sumCurrent.toFixed(1) : null} unit="A" />
      </Group>

      {/* Live BME688 (real today) */}
      <Group>
        <Thermometer className="h-4 w-4 text-rose-300" />
        <Readout label="Air T" value={a?.temperature != null ? a.temperature.toFixed(1) : null} unit="°C" />
        <Readout label="RH" value={a?.humidity != null ? Math.round(a.humidity) : null} unit="%" />
        <Readout label="IAQ" value={a?.iaq != null ? Math.round(a.iaq) : null} />
        <Wind className="h-3.5 w-3.5 text-slate-500" />
        <Readout label="Pres" value={a?.pressure != null ? Math.round(a.pressure) : null} unit="hPa" />
      </Group>

      {/* Mode + ack */}
      <div className="flex flex-1 items-center justify-end gap-3 px-3">
        {ack && (
          <div className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] ${ack.ok ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
            {ack.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            <span className="font-medium">{ack.label}</span>
            <span className="opacity-70">{ack.ok ? (ack.detail === "sim" ? "· sim" : "· sent") : `· ${ack.detail ?? "failed"}`}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-cyan-300" />
          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-200">{telemetry.autonomy.mode.replace("_", " ")}</span>
        </div>
      </div>
    </div>
  );
}
