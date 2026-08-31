"use client";

import { Sun, BatteryCharging, MapPin, Compass, Thermometer, Wind, Activity, AlertTriangle, CheckCircle2, Radio, Users, Anchor, Bot, Plane, Server, Cpu } from "lucide-react";
import type { AckState } from "@/lib/psathyrella/useBuoyTelemetry";
import { type BuoyTelemetry, type SelectedDevice, type DeviceCategory, CATEGORY_LABEL } from "@/lib/psathyrella/contract";
import { Readout, Bar, StatLED } from "@/components/psathyrella/ui";

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 border-r border-white/5 px-3">{children}</div>;
}

const CAT_ICON: Record<DeviceCategory, typeof Anchor> = { aquatic: Anchor, land: Bot, flying: Plane, edge: Server, other: Cpu };
const CAT_COLOR: Record<DeviceCategory, string> = { aquatic: "text-cyan-300", land: "text-amber-300", flying: "text-violet-300", edge: "text-emerald-300", other: "text-slate-300" };
const rssiFrac = (r: number | null) => (r == null ? null : Math.max(0, Math.min(1, (r + 100) / 60)));

/**
 * Centered, selection-driven status strip. `focus` is whatever device is selected
 * (a map click or a Devices/Nodes pick) — defaults to the primary buoy. When the buoy
 * is in focus it renders full live telemetry; any other droid renders the fields the
 * registry actually reports (no faking — "—" / standby where a feed is absent).
 */
export function StatusBar({ focus, telemetry, ack }: { focus: SelectedDevice; telemetry: BuoyTelemetry; ack: AckState | null }) {
  const Icon = CAT_ICON[focus.category];

  // Focus chip — WHAT is selected (dynamic per buoy/device).
  const focusChip = (
    <Group>
      <Icon className={`h-4 w-4 shrink-0 ${CAT_COLOR[focus.category]}`} />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[focus.category]}</div>
        <div className="max-w-[11rem] truncate text-[12px] font-bold text-white">{focus.name}</div>
      </div>
      <StatLED color={focus.online ? "green" : "slate"} pulse={focus.online && focus.isBuoy} />
    </Group>
  );

  if (focus.isBuoy) {
    const { power, pose, bme } = telemetry;
    // Stale watermark — don't keep painting last-good readouts as fresh when the field feed stops.
    const staleMs = telemetry.lastUpdateMsAgo;
    const stale = telemetry.link === "stale" || (staleMs != null && staleMs > 30_000);
    const socFrac = power.batterySocPct != null ? power.batterySocPct / 100 : null;
    const sumCurrent = telemetry.propulsion.thrusters.reduce((acc, t) => acc + (t.currentA ?? 0), 0);
    const a = bme.a;
    return (
      <div className="psa-glass-strong flex min-h-16 shrink-0 flex-wrap items-stretch justify-center overflow-hidden text-slate-200">
        {focusChip}

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
          <div
            className="flex items-center gap-1"
            title={pose.gpsLock === "site" ? "Registry SITE position — NOT a live field GPS fix. Check the telemetry hub (:8790)." : `GPS: ${pose.gpsLock}`}
          >
            {/* site = registry fallback → amber (never as healthy-looking as a real field lock). */}
            <StatLED color={pose.gpsLock === "locked" ? "green" : pose.gpsLock === "site" || pose.gpsLock === "drift" ? "amber" : pose.gpsLock === "manual" ? "cyan" : "slate"} />
            <span className={`text-[9px] uppercase ${pose.gpsLock === "site" ? "text-amber-300" : "text-slate-500"}`}>
              {pose.gpsLock === "site" ? "site · not field" : pose.gpsLock}
            </span>
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
        <div className="flex items-center gap-3 px-3">
          {stale && (
            <div
              className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200"
              title={staleMs != null ? `Last field update ${Math.round(staleMs / 1000)}s ago — readouts may be stale` : "Telemetry feed stale"}
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Stale
            </div>
          )}
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

  // Non-buoy droid — show only what the registry reports for THAT device.
  return (
    <div className="flex min-h-16 shrink-0 flex-wrap items-stretch justify-center overflow-hidden bg-[#0a0f1e]/95 text-slate-200">
      {focusChip}

      {/* Position */}
      <Group>
        <MapPin className="h-4 w-4 text-cyan-300" />
        <Readout label="Lat" value={focus.lat != null ? focus.lat.toFixed(5) : null} />
        <Readout label="Lon" value={focus.lon != null ? focus.lon.toFixed(5) : null} />
      </Group>

      {/* Battery */}
      <Group>
        <BatteryCharging className="h-4 w-4 text-green-300" />
        <div className="w-24">
          <div className="flex justify-between text-[9px] uppercase text-slate-500"><span>Battery</span><span className="font-mono text-slate-300">{focus.batteryPct != null ? `${Math.round(focus.batteryPct)}%` : "—"}</span></div>
          <Bar value={focus.batteryPct != null ? focus.batteryPct / 100 : null} color={focus.batteryPct != null && focus.batteryPct < 20 ? "red" : "green"} />
        </div>
      </Group>

      {/* Signal */}
      <Group>
        <Radio className="h-4 w-4 text-cyan-300" />
        <div className="w-24">
          <div className="flex justify-between text-[9px] uppercase text-slate-500"><span>RSSI</span><span className="font-mono text-slate-300">{focus.rssiDbm != null ? `${focus.rssiDbm} dBm` : "—"}</span></div>
          <Bar value={rssiFrac(focus.rssiDbm)} color="cyan" />
        </div>
      </Group>

      {/* Mesh peers */}
      <Group>
        <Users className="h-4 w-4 text-cyan-300" />
        <Readout label="Peers" value={focus.peers != null ? focus.peers : null} />
        <Readout label="Hops" value={null} />
      </Group>

      {/* ack + link */}
      <div className="flex items-center gap-3 px-3">
        {ack && (
          <div className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] ${ack.ok ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
            {ack.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            <span className="font-medium">{ack.label}</span>
          </div>
        )}
        <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${focus.online ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>
          {focus.online ? "Online" : "Standby"}
        </span>
      </div>
    </div>
  );
}
