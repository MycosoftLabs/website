"use client";

import { useState } from "react";
import useSWR from "swr";
import { Radio, Waves, Volume2, ArrowLeftRight, Bluetooth, Wifi, Signal, RadioTower, Send, Satellite, Orbit, Cable, Activity } from "lucide-react";
import {
  BEARER_TIER,
  RADIO_LABEL,
  type BearerTier,
  type BuoyCommand,
  type BuoyTelemetry,
  type RadioKind,
} from "@/lib/psathyrella/contract";
import { Panel, SectionLabel, StatLED, Readout, Bar, TacButton } from "@/components/psathyrella/ui";
import { useEdgeHealth } from "@/lib/psathyrella/useEdgeHealth";

const RADIO_ICON: Record<RadioKind, typeof Bluetooth> = {
  ble: Bluetooth,
  cellular: Signal,
  wifi: Wifi,
  lora: RadioTower,
  iridium: Satellite,
  starlink: Orbit,
};

// Bearer-tier pill styling — cellular/wifi PRIMARY (bench/pool C2), lora SECONDARY (long-range
// fallback), iridium/starlink STANDBY (no modem yet). Mirrors BEARER_TIER from the contract.
const TIER_PILL: Record<BearerTier, string> = {
  primary: "bg-cyan-500/15 text-cyan-300",
  secondary: "bg-amber-500/15 text-amber-300/80",
  standby: "bg-white/5 text-slate-500",
};

// map RSSI (dBm) → 0..1 strength for the bar
function rssiFrac(rssi: number | null): number | null {
  if (rssi == null) return null;
  return Math.max(0, Math.min(1, (rssi + 100) / 60)); // -100..-40 → 0..1
}

type LinkProbe = { up: boolean; latencyMs: number | null; minMs?: number | null; maxMs?: number | null; rssiDbm?: number | null; linkQuality?: number | null; ip: string };
type LinkStatus = { ethernet: LinkProbe; wifi: LinkProbe; c2TargetIp: string };

export function CommsPanel({
  telemetry,
  sendCommand,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => void;
}) {
  // Live dual-path buoy link (Jetson dual-homed: Ethernet .123 preferred / Wi-Fi .211 backup).
  // Polls both :8788 health endpoints server-side — this is the live readout for the
  // Ethernet-unplug → Wi-Fi failover latency drill.
  const { data: link } = useSWR<LinkStatus>(
    "/api/psathyrella/link-status",
    (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    { refreshInterval: 5000, revalidateOnFocus: false, dedupingInterval: 4000 }
  );
  const [burst, setBurst] = useState<LinkStatus | null>(null);
  const [bursting, setBursting] = useState(false);
  const runBurst = async () => {
    setBursting(true);
    try { setBurst(await fetch("/api/psathyrella/link-status?burst=5", { cache: "no-store" }).then((r) => r.json())); }
    catch { setBurst(null); }
    finally { setBursting(false); }
  };
  // C2 (.123) rides Wi-Fi — Wi-Fi down means the buoy is uncommandable regardless of the cable.
  const c2Down = link && !link.wifi.up;

  // Telemetry-hub health (shared edge-health probe). When the hub is down, MAS can't merge the Side-B
  // radios, so BLE/LoRa/cellular read disconnected — that's a PIPELINE outage, not a radio-firmware
  // fault. Wi-Fi below stays honest because it comes from a direct Jetson probe (link-status), not the hub.
  const { data: edge } = useEdgeHealth();
  const hubDown = edge?.hub != null && edge.hub.up === false;

  const { comms } = telemetry;
  // ── UNDERWATER ACOUSTIC MODEM (real TX — Jetson :8791, dry transducer on the SECOND PCA) ──
  // Replaces the Satellite Backhaul block (sat detail moves to the future per-bearer panels).
  // No mock: :8791 down = OFFLINE. Real UW transducers swap in later behind the same API.
  const { data: uw, mutate: refreshUw } = useSWR<{
    up: boolean; txing?: boolean; mode?: string; freq_hz?: number; tx_count?: number; last_tx_ms_ago?: number | null;
  }>(
    "/api/psathyrella/acoustic",
    (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    { refreshInterval: 4000, revalidateOnFocus: false, dedupingInterval: 3000 }
  );
  const [toneHz, setToneHz] = useState(4000);
  const [uwMsg, setUwMsg] = useState("");
  const [uwLog, setUwLog] = useState<string[]>([]);
  const [uwBusy, setUwBusy] = useState(false);
  const uwPost = async (action: string, params: Record<string, unknown> = {}) => {
    setUwBusy(true);
    try {
      await fetch("/api/psathyrella/acoustic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params }),
      });
      refreshUw();
    } finally {
      setUwBusy(false);
    }
  };
  const uwPing = () => uwPost("pulse", { count: 3, on_ms: 400, off_ms: 250, freq_hz: toneHz });
  const uwTone = () => uwPost("tone", { freq_hz: toneHz, duration_ms: 1000 });
  const uwStop = () => uwPost("off");
  const uwSend = () => {
    const text = uwMsg.trim().slice(0, 16);
    if (!text) return;
    uwPost("message", { text, freq_hz: toneHz });
    setUwLog((l) => [`➤ ${text}`, ...l].slice(0, 3));
    setUwMsg("");
  };

  return (
    <Panel title="Comms · Bridge" icon={<Radio className="h-4 w-4" />} className="h-full">
      {/* Surface ↔ subsurface bridge */}
      <div className={`mb-2 flex items-center justify-between rounded-lg border px-3 py-2 ${comms.bridgeActive ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-white/[0.02]"}`}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className={`h-4 w-4 ${comms.bridgeActive ? "text-cyan-300" : "text-slate-500"}`} />
          <div>
            <div className="text-[11px] font-bold text-white">RF ↔ ACOUSTIC BRIDGE</div>
            <div className="text-[9px] text-slate-400">radio ⇄ transducer translation</div>
          </div>
        </div>
        <StatLED color={comms.bridgeActive ? "green" : "slate"} pulse={comms.bridgeActive} />
      </div>

      {/* Live buoy link — dual-homed Jetson: Ethernet preferred, Wi-Fi backup. The failover drill
          readout: pull Ethernet and watch it go red while Wi-Fi stays green with live latency. */}
      <div className="mb-1 flex items-center justify-between">
        <SectionLabel className="mb-0">Buoy Link · live</SectionLabel>
        <button
          type="button"
          onClick={runBurst}
          disabled={bursting}
          title="Run a 5-probe latency burst on both paths (min/median/max)"
          className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40"
        >
          <Activity className="h-2.5 w-2.5" /> {bursting ? "testing…" : "burst ×5"}
        </button>
      </div>
      <div className="mb-2 space-y-1">
        {([
          // Wi-Fi first — it carries the buoy's identity (.123 = C2/MQTT); Ethernet = bench umbilical.
          { key: "wifi", label: "Wi-Fi · Myca", Icon: Wifi, p: link?.wifi, vital: true },
          { key: "ethernet", label: "Ethernet", Icon: Cable, p: link?.ethernet, vital: false },
        ] as const).map(({ key, label, Icon, p, vital }) => (
          <div key={key} className={`flex items-center gap-1.5 rounded px-2 py-1 ${p?.up ? "bg-white/[0.03]" : vital ? "border border-red-500/30 bg-red-500/10" : "border border-white/10 bg-white/[0.02]"}`}>
            <Icon className={`h-3.5 w-3.5 shrink-0 ${p?.up ? "text-cyan-300" : vital ? "text-red-400" : "text-slate-500"}`} />
            <span className="w-20 shrink-0 text-[10px] font-medium text-slate-200">{label}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-slate-500">{p?.ip ?? "—"}{link?.c2TargetIp === p?.ip ? " · C2" : ""}</span>
            <span className={`shrink-0 font-mono text-[10px] ${p?.up ? "text-cyan-200" : vital ? "text-red-300" : "text-slate-500"}`}>{p?.up ? `${p.latencyMs}ms` : vital ? "DOWN" : "unplugged"}</span>
            <StatLED color={p == null ? "slate" : p.up ? "green" : vital ? "red" : "slate"} pulse={!!p?.up} />
          </div>
        ))}
        {burst && (
          <div className="rounded bg-white/[0.02] px-2 py-0.5 font-mono text-[8px] text-slate-400">
            burst: eth {burst.ethernet.up ? `${burst.ethernet.minMs}/${burst.ethernet.latencyMs}/${burst.ethernet.maxMs}ms` : "down"} · wifi {burst.wifi.up ? `${burst.wifi.minMs}/${burst.wifi.latencyMs}/${burst.wifi.maxMs}ms` : "down"} (min/med/max)
          </div>
        )}
        {c2Down && (
          <div className="rounded border border-red-500/50 bg-red-500/15 px-2 py-1 text-[9px] font-bold text-red-200">
            C2 DOWN — Wi-Fi ({link!.c2TargetIp}) unreachable: buoy is uncommandable{link!.ethernet.up ? " (Ethernet umbilical still up for SSH)" : ""}
          </div>
        )}
      </div>

      {/* RF stack */}
      <SectionLabel>Above-Water RF Stack</SectionLabel>
      {hubDown && (
        <div className="mb-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] font-semibold text-amber-200">
          RF status unknown — telemetry hub :8790 unreachable. BLE / LoRa / cellular can’t be read (not a Side-B firmware fault). Wi-Fi below is a direct Jetson probe.
        </div>
      )}
      <div className="mb-2 space-y-1">
        {comms.radios.map((r) => {
          const Icon = RADIO_ICON[r.kind];
          // The WIFI row is LIVE: real RSSI from the Jetson radio (/proc/net/wireless via the
          // link-status probe) overrides the contract placeholder — bar + dBm + LED are the
          // buoy's actual radio, updating every poll. Other bearers stay contract-fed until
          // their modems physically exist.
          const isLiveWifi = r.kind === "wifi" && link?.wifi != null;
          const connected = isLiveWifi ? link!.wifi.up : r.connected;
          const rssi = isLiveWifi ? (link!.wifi.rssiDbm ?? null) : r.rssiDbm;
          const lat = isLiveWifi ? link!.wifi.latencyMs : r.latencyMs;
          return (
            /* single-line radio row: icon · name · tier · signal bar · dBm · LED */
            <div key={r.kind} className="flex items-center gap-1.5 rounded bg-white/[0.03] px-2 py-1" title={lat != null ? `${RADIO_LABEL[r.kind]} · ${lat}ms${isLiveWifi ? " · live" : ""}` : RADIO_LABEL[r.kind]}>
              <Icon className={`h-3.5 w-3.5 shrink-0 ${connected ? "text-cyan-300" : "text-slate-600"}`} />
              <span className="w-14 shrink-0 truncate text-[10px] font-medium text-slate-200">{RADIO_LABEL[r.kind]}</span>
              <span className={`shrink-0 rounded px-1 py-px text-[7px] font-bold uppercase tracking-wider ${TIER_PILL[BEARER_TIER[r.kind]]}`}>{BEARER_TIER[r.kind].slice(0, 3)}</span>
              <div className="min-w-0 flex-1"><Bar value={rssiFrac(rssi)} color="cyan" /></div>
              <span className="w-12 shrink-0 text-right font-mono text-[9px] text-slate-400">{rssi != null ? `${rssi}dBm` : "—"}</span>
              <StatLED color={connected ? "green" : "slate"} pulse={isLiveWifi && connected} />
            </div>
          );
        })}
      </div>

      {/* Preferred C2 bearer — bench = Wi-Fi, pool = 4G/LTE (primary); LoRa = secondary long-range
          fallback; satellite stays standby until a modem is wired. Issues comms.set_bearer to MAS. */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className="mr-0.5 text-[9px] uppercase tracking-wider text-slate-500">Set bearer</span>
        {(["cellular", "wifi", "lora"] as RadioKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => sendCommand({ domain: "comms", action: "setBearer", bearer: k })}
            title={BEARER_TIER[k] === "primary" ? `Set ${RADIO_LABEL[k]} as primary C2 bearer` : `${RADIO_LABEL[k]} — secondary long-range fallback`}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              BEARER_TIER[k] === "primary"
                ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                : "border border-amber-500/30 bg-amber-500/[0.06] text-amber-300/80 hover:bg-amber-500/15"
            }`}
          >
            {RADIO_LABEL[k]}{BEARER_TIER[k] === "secondary" ? " · 2nd" : ""}
          </button>
        ))}
      </div>

      {/* ── UNDERWATER ACOUSTIC MODEM — the RF ↔ acoustic bridge (replaced Satellite Backhaul;
          per-bearer detail panels take sat/starlink later). REAL transducer TX via Jetson :8791
          (second PCA, i2c-1 — NEVER the propulsion PCA). Dry bench stand-in until the real UW
          transducers + hydrophones arrive — same controls, hardware swaps behind the API. ── */}
      <div className="mb-1 flex items-center justify-between">
        <SectionLabel className="mb-0">Underwater Acoustic Modem</SectionLabel>
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-amber-300/90">dry stand-in</span>
      </div>
      <div className={`mb-2 rounded border px-2 py-2 ${uw?.up ? "border-violet-500/25 bg-violet-500/[0.05]" : "border-red-500/30 bg-red-500/[0.06]"}`}>
        {/* live TX state — from :8791/health, no mock */}
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Waves className={`h-3.5 w-3.5 ${uw?.up ? "text-violet-300" : "text-red-400"}`} />
            <span className={`text-[10px] font-semibold ${uw?.up ? "text-slate-200" : "text-red-200"}`}>
              {uw == null ? "…" : uw.up ? (uw.txing ? `TX ACTIVE · ${uw.mode ?? ""}` : "TX idle") : "TRANSDUCER OFFLINE"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-slate-400">
              {uw?.up ? `${((uw.freq_hz ?? 0) / 1000).toFixed(1)}kHz · ${uw.tx_count ?? 0} tx` : "—"}
            </span>
            <StatLED color={uw == null ? "slate" : !uw.up ? "red" : uw.txing ? "amber" : "green"} pulse={!!uw?.txing} />
          </div>
        </div>
        {/* transmit controls */}
        <div className="mb-1.5 flex gap-1">
          <TacButton onClick={uwPing} disabled={!uw?.up || uwBusy} className="h-7 flex-1 px-1 text-[10px]" title="3-pulse acoustic ping">
            <Send className="h-3 w-3" /> Ping
          </TacButton>
          <TacButton onClick={uwTone} disabled={!uw?.up || uwBusy} className="h-7 flex-1 px-1 text-[10px]" title="1s carrier tone at the selected frequency">
            <Volume2 className="h-3 w-3" /> Tone
          </TacButton>
          <TacButton tone="danger" onClick={uwStop} disabled={!uw?.up} className="h-7 flex-1 px-1 text-[10px]" title="Stop transmitting">
            ■ Stop
          </TacButton>
        </div>
        {/* carrier frequency */}
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="shrink-0 text-[9px] uppercase tracking-wide text-slate-500">Carrier</span>
          <input
            type="range" min={2000} max={6000} step={100} value={toneHz}
            onChange={(e) => setToneHz(+e.target.value)}
            className="min-w-0 flex-1 accent-violet-400"
          />
          <span className="w-12 shrink-0 text-right font-mono text-[10px] text-violet-200">{(toneHz / 1000).toFixed(1)} kHz</span>
        </div>
        {/* RF → acoustic bridge messaging (crude pulse-encoded stand-in, 16 chars) */}
        <div className="flex gap-1">
          <input
            type="text" maxLength={16} value={uwMsg}
            onChange={(e) => setUwMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") uwSend(); }}
            placeholder="bridge message → transducer (16 ch)"
            className="min-w-0 flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
          />
          <TacButton onClick={uwSend} disabled={!uw?.up || uwBusy || !uwMsg.trim()} className="h-7 px-2 text-[10px]" title="Encode as acoustic pulses and transmit">
            TX ➤
          </TacButton>
        </div>
        {uwLog.length > 0 && (
          <div className="mt-1 space-y-px">
            {uwLog.map((m, i) => (
              <div key={i} className="truncate font-mono text-[8px] text-violet-300/70">{m}</div>
            ))}
          </div>
        )}
      </div>

      {/* Hydrophone — (NLM uplink block removed until the classification feed is live) */}
      <SectionLabel>Hydrophone (SINE)</SectionLabel>
      <div className="rounded bg-white/[0.03] px-2 py-2">
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
    </Panel>
  );
}
