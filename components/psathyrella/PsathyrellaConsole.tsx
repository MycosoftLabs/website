"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, ScanLine, Radar, Layers, Map as MapIcon, FlaskConical, X, Navigation, Radio } from "lucide-react";
import { VIEW_MODES, type ViewMode, type Waypoint, PSATHYRELLA_DEVICE_ID } from "@/lib/psathyrella/contract";
import { useBuoyTelemetry } from "@/lib/psathyrella/useBuoyTelemetry";
import { CenterViewport } from "./CenterViewport";
import { NavPropulsionPanel } from "./panels/NavPropulsionPanel";
import { CommsPanel } from "./panels/CommsPanel";
import { StatusBar } from "./panels/StatusBar";
import { StatLED, BottomSheet, type LedColor } from "./ui";

const VIEW_ICON: Record<ViewMode, typeof Camera> = {
  CAMERA: Camera,
  LIDAR: ScanLine,
  RADAR: Radar,
  BLUESIGHT: Layers,
  MAP: MapIcon,
};

const LINK_LED: Record<string, LedColor> = { online: "green", stale: "amber", offline: "red", unknown: "slate" };

export function PsathyrellaConsole() {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const v = new URLSearchParams(window.location.search).get("view")?.toUpperCase();
      if (v && (VIEW_MODES as readonly string[]).includes(v)) return v as ViewMode;
    }
    return "MAP";
  });
  const [simulated, setSimulated] = useState(() => process.env.NEXT_PUBLIC_PSATHYRELLA_SIM === "1");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [sheet, setSheet] = useState<"nav" | "comms" | null>(null);
  const { telemetry, sendCommand, ack } = useBuoyTelemetry({ simulated });

  // Lock page scroll — this is a fixed application controller, not a scrolling page.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { h: html.style.overflow, b: body.style.overflow };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev.h;
      body.style.overflow = prev.b;
    };
  }, []);

  const addWaypoint = (lat: number, lon: number) => {
    const wp: Waypoint = { id: `wp_${Date.now()}_${waypoints.length}`, lat, lon, loiter: "none" };
    setWaypoints((w) => [...w, wp]);
    sendCommand({ domain: "autonomy", action: "addWaypoint", waypoint: wp });
  };
  const clearWaypoints = () => {
    setWaypoints([]);
    sendCommand({ domain: "autonomy", action: "clearWaypoints" });
  };
  const eraseWaypoint = (id: string) => setWaypoints((w) => w.filter((x) => x.id !== id));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#04070e] font-sans text-slate-200">
      {/* SIMULATION watermark + banner */}
      {simulated && (
        <>
          <div className="pointer-events-none absolute inset-0 z-[55] flex items-center justify-center overflow-hidden">
            <span className="-rotate-12 select-none text-[10vw] font-black uppercase tracking-widest text-amber-500/[0.06]">Simulation</span>
          </div>
          <div className="z-[70] flex items-center justify-center gap-2 bg-amber-500/15 py-0.5 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-300">
            <FlaskConical className="h-3.5 w-3.5" /> Simulation — not live data
          </div>
        </>
      )}

      {/* top bar */}
      <header className="z-[70] flex shrink-0 items-center justify-between gap-2 border-b border-cyan-500/15 bg-[#0a0f1e]/95 px-4 py-2">
        <div className="flex items-center gap-2">
          <StatLED color={LINK_LED[telemetry.link] ?? "slate"} pulse={telemetry.link === "online"} />
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Psathyrella</span>
          <span className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:inline">GCS · {PSATHYRELLA_DEVICE_ID}</span>
        </div>

        <nav className="flex items-center gap-1">
          {VIEW_MODES.map((m) => {
            const Icon = VIEW_ICON[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setView(m)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  view === m ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{m}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheet("nav")}
            className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 md:hidden"
            title="Navigation & propulsion"
          >
            <Navigation className="h-3.5 w-3.5" /> Nav
          </button>
          <button
            type="button"
            onClick={() => setSheet("comms")}
            className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 md:hidden"
            title="Comms"
          >
            <Radio className="h-3.5 w-3.5" /> Comms
          </button>
          <button
            type="button"
            onClick={() => setSimulated((s) => !s)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              simulated ? "border-amber-500/60 bg-amber-500/20 text-amber-200" : "border-white/10 text-slate-400 hover:border-amber-500/40"
            }`}
            title="Toggle SIMULATION walkthrough mode (clearly watermarked, never live)"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Sim
          </button>
          <Link href="/natureos" className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/5" title="Exit GCS">
            <X className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* middle: left panel · center viewport · right panel */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 p-2 md:block lg:w-64">
          <NavPropulsionPanel telemetry={telemetry} sendCommand={sendCommand} />
        </aside>

        <main className="relative min-w-0 flex-1 p-2">
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-cyan-500/15">
            <CenterViewport
              view={view}
              telemetry={telemetry}
              waypoints={waypoints}
              onAddWaypoint={addWaypoint}
              onEraseWaypoint={eraseWaypoint}
              onClearWaypoints={clearWaypoints}
            />
          </div>
        </main>

        <aside className="hidden w-60 shrink-0 p-2 md:block lg:w-72">
          <CommsPanel telemetry={telemetry} sendCommand={sendCommand} />
        </aside>
      </div>

      {/* bottom power / telemetry strip */}
      <StatusBar telemetry={telemetry} ack={ack} />

      {/* tablet / portrait: panels as bottom sheets */}
      <BottomSheet open={sheet === "nav"} onClose={() => setSheet(null)} title="Navigation · Propulsion" icon={<Navigation className="h-4 w-4" />}>
        <NavPropulsionPanel telemetry={telemetry} sendCommand={sendCommand} />
      </BottomSheet>
      <BottomSheet open={sheet === "comms"} onClose={() => setSheet(null)} title="Comms · Bridge" icon={<Radio className="h-4 w-4" />}>
        <CommsPanel telemetry={telemetry} sendCommand={sendCommand} />
      </BottomSheet>
    </div>
  );
}

export default PsathyrellaConsole;
