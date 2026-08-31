"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BuoyCommand, BuoyTelemetry, CommandRecord, SelectedDevice } from "@/lib/psathyrella/contract";
import type { SessionRecorderApi } from "@/lib/psathyrella/useSessionRecorder";
import { CommsPanel } from "./CommsPanel";
import { DevicesPanel } from "./DevicesPanel";
import { CommandLedgerPanel } from "./CommandLedgerPanel";
import { SessionRecorderPanel } from "./SessionRecorderPanel";
import { BenchPanel } from "./BenchPanel";
import { EdgeDebugPanel } from "./EdgeDebugPanel";
import { SensorsPanel } from "./SensorsPanel";

const TABS = [
  { key: "comms", label: "Comms" },
  { key: "sensors", label: "Sensors" },
  { key: "devices", label: "Devices" },
  { key: "bench", label: "Bench" },
  { key: "log", label: "Log" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/**
 * Right rail — Comms ⇄ Sensors ⇄ Devices ⇄ Bench ⇄ Log.
 *
 * `Edge` was its own tab; it is edge-service diagnostics — dev-only, and it earned a top-level slot
 * it did not deserve while the buoy's actual SENSORS had no home at all. Edge now lives at the
 * bottom of Log alongside the other diagnostic surfaces, and Sensors takes the slot.
 */
export function RightPanel({
  telemetry,
  sendCommand,
  selected,
  onSelect,
  ledger,
  recorder,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => Promise<boolean> | void;
  selected: SelectedDevice | null;
  onSelect: (s: SelectedDevice | null) => void;
  ledger: CommandRecord[];
  recorder: SessionRecorderApi;
}) {
  const [tab, setTab] = useState<Tab>("comms");
  return (
    <div className="flex h-full flex-col gap-2">
      {/* min-w-0 + truncate on each button: without it `flex-1` cannot shrink a tab below its text
          width, so five tabs overflow the rail and the last one ("Edge") is clipped off-screen on an
          iPad. Tighter padding/tracking at narrow widths keeps all five readable instead of scrolling. */}
      {/* Wraps instead of truncating: five tabs don't fit one row in a narrow rail (iPad), and an
          ellipsised "CO…/DE…" is unreadable. basis-[30%] gives 3+2 when tight, one row when wide. */}
      <div className="psa-glass flex shrink-0 flex-wrap gap-0.5 rounded-lg p-1 sm:gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "psa-glass-btn min-w-0 flex-1 basis-[30%] rounded-md border border-white/10 px-1.5 py-1 text-[10px] font-bold uppercase tracking-tight sm:text-[11px] sm:tracking-wide",
              tab === key ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100" : "text-slate-400 hover:text-slate-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "comms" ? (
          <CommsPanel telemetry={telemetry} sendCommand={sendCommand} />
        ) : tab === "sensors" ? (
          <SensorsPanel telemetry={telemetry} />
        ) : tab === "devices" ? (
          <DevicesPanel telemetry={telemetry} selected={selected} onSelect={onSelect} />
        ) : tab === "log" ? (
          /* Log — command ledger, session recorder, and edge-service diagnostics. All three are
             records of what the system DID rather than what it is sensing, and Edge in particular is
             dev-only, so they share one tab and scroll rather than each holding a rail slot. */
          <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain">
            <div className="min-h-[220px] shrink-0"><CommandLedgerPanel ledger={ledger} /></div>
            <div className="min-h-[220px] shrink-0"><SessionRecorderPanel recorder={recorder} /></div>
            <div className="min-h-[260px] shrink-0">
              <EdgeDebugPanel servedDeviceId={telemetry.deviceId} servedSource={telemetry.source} />
            </div>
          </div>
        ) : (
          <BenchPanel telemetry={telemetry} sendCommand={sendCommand} />
        )}
      </div>
    </div>
  );
}
