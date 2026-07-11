"use client";

import "@/lib/psathyrella/domGuard"; // null-safe removeChild — last-line defense vs the MapLibre↔React commit race
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Camera, ScanLine, Radar, Layers, Map as MapIcon, FlaskConical, X, Navigation, Radio, Waves, Route, Moon, Sun, Monitor, Hand } from "lucide-react";
import { VIEW_MODES, type ViewMode, type Waypoint, type SelectedDevice, type MissionPlan, primaryBuoySelection, PSATHYRELLA_DEVICE_ID } from "@/lib/psathyrella/contract";
import { useBuoyTelemetry } from "@/lib/psathyrella/useBuoyTelemetry";
import { useSessionRecorder } from "@/lib/psathyrella/useSessionRecorder";
import { useControlSession } from "@/lib/psathyrella/useControlSession";
import { useDisplayMode } from "@/lib/psathyrella/useDisplayMode";
import { CenterViewport } from "./CenterViewport";
import { SimBootOverlay } from "./views/SimBootOverlay";
import { SafetyBanner } from "./SafetyBanner";
import { PipelineBanner } from "./PipelineBanner";
import { NavPropulsionPanel } from "./panels/NavPropulsionPanel";
import { RightPanel } from "./panels/RightPanel";
import { StatusBar } from "./panels/StatusBar";
import { MissionPlannerPanel } from "./panels/MissionPlannerPanel";
import { StatLED, BottomSheet, type LedColor } from "./ui";

const VIEW_ICON: Record<ViewMode, typeof Camera> = {
  CAMERA: Camera,
  LIDAR: ScanLine,
  RADAR: Radar,
  BLUESIGHT: Layers,
  SONAR: Waves,
  MAP: MapIcon,
};

const LINK_LED: Record<string, LedColor> = { online: "green", stale: "amber", offline: "red", unknown: "slate" };

/**
 * PASSIVE render-error boundary for the console. Catches render/lifecycle faults, shows a brief
 * card, then resets its OWN state so React RE-RENDERS the children (a reconcile — NOT a remount).
 *
 * CRITICAL: this must never force a KEYED remount of the subtree. The subtree contains the
 * MapLibre map, whose DOM MapLibre owns; remounting it makes React's commit-phase walk
 * `commitDeletionEffectsOnFiber` and call `removeChild` on a parent MapLibre already detached →
 * `Cannot read properties of null (reading 'removeChild')`. A global error listener that reacted
 * to that by remounting again created a self-perpetuating freeze LOOP (300 errors/burst). The
 * keep-alive in CenterViewport already prevents the only legitimate map-fiber deletion
 * (view-switch), so a passive reset is all that's needed — no global net, no keyed remount.
 */
class ConsoleErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  state = { errored: false };
  static getDerivedStateFromError() {
    return { errored: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Psathyrella] console render fault contained:", error);
    if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.setState({ errored: false }); }, 400);
  }
  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }
  render() {
    if (this.state.errored) {
      return (
        <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center gap-2 bg-[#04070e] text-slate-300">
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-cyan-400" />
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">Recovering controls…</div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  // The active mission plan, authored in the MissionPlannerPanel and fed to the telemetry hook
  // (sim/executor) + dispatched to the backend as a mission.upload command.
  const [missionPlan, setMissionPlan] = useState<MissionPlan | null>(null);
  const [missionOpen, setMissionOpen] = useState(false);
  // Shared selection: null = the primary buoy (live). A non-buoy device sets a snapshot.
  // Set from a map buoy/device click AND from the Devices/Nodes tab — both feed the StatusBar.
  const [selected, setSelected] = useState<SelectedDevice | null>(null);
  const { telemetry, sendCommand, ack, commandLedger, simBootElapsedMs } = useBuoyTelemetry({ simulated, waypoints, missionPlan });
  const recorder = useSessionRecorder({ telemetry, commandLedger, deviceId: telemetry.deviceId });
  // Ensure an admin session so commands authenticate (else the BFF 401s every command silently).
  const control = useControlSession();
  // Sailor display modes: standard/night/day theme + glove (field) touch targets.
  const display = useDisplayMode();
  const focus = selected ?? primaryBuoySelection(telemetry);
  // Newest-first ledger → the most recent command time feeds the deadman estimate.
  const lastCommandMs = commandLedger[0]?.createdMs ?? null;

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

  // Stable callbacks so the isolated map's React.memo boundary holds across telemetry polls.
  const wpSeq = useRef(0);
  const addWaypoint = useCallback((lat: number, lon: number) => {
    const wp: Waypoint = { id: `wp_${wpSeq.current++}`, lat, lon, loiter: "none" };
    setWaypoints((w) => [...w, wp]);
    sendCommand({ domain: "autonomy", action: "addWaypoint", waypoint: wp });
  }, [sendCommand]);
  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
    sendCommand({ domain: "autonomy", action: "clearWaypoints" });
  }, [sendCommand]);
  const eraseWaypoint = useCallback((id: string) => setWaypoints((w) => w.filter((x) => x.id !== id)), []);

  return (
    <div className={`psa-console fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#04070e] font-sans text-slate-200 ${display.rootClass}`}>
      <ConsoleErrorBoundary>
      {/* SIMULATION indicator — compact corner pill (never covers the map) */}
      {simulated && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[75] flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200 shadow-lg backdrop-blur-sm">
          <FlaskConical className="h-3 w-3" /> Sim
        </div>
      )}

      {/* Persistent safety strip — always-visible ARMED/E-STOP/deadman + hardware alarms + REC. */}
      <SafetyBanner
        telemetry={telemetry}
        sendCommand={sendCommand}
        lastCommandMs={lastCommandMs}
        recording={recorder.recording}
        recStartedMs={recorder.startedMs}
        frameCount={recorder.frameCount}
        onToggleRecord={recorder.toggle}
        controlAuthed={control.authed}
        controlChecking={control.checking}
        controlError={control.error}
        controlMethod={control.method}
      />

      {/* Degraded-pipeline strip — names a telemetry-hub / publisher outage so it never reads as
          "GPS/radios broken hardware". Renders nothing when the field pipeline is healthy or in SIM. */}
      <PipelineBanner telemetry={telemetry} simMode={simulated} />

      {/* top bar */}
      <header className="psa-glass-strong z-[70] flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
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
                className={`psa-glass-btn flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                  view === m ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100" : "border-white/10 text-slate-400 hover:text-slate-100"
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
            onClick={() => setMissionOpen(true)}
            className={`psa-glass-btn flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              missionPlan ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100" : "border-white/10 text-slate-400 hover:border-cyan-500/40"
            }`}
            title={missionPlan ? `Mission: ${missionPlan.name || "unnamed"} — click to edit` : "Plan & upload a mission"}
          >
            <Route className="h-3.5 w-3.5" /> Mission
          </button>
          <button
            type="button"
            onClick={() => setSheet("nav")}
            className="psa-glass-btn flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 md:hidden"
            title="Navigation & propulsion"
          >
            <Navigation className="h-3.5 w-3.5" /> Nav
          </button>
          <button
            type="button"
            onClick={() => setSheet("comms")}
            className="psa-glass-btn flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 md:hidden"
            title="Comms"
          >
            <Radio className="h-3.5 w-3.5" /> Comms
          </button>
          {/* Display mode: standard → night (red bridge-watch) → day (sunlight) */}
          <button
            type="button"
            onClick={display.cycleTheme}
            className={`psa-glass-btn flex items-center rounded-md border p-1.5 ${
              display.theme !== "standard" ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-slate-400 hover:border-cyan-500/40"
            }`}
            title={`Display: ${display.theme.toUpperCase()} — click to cycle standard → night → day`}
          >
            {display.theme === "night" ? <Moon className="h-3.5 w-3.5" /> : display.theme === "day" ? <Sun className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
          </button>
          {/* Glove / field mode: enlarge primary touch targets (never shrinks anything) */}
          <button
            type="button"
            onClick={display.toggleField}
            className={`psa-glass-btn flex items-center rounded-md border p-1.5 ${
              display.field ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-slate-400 hover:border-cyan-500/40"
            }`}
            title={display.field ? "Glove mode ON — large touch targets" : "Glove mode — enlarge touch targets for gloved/field use"}
          >
            <Hand className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSimulated((s) => !s)}
            className={`psa-glass-btn flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              simulated ? "border-amber-500/60 bg-amber-500/20 text-amber-200" : "border-white/10 text-slate-400 hover:border-amber-500/40"
            }`}
            title="Toggle SIMULATION walkthrough mode (clearly watermarked, never live)"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Sim
          </button>
          <Link href="/natureos" className="psa-glass-btn rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-slate-100" title="Exit GCS">
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
              sendCommand={sendCommand}
              waypoints={waypoints}
              onAddWaypoint={addWaypoint}
              onEraseWaypoint={eraseWaypoint}
              onClearWaypoints={clearWaypoints}
              selected={selected}
              onSelect={setSelected}
            />
            {/* SIM vessel-startup sequence — plays on SIM enable, lingers 2.5s after complete */}
            {simulated && simBootElapsedMs != null && simBootElapsedMs < 5400 + 2500 && (
              <SimBootOverlay elapsedMs={simBootElapsedMs} />
            )}
          </div>
        </main>

        <aside className="hidden w-60 shrink-0 p-2 md:block lg:w-72">
          <RightPanel telemetry={telemetry} sendCommand={sendCommand} selected={selected} onSelect={setSelected} ledger={commandLedger} recorder={recorder} />
        </aside>
      </div>

      {/* bottom strip — centered, dynamic to the selected buoy / device */}
      <StatusBar focus={focus} telemetry={telemetry} ack={ack} />

      {/* tablet / portrait: panels as bottom sheets */}
      <BottomSheet open={sheet === "nav"} onClose={() => setSheet(null)} title="Navigation · Propulsion" icon={<Navigation className="h-4 w-4" />}>
        <NavPropulsionPanel telemetry={telemetry} sendCommand={sendCommand} />
      </BottomSheet>
      <BottomSheet open={sheet === "comms"} onClose={() => setSheet(null)} title="Comms · Devices" icon={<Radio className="h-4 w-4" />}>
        <RightPanel telemetry={telemetry} sendCommand={sendCommand} selected={selected} onSelect={setSelected} ledger={commandLedger} recorder={recorder} />
      </BottomSheet>

      {/* Mission planner — additive modal overlay; authors a MissionPlan, uploads it as a command. */}
      <MissionPlannerPanel
        open={missionOpen}
        onClose={() => setMissionOpen(false)}
        initial={missionPlan}
        onUpload={(plan) => {
          setMissionPlan(plan);
          void sendCommand({ domain: "mission", action: "upload", plan });
        }}
      />
      </ConsoleErrorBoundary>
    </div>
  );
}

export default PsathyrellaConsole;
