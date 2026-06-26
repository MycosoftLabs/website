"use client";

import { Radio, Waves, Volume2, ArrowLeftRight, Bluetooth, Wifi, Signal, RadioTower, Send } from "lucide-react";
import {
  RADIO_LABEL,
  type BuoyCommand,
  type BuoyTelemetry,
  type RadioKind,
} from "@/lib/psathyrella/contract";
import { Panel, SectionLabel, StatLED, Readout, Bar, TacButton } from "@/components/psathyrella/ui";

const RADIO_ICON: Record<RadioKind, typeof Bluetooth> = {
  ble: Bluetooth,
  cellular: Signal,
  wifi: Wifi,
  lora: RadioTower,
};

// map RSSI (dBm) → 0..1 strength for the bar
function rssiFrac(rssi: number | null): number | null {
  if (rssi == null) return null;
  return Math.max(0, Math.min(1, (rssi + 100) / 60)); // -100..-40 → 0..1
}

export function CommsPanel({
  telemetry,
  sendCommand,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => void;
}) {
  const { comms } = telemetry;

  return (
    <Panel title="Comms · Bridge" icon={<Radio className="h-4 w-4" />} className="h-full">
      {/* Surface ↔ subsurface bridge */}
      <div className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 ${comms.bridgeActive ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-white/[0.02]"}`}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className={`h-4 w-4 ${comms.bridgeActive ? "text-cyan-300" : "text-slate-500"}`} />
          <div>
            <div className="text-[11px] font-bold text-white">RF ↔ ACOUSTIC BRIDGE</div>
            <div className="text-[9px] text-slate-400">radio ⇄ transducer translation</div>
          </div>
        </div>
        <StatLED color={comms.bridgeActive ? "green" : "slate"} pulse={comms.bridgeActive} />
      </div>

      {/* RF stack */}
      <SectionLabel>Above-Water RF Stack</SectionLabel>
      <div className="mb-3 space-y-1.5">
        {comms.radios.map((r) => {
          const Icon = RADIO_ICON[r.kind];
          return (
            <div key={r.kind} className="rounded bg-white/[0.03] px-2 py-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${r.connected ? "text-cyan-300" : "text-slate-600"}`} />
                  <span className="text-[11px] font-medium text-slate-200">{RADIO_LABEL[r.kind]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{r.rssiDbm != null ? `${r.rssiDbm} dBm` : "—"}</span>
                  <StatLED color={r.connected ? "green" : "slate"} />
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Bar value={rssiFrac(r.rssiDbm)} color="cyan" />
                <span className="w-14 shrink-0 text-right font-mono text-[9px] text-slate-500">{r.latencyMs != null ? `${r.latencyMs}ms` : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acoustic modem */}
      <SectionLabel>Underwater Acoustic Modem</SectionLabel>
      <div className="mb-2 grid grid-cols-3 gap-2 rounded bg-white/[0.03] px-2 py-2">
        <Readout label="Link" value={comms.acoustic.connected ? "UP" : "DOWN"} status={comms.acoustic.connected ? "ok" : "idle"} />
        <Readout label="SNR" value={comms.acoustic.snrDb != null ? comms.acoustic.snrDb.toFixed(1) : null} unit="dB" />
        <Readout label="Range" value={comms.acoustic.rangeM != null ? Math.round(comms.acoustic.rangeM) : null} unit="m" />
        <Readout label="Carrier" value={comms.acoustic.carrierKhz} unit="kHz" />
        <Readout label="Last ping" value={comms.acoustic.lastPingMsAgo != null ? `${(comms.acoustic.lastPingMsAgo / 1000).toFixed(1)}s` : null} />
        <div className="flex items-end">
          <TacButton onClick={() => sendCommand({ domain: "comms", action: "ping" })} className="h-7 w-full px-1 text-[10px]"><Send className="h-3 w-3" /> Ping</TacButton>
        </div>
      </div>

      {/* Hydrophone */}
      <SectionLabel>Hydrophone (SINE)</SectionLabel>
      <div className="mb-2 rounded bg-white/[0.03] px-2 py-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-200"><Volume2 className="h-3.5 w-3.5 text-violet-300" /> Broadband</span>
          <span className="font-mono text-[11px] text-slate-300">{comms.hydrophone.levelDb != null ? `${comms.hydrophone.levelDb.toFixed(0)} dB` : "—"}</span>
        </div>
        <div className="mt-1"><Bar value={comms.hydrophone.levelDb != null ? (comms.hydrophone.levelDb + 80) / 80 : null} color="blue" /></div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
          <span><Waves className="mr-1 inline h-3 w-3" />Peak brg {comms.hydrophone.peakBearingDeg != null ? `${Math.round(comms.hydrophone.peakBearingDeg)}°` : "—"}</span>
          <span>{comms.hydrophone.bandHz ? `${comms.hydrophone.bandHz.lo}–${comms.hydrophone.bandHz.hi} Hz` : "— band"}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <TacButton onClick={() => sendCommand({ domain: "comms", action: "recordHydrophone", band: "lf" })} className="text-[10px]">Rec LF</TacButton>
          <TacButton onClick={() => sendCommand({ domain: "comms", action: "recordHydrophone", band: "hf" })} className="text-[10px]">Rec HF</TacButton>
        </div>
      </div>

      {/* Last NLM uplink */}
      <SectionLabel>Last NLM Uplink</SectionLabel>
      <div className="rounded border border-violet-500/20 bg-violet-500/5 px-2 py-1.5">
        {comms.lastUplink?.summary ? (
          <>
            <div className="text-[11px] text-violet-100">{comms.lastUplink.summary}</div>
            <div className="mt-0.5 text-[9px] text-slate-500">{comms.lastUplink.atMsAgo != null ? `${(comms.lastUplink.atMsAgo / 1000).toFixed(0)}s ago` : ""}</div>
          </>
        ) : (
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Awaiting NLM classification feed</div>
        )}
      </div>
    </Panel>
  );
}
