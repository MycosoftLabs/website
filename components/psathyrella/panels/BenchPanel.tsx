"use client";

/**
 * Bench · Diagnostics panel — the hardware bring-up tools, separated from the sailor-facing
 * Navigation·Propulsion panel (right-rail "Bench" tab):
 *   1. Channel Signals — live per-channel PCA9685 µs guardrail (red THR/SPIN when off-neutral)
 *   2. Bench Jog — direct single-thruster throttle/azimuth for bring-up
 *   3. Raw Channel PWM — drive ANY channel to an exact pulse (find a servo, trim its stop)
 * All command paths identical to the ones bench-verified Jul 03–04.
 */

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Wrench } from "lucide-react";
import { type BuoyCommand, type BuoyTelemetry, type ThrusterId } from "@/lib/psathyrella/contract";
import { useThrottledSend } from "@/lib/psathyrella/useThrottledSend";
import { cn } from "@/lib/utils";
import { Panel, SectionLabel, StatLED } from "@/components/psathyrella/ui";

export function BenchPanel({
  telemetry,
  sendCommand,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => void;
}) {
  const armed = telemetry.autonomy.armed;
  const { send: throttledSend } = useThrottledSend(sendCommand);

  // Bench jog — single-thruster OR all-four control for hardware bring-up.
  // "all" fans the throttle out to ids 0–3 (throttle-only — pods keep their angle), rate-limited
  // locally to ~4 ticks/s so a drag doesn't flood 4× commands per slider event.
  const [jogId, setJogId] = useState<ThrusterId | "all">(0 as ThrusterId);
  const [jogThrottle, setJogThrottle] = useState(0);
  const [jogAz, setJogAz] = useState(0);
  const allGapRef = useRef(0);
  const jogIds: ThrusterId[] = jogId === "all" ? ([0, 1, 2, 3] as ThrusterId[]) : [jogId];
  const jogThrottleSend = (v: number) => {
    if (jogId === "all") {
      const now = Date.now();
      if (now - allGapRef.current < 200) return; // trailing value arrives via the next tick / release
      allGapRef.current = now;
      // ONE atomic nav.thruster_group — the agent applies all 4 ESC writes in a single lock pass
      // (synced actuation). Never a 4-command fan-out: each command rides its own TCP fate and
      // the motors respond as a staggered train (audited spread up to 3s).
      void benchDirect("nav.thruster_group", { throttle: v });
    } else {
      throttledSend({ domain: "thruster", action: "setThruster", id: jogId, throttlePct: v, azimuthDeg: jogAz });
    }
  };
  const jogRate = (rate: number) => {
    if (jogId === "all") {
      // rate spin on all four — atomic group (azimuth rate isn't in the group schema; rate jogging
      // all pods uses one command per pod but is a HOLD gesture, not a sync-critical setpoint)
      for (const id of jogIds) sendCommand({ domain: "thruster", action: "setAzimuthRate", id, ratePct: rate });
    } else {
      sendCommand({ domain: "thruster", action: "setAzimuthRate", id: jogId, ratePct: rate });
    }
  };

  // Direct-to-Jetson bench path (bypasses MAS bearer/queue; ~64ms vs ~1s). Used for the azimuth-home
  // calibration the operator runs on install day. Returns the agent detail for a one-line status echo.
  const [homeMsg, setHomeMsg] = useState<string>("");
  const benchDirect = async (cmd: string, params: Record<string, unknown> = {}) => {
    try {
      const r = await fetch("/api/psathyrella/agent-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, params }),
      });
      const j = await r.json().catch(() => null);
      return j?.response?.detail || (j?.ok ? "ok" : j?.error || "failed");
    } catch (e) {
      return (e as Error).message;
    }
  };
  // GO HOME — drive pods back to the (dead-reckoned) 0° center; SET HOME — declare the CURRENT physical
  // position as 0° (install-day calibration, no motion). The agent's azimuth handler acts on one pod,
  // so "all" loops per-pod; nav.az_zero handles all pods itself when id is omitted.
  const goHome = async (id?: number) => {
    setHomeMsg(id == null ? "homing all pods…" : `homing pod ${id}…`);
    // "all" = ONE atomic nav.thruster_group so all four pods start rotating home together.
    const last = id == null
      ? await benchDirect("nav.thruster_group", { items: [0, 1, 2, 3].map((i) => ({ id: i, azimuth: 0 })) })
      : await benchDirect("nav.thruster_azimuth", { id, azimuth: 0 });
    setHomeMsg(`go-home ${id == null ? "all" : `pod ${id}`}: ${last}`);
  };
  const setHome = async (id?: number) => {
    setHomeMsg("set-home: " + (await benchDirect("nav.az_zero", id == null ? {} : { id })));
  };

  // Raw PCA9685 channel tester — find which channel a servo/ESC is on, trim its neutral.
  const [rawCh, setRawCh] = useState(4);
  const [rawUs, setRawUs] = useState(1700);
  const sendRaw = (us: number) => sendCommand({ domain: "pwm", action: "setChannel", channel: rawCh, us });

  // Live per-channel stop trim + the real ESC/servo channel map from the agent, so spin/STOP/spin
  // presets center on THIS channel's real neutral and the grids show the ACTUAL wired channels
  // (ESCs moved to CH8–11, servos on CH4–7) instead of a hardcoded 0–7.
  const { data: agentState } = useSWR<{
    up?: boolean;
    escNeutralUs?: number | null;
    escNeutralByChannel?: Record<string, number>;
    escChannels?: number[] | null;
    servoChannels?: number[] | null;
    servoStopByChannel?: Record<string, number>;
    channelsUs?: Record<string, number>;
  }>(
    "/api/psathyrella/agent-state",
    (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    { refreshInterval: 2500, revalidateOnFocus: false, dedupingInterval: 2000 }
  );
  // ESC/servo channel sets (fall back to the legacy 0–3 / 4–7 layout only until the agent answers).
  const escChannels = agentState?.escChannels ?? [0, 1, 2, 3];
  const servoChannels = agentState?.servoChannels ?? [4, 5, 6, 7];
  const escSet = new Set(escChannels);
  const escNeutral = typeof agentState?.escNeutralUs === "number" ? agentState.escNeutralUs : 1500;
  const isEscCh = (c: number) => escSet.has(c);
  // Label a channel by its role + index within that role, e.g. CH8 → "ESC0", CH4 → "SRV0".
  const roleLabel = (c: number) => (isEscCh(c) ? `ESC${escChannels.indexOf(c)}` : `SRV${servoChannels.indexOf(c)}`);
  // ESC stop: per-channel trim (Cursor P1) wins over the single neutral; servos use their trim map.
  const stopFor = (c: number) =>
    isEscCh(c)
      ? Math.round(agentState?.escNeutralByChannel?.[String(c)] ?? escNeutral)
      : Math.round(agentState?.servoStopByChannel?.[String(c)] ?? 1500);
  // Union of all wired channels, sorted, for the live-signals grid + raw selector.
  const allChannels = Array.from(new Set([...escChannels, ...servoChannels])).sort((a, b) => a - b);
  // Once the real map arrives, snap the raw tester onto a wired channel if it isn't already.
  useEffect(() => {
    if (agentState?.escChannels && !allChannels.includes(rawCh) && allChannels.length) setRawCh(allChannels[0]);
  }, [agentState?.escChannels]); // eslint-disable-line react-hooks/exhaustive-deps
  const chStop = stopFor(rawCh);
  const chLive = agentState?.channelsUs?.[String(rawCh)];
  useEffect(() => { setRawUs(chStop); }, [chStop, rawCh]);

  return (
    <Panel title="Bench · Diagnostics" icon={<Wrench className="h-3.5 w-3.5" />} className="h-full">
      {/* Live channel signals — see which ESC/servo channels the PCA9685 is driving off-neutral. */}
      <SectionLabel>Channel Signals · live{agentState?.up === false ? " · agent down" : ""}</SectionLabel>
      <div className="mb-3 grid grid-cols-4 gap-1">
        {allChannels.map((c) => {
          const us = agentState?.channelsUs?.[String(c)];
          const isEsc = isEscCh(c);
          const stop = stopFor(c);
          const active = typeof us === "number" && Math.abs(us - stop) > 6;
          return (
            <div key={c} className={cn("rounded border px-1 py-0.5 text-center", active ? "border-red-500/50 bg-red-500/15" : "border-white/10 bg-white/[0.02]")}>
              <div className="text-[8px] uppercase tracking-wide text-slate-500">{roleLabel(c)}<span className="text-slate-600">·{c}</span></div>
              <div className={cn("font-mono text-[10px] tabular-nums", active ? "text-red-200" : "text-slate-400")}>{typeof us === "number" ? Math.round(us) : "—"}</div>
              <div className="flex items-center justify-center gap-0.5">
                <StatLED color={active ? "red" : "slate"} pulse={active} />
                <span className="text-[7px] uppercase tracking-wide text-slate-500">{typeof us !== "number" ? "—" : active ? (isEsc ? "thr" : "spin") : "stop"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Azimuth home / center calibration — for install day (props/servos not yet coupled).
          Jog a pod until its prop points straight out from center mass, then SET HOME to make that
          position 0°. GO HOME returns pods to that center. Direct-to-Jetson (bypasses MAS). */}
      <SectionLabel>Azimuth · Home / Center <span className="ml-1 text-cyan-400/60">install cal</span></SectionLabel>
      <div className="mb-3 rounded border border-cyan-500/15 bg-cyan-500/[0.04] px-2 py-2">
        <div className="mb-1.5 flex gap-1">
          <button type="button" onClick={() => goHome()} className="flex-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-1 py-1 text-[10px] font-bold uppercase text-cyan-100 hover:bg-cyan-500/20">⌂ Go Home · all</button>
          <button type="button" onClick={() => setHome()} title="Declare the current physical position of ALL pods as 0° center" className="flex-1 rounded border border-amber-500/40 bg-amber-500/10 px-1 py-1 text-[10px] font-bold uppercase text-amber-100 hover:bg-amber-500/20">⦿ Set Home · all</button>
        </div>
        {/* per-pod: on install, jog pod N straight-out, then Set N = 0° */}
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((id) => (
            <div key={id} className="flex flex-col gap-0.5 rounded border border-white/10 bg-black/30 px-1 py-1">
              <span className="text-center text-[8px] uppercase tracking-wide text-slate-500">Pod {id}</span>
              <button type="button" onClick={() => goHome(id)} className="rounded bg-cyan-500/10 py-0.5 text-[8px] font-bold uppercase text-cyan-200 hover:bg-cyan-500/20">Home</button>
              <button type="button" onClick={() => setHome(id)} title={`Set pod ${id} current position as 0°`} className="rounded bg-amber-500/10 py-0.5 text-[8px] font-bold uppercase text-amber-200 hover:bg-amber-500/20">Set 0°</button>
            </div>
          ))}
        </div>
        <div className="mt-1 min-h-[12px] text-[9px] text-slate-500">{homeMsg || "jog a pod straight-out → Set 0° locks it as center"}</div>
      </div>

      {/* Bench jog — direct single-thruster control (nav.thruster + continuous-servo rate). */}
      <SectionLabel>Bench Jog · Single Thruster</SectionLabel>
      <div className="mb-3 rounded border border-cyan-500/15 bg-white/[0.02] px-2 py-2">
        <div className="mb-1.5 flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Thruster</span>
          {[0, 1, 2, 3].map((id) => (
            <button key={id} type="button" onClick={() => setJogId(id as ThrusterId)} title={`thruster ${id} → CH${escChannels[id] ?? "?"}`} className={cn("h-6 min-w-6 rounded border px-1 text-[9px] font-bold leading-none", jogId === id ? "border-cyan-500/50 bg-cyan-500/25 text-cyan-100" : "border-white/10 bg-black/40 text-slate-400")}>
              {id}<span className="text-[7px] opacity-70">·{escChannels[id] ?? "?"}</span>
            </button>
          ))}
          <button type="button" onClick={() => setJogId("all")} title="Drive ALL four thrusters together (throttle-only — pods keep their angle)" className={cn("h-6 rounded border px-1.5 text-[9px] font-bold leading-none", jogId === "all" ? "border-amber-500/60 bg-amber-500/25 text-amber-100" : "border-white/10 bg-black/40 text-slate-400")}>
            ALL
          </button>
          {!armed && <span className="ml-auto text-[9px] uppercase text-amber-400/80">arm to spin</span>}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400"><span>Throttle{jogId === "all" ? " · ALL ×4" : ""}</span><span className={cn("font-mono", jogThrottle > 0 ? "text-green-300" : jogThrottle < 0 ? "text-amber-300" : "text-slate-400")}>{jogThrottle}%</span></div>
        <input type="range" min={-100} max={100} value={jogThrottle}
          onChange={(e) => { const v = +e.target.value; setJogThrottle(v); jogThrottleSend(v); }}
          onPointerUp={() => { if (jogId === "all") { allGapRef.current = 0; jogThrottleSend(jogThrottle); } }}
          className={cn("w-full", jogId === "all" ? "accent-amber-400" : "accent-cyan-400")} />
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Azimuth</span>
          <span className="font-mono text-[10px] text-cyan-200">{jogAz}°</span>
          {/* FS90MR continuous-servo jog: hold ◄/► to spin, release/■ to stop */}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" title="Spin CCW (hold)" onPointerDown={() => jogRate(-60)} onPointerUp={() => jogRate(0)} onPointerLeave={() => jogRate(0)} className="h-6 w-7 rounded border border-white/10 bg-black/40 text-cyan-200">◄</button>
            <button type="button" title="Stop servo" onClick={() => jogRate(0)} className="h-6 w-7 rounded border border-white/10 bg-black/40 text-slate-300">■</button>
            <button type="button" title="Spin CW (hold)" onPointerDown={() => jogRate(60)} onPointerUp={() => jogRate(0)} onPointerLeave={() => jogRate(0)} className="h-6 w-7 rounded border border-white/10 bg-black/40 text-cyan-200">►</button>
          </div>
        </div>
        {/* absolute azimuth slider — single-pod only (in ALL mode use ◄ ■ ► which drives all four) */}
        <input type="range" min={0} max={360} value={jogAz} disabled={jogId === "all"}
          onChange={(e) => { if (jogId === "all") return; const v = +e.target.value; setJogAz(v); throttledSend({ domain: "thruster", action: "setThruster", id: jogId, throttlePct: jogThrottle, azimuthDeg: v }); }}
          className={cn("mt-1 w-full accent-cyan-400", jogId === "all" && "opacity-30")} />
      </div>

      {/* Raw channel PWM — drive ANY PCA9685 channel directly (find the servo, trim its stop). */}
      <SectionLabel>Raw Channel · PWM <span className="ml-1 text-amber-400/70">bypasses arm</span></SectionLabel>
      <div className="rounded border border-amber-500/25 bg-amber-500/[0.05] px-2 py-2">
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Ch</span>
          {allChannels.map((c) => (
            <button key={c} type="button" onClick={() => setRawCh(c)} title={roleLabel(c)} className={cn("h-6 w-6 rounded border text-[10px] font-bold", rawCh === c ? "border-amber-500/60 bg-amber-500/25 text-amber-100" : isEscCh(c) ? "border-cyan-500/20 bg-black/40 text-cyan-300/80" : "border-white/10 bg-black/40 text-slate-400")}>{c}</button>
          ))}
        </div>
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">{roleLabel(rawCh)} · CH{rawCh} · stop {chStop}</span>
          <span className="font-mono text-amber-200">{rawUs}µs{chLive != null ? ` · live ${Math.round(chLive)}` : ""}</span>
        </div>
        <input type="range" min={1000} max={2000} step={10} value={rawUs} onChange={(e) => setRawUs(+e.target.value)} className="w-full accent-amber-400" />
        <div className="mt-1.5 flex gap-1">
          {/* spin one way / STOP / spin the other way — centered on THIS channel's live trim */}
          <button type="button" onClick={() => { setRawUs(chStop - 100); sendRaw(chStop - 100); }} title={`spin one way (${chStop - 100}µs)`} className="flex-1 rounded border border-white/10 bg-black/40 px-1 py-1 text-[9px] font-bold text-cyan-300 hover:text-white">◄ Spin</button>
          <button type="button" onClick={() => { setRawUs(chStop); sendRaw(chStop); }} title={`stop at ${chStop}µs`} className="flex-1 rounded border border-white/10 bg-black/40 px-1 py-1 text-[9px] font-bold text-slate-100 hover:text-white">STOP {chStop}</button>
          <button type="button" onClick={() => { setRawUs(chStop + 100); sendRaw(chStop + 100); }} title={`spin other way (${chStop + 100}µs)`} className="flex-1 rounded border border-white/10 bg-black/40 px-1 py-1 text-[9px] font-bold text-cyan-300 hover:text-white">Spin ►</button>
          <button type="button" onClick={() => sendRaw(rawUs)} className="flex-[1.2] rounded border border-amber-500/50 bg-amber-500/20 px-1 py-1 text-[9px] font-bold uppercase text-amber-100">Send {rawUs}</button>
        </div>
      </div>
    </Panel>
  );
}
