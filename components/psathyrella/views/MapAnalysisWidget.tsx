"use client";

/**
 * MYCA analysis widget (top-left of the MAP) — a stationary, DYNAMIC info panel akin to
 * the Earth-Sim MYCA analysis rail. Updates as the map moves: shows the viewed location +
 * live weather, the buoy's environmental sensors + sea state, a MYCA analysis line, and an
 * Eagle-Eye strip of recent captures (per buoy). Isolated: live weather via a keyless public
 * API; no NatureOS/CREP providers. MYCA inference + real captures wire via lightweight APIs.
 */

import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import { Brain, Camera, MapPin, Minus, Wind, Droplets, Gauge, Thermometer } from "lucide-react";
import { StatLED } from "@/components/psathyrella/ui";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { SineWidget } from "./SineWidget";
import { useSineDetections } from "@/lib/psathyrella/useSineDetections";

const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

function wmo(code: number | null | undefined): string {
  if (code == null) return "—";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

const MIN_KEY = "psathyrella.myca.min";

export function MapAnalysisWidget({
  center,
  telemetry,
  selectedName,
}: {
  center: { lat: number; lon: number } | null;
  telemetry: BuoyTelemetry;
  selectedName: string | null;
}) {
  // Minimize to a brain pill — persisted so the choice survives reloads.
  const [minimized, setMinimized] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(MIN_KEY) === "1"; } catch { return false; }
  });
  const setMin = (v: boolean) => {
    setMinimized(v);
    try { localStorage.setItem(MIN_KEY, v ? "1" : "0"); } catch { /* private mode */ }
  };
  const wKey = center
    ? `https://api.open-meteo.com/v1/forecast?latitude=${center.lat.toFixed(2)}&longitude=${center.lon.toFixed(2)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
    : null;
  const { data: weather } = useSWR(wKey, fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
  const cur = weather?.current;

  const sine = useSineDetections();

  // Real MYCA situational read (viewport-ai-summary), debounced after the map settles;
  // falls back to the deterministic line below if MAS is unreachable.
  const [mycaSummary, setMycaSummary] = useState<string | null>(null);
  const revRef = useRef(0);
  useEffect(() => {
    if (!center) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      const revision = `psa-${Date.now()}-${revRef.current++}`;
      fetch("/api/crep/viewport-ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, context: { revision, reason: "camera", zoom: 8, center: { lat: center.lat, lng: center.lon }, place: `${center.lat.toFixed(3)}, ${center.lon.toFixed(3)}` } }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j?.summary) setMycaSummary(String(j.summary)); })
        .catch(() => { /* keep the deterministic read */ });
    }, 1500);
    return () => { ctrl.abort(); clearTimeout(id); };
  }, [center]);

  const a = telemetry.bme.a;
  const focus = selectedName ?? "Psathyrella";

  // MYCA analysis line — deterministic synthesis of buoy state (live MYCA inference wires later).
  const bridge = telemetry.comms.bridgeActive;
  const acoustic = telemetry.comms.acoustic.connected;
  const bmeLive = a?.temperature != null;
  const analysis = [
    telemetry.link === "online" ? "Buoy online" : "Buoy link " + telemetry.link,
    bridge ? "RF⇄acoustic bridge active" : "bridge standby",
    acoustic ? "transducer up" : "transducer down",
    bmeLive ? "atmos nominal" : "BME688 standby",
    telemetry.comms.lastUplink?.summary ? `NLM: ${telemetry.comms.lastUplink.summary}` : "awaiting NLM",
  ].join(" · ");
  const analysisLine = mycaSummary ?? analysis;

  // Minimized — a small brain pill in the same corner; click to restore. (After all hooks — hook-order safe.)
  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(false)}
        title="Restore MYCA Analysis"
        className="psa-glass psa-glass-btn pointer-events-auto absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-500/30 text-cyan-200 hover:border-cyan-400/60"
      >
        <Brain className="h-4 w-4" />
        <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${telemetry.link === "online" ? "bg-green-400" : "bg-slate-600"}`} />
      </button>
    );
  }

  return (
    <div className="psa-glass absolute left-3 top-3 z-20 flex w-60 flex-col gap-2 rounded-xl p-2.5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-cyan-200"><Brain className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-wider text-white">MYCA · Analysis</span></div>
        <div className="flex items-center gap-1.5">
          <StatLED color={telemetry.link === "online" ? "green" : "slate"} pulse={telemetry.link === "online"} />
          <button type="button" onClick={() => setMin(true)} title="Minimize to brain icon" className="flex h-5 w-5 items-center justify-center rounded border border-white/10 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-200">
            <Minus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* dynamic location + weather (updates as the map moves) */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
        <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><MapPin className="h-2.5 w-2.5" /> View · {center ? `${center.lat.toFixed(3)}, ${center.lon.toFixed(3)}` : "—"}</div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div><Thermometer className="mx-auto h-3 w-3 text-amber-300/80" /><div className="font-mono text-[12px] text-white">{n(cur?.temperature_2m) != null ? `${Math.round(cur.temperature_2m)}°` : "—"}</div></div>
          <div><Wind className="mx-auto h-3 w-3 text-sky-300/80" /><div className="font-mono text-[12px] text-white">{n(cur?.wind_speed_10m) != null ? `${Math.round(cur.wind_speed_10m)}` : "—"}<span className="text-[8px] text-slate-500">km/h</span></div></div>
          <div><Droplets className="mx-auto h-3 w-3 text-cyan-300/80" /><div className="font-mono text-[12px] text-white">{n(cur?.relative_humidity_2m) != null ? `${Math.round(cur.relative_humidity_2m)}%` : "—"}</div></div>
        </div>
        <div className="mt-1 text-center text-[10px] text-slate-400">{wmo(cur?.weather_code)}</div>
      </div>

      {/* buoy environmental sensors + sea state */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
        <div className="mb-1 text-[9px] uppercase tracking-wide text-cyan-400/60">{focus} · sensors</div>
        <div className="grid grid-cols-4 gap-1 text-center">
          <div><div className="text-[8px] uppercase text-slate-500">Air</div><div className="font-mono text-[11px] text-slate-200">{a?.temperature != null ? `${a.temperature.toFixed(1)}°` : "—"}</div></div>
          <div><div className="text-[8px] uppercase text-slate-500">RH</div><div className="font-mono text-[11px] text-slate-200">{a?.humidity != null ? `${Math.round(a.humidity)}%` : "—"}</div></div>
          <div><div className="text-[8px] uppercase text-slate-500">IAQ</div><div className="font-mono text-[11px] text-slate-200">{a?.iaq != null ? Math.round(a.iaq) : "—"}</div></div>
          <div><Gauge className="mx-auto h-3 w-3 text-slate-400" /><div className="font-mono text-[10px] text-slate-200">{a?.pressure != null ? Math.round(a.pressure) : "—"}</div></div>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1 text-center">
          <div><div className="text-[8px] uppercase text-slate-500">Depth</div><div className="font-mono text-[11px] text-slate-200">{telemetry.pose.depthM != null ? `${telemetry.pose.depthM.toFixed(1)}m` : "—"}</div></div>
          <div><div className="text-[8px] uppercase text-slate-500">Hdg</div><div className="font-mono text-[11px] text-slate-200">{telemetry.pose.headingDeg != null ? `${Math.round(telemetry.pose.headingDeg)}°` : "—"}</div></div>
          <div><div className="text-[8px] uppercase text-slate-500">Spd</div><div className="font-mono text-[11px] text-slate-200">{telemetry.pose.speedKn != null ? `${telemetry.pose.speedKn.toFixed(1)}kn` : "—"}</div></div>
        </div>
      </div>

      {/* MYCA analysis line */}
      <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] p-2">
        <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><Brain className="h-2.5 w-2.5" /> MYCA read {mycaSummary && <span className="text-cyan-300/50">· live</span>}</div>
        <div className="line-clamp-4 text-[10px] leading-relaxed text-cyan-100/90">{analysisLine}</div>
      </div>

      {/* Eagle Eye — recent captures (per buoy) */}
      <div>
        <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><Camera className="h-2.5 w-2.5" /> Eagle Eye · {focus}</div>
        {telemetry.camera.active ? (
          <div className="flex gap-1 overflow-x-auto">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex h-12 w-16 shrink-0 items-center justify-center rounded border border-cyan-500/20 bg-black/40 text-[8px] uppercase text-slate-500">frame {i + 1}</div>
            ))}
          </div>
        ) : (
          <div className="flex h-12 items-center justify-center rounded border border-dashed border-white/10 bg-black/20 text-[9px] uppercase tracking-wide text-slate-600">
            No captures — awaiting optic / NLM
          </div>
        )}
      </div>

      {/* SINE — what the buoy is HEARING (above vs below water) */}
      <SineWidget detections={sine.detections} live={sine.live} />
    </div>
  );
}
