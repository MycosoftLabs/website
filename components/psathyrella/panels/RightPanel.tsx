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

const TABS = [
  { key: "comms", label: "Comms" },
  { key: "devices", label: "Devices" },
  { key: "log", label: "Log" },
  { key: "bench", label: "Bench" },
  { key: "edge", label: "Edge" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/** Right rail — 5 tabs max: Comms ⇄ Devices ⇄ Log (ledger+recorder) ⇄ Bench (diagnostics) ⇄ Edge. */
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
      <div className="psa-glass flex shrink-0 gap-1 rounded-lg p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "psa-glass-btn flex-1 rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
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
        ) : tab === "devices" ? (
          <DevicesPanel telemetry={telemetry} selected={selected} onSelect={onSelect} />
        ) : tab === "log" ? (
          /* Combined Log — command ledger (top half) + session recorder (bottom half) */
          <div className="flex h-full flex-col gap-2">
            <div className="min-h-0 flex-1"><CommandLedgerPanel ledger={ledger} /></div>
            <div className="min-h-0 flex-1"><SessionRecorderPanel recorder={recorder} /></div>
          </div>
        ) : tab === "bench" ? (
          <BenchPanel telemetry={telemetry} sendCommand={sendCommand} />
        ) : (
          <EdgeDebugPanel servedDeviceId={telemetry.deviceId} servedSource={telemetry.source} />
        )}
      </div>
    </div>
  );
}
