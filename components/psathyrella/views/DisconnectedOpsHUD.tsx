"use client";

/**
 * DisconnectedOpsHUD — comms-denied situational monitoring overlay.
 * =================================================================
 * A DOM panel (NOT a map layer) for the case the Navy actually cares about: the buoy has
 * ranged offshore and the continuous RF link is gone. It surfaces, at a glance:
 *   - a big CONTACT-STATE badge (LIVE / DELAYED / DARK, from telemetry.contactState)
 *   - time since last contact on any bearer (lastContactMsAgo, humanised)
 *   - next satellite pass countdown (comms.satellite.nextPassEtaS as mm:ss)
 *   - a comms-budget gauge (satellite credits + MO/MT queued — the store-and-forward backlog)
 *   - the active bearer
 *   - active-mission progress (autonomy.activeMissionId + waypoint index)
 *
 * ISOLATION: this is a cheap DOM panel that re-renders on `telemetry`, mounted in MapZone
 * OUTSIDE the memoized map subtree (exactly like MapAnalysisWidget). It NEVER touches the
 * map and is never passed into the React.memo'd MapView — so it cannot regress the freeze.
 *
 * US-customary units (US Navy product). Only shows prominently when contactState !== "live".
 */

import { SatelliteDish, Clock, Radio, Database, Route, AlertTriangle } from "lucide-react";
import { BEARER_PRIORITY, RADIO_LABEL, type BuoyTelemetry } from "@/lib/psathyrella/contract";

// seconds → mm:ss (matches CommsPanel.fmtMMSS)
function fmtMMSS(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// ms → human "Xs / Xm Ys / Xh Ym ago"-style age (compact, no "ago" suffix — caller frames it).
function humanizeAge(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

type StateMeta = { label: string; ledBg: string; ring: string; text: string; chip: string };
const STATE_META: Record<BuoyTelemetry["contactState"], StateMeta> = {
  live: { label: "LIVE", ledBg: "bg-green-400 shadow-[0_0_8px] shadow-green-400/70", ring: "border-green-500/40 bg-green-500/10", text: "text-green-200", chip: "text-green-300/70" },
  delayed: { label: "DELAYED", ledBg: "bg-amber-400 shadow-[0_0_8px] shadow-amber-400/70", ring: "border-amber-500/40 bg-amber-500/10", text: "text-amber-200", chip: "text-amber-300/70" },
  dark: { label: "DARK", ledBg: "bg-red-500 shadow-[0_0_8px] shadow-red-500/70", ring: "border-red-500/50 bg-red-500/10", text: "text-red-200", chip: "text-red-300/70" },
};

export function DisconnectedOpsHUD({ telemetry }: { telemetry: BuoyTelemetry }) {
  const state = telemetry.contactState;
  const meta = STATE_META[state] ?? STATE_META.dark;
  const sat = telemetry.comms.satellite;
  const autonomy = telemetry.autonomy;

  // Active bearer: the satellite bearer (if a pass is up) else the strongest connected RF radio.
  const activeRadio = telemetry.comms.radios
    .filter((r) => r.connected && r.rssiDbm != null)
    .sort((a, b) => (BEARER_PRIORITY[a.kind] - BEARER_PRIORITY[b.kind]) || ((b.rssiDbm ?? -999) - (a.rssiDbm ?? -999)))[0];
  const activeBearer = sat.connected && sat.bearer
    ? RADIO_LABEL[sat.bearer]
    : activeRadio
      ? RADIO_LABEL[activeRadio.kind]
      : "NONE";

  // Comms budget — store-and-forward backlog + remaining SBD credits / data allowance.
  const queuedTotal = sat.mtQueued + sat.moQueued;
  // Credit gauge: arbitrary "low if < 25" framing for the bar; credits is the SBD/data allowance.
  const creditFrac = sat.credits != null ? Math.max(0, Math.min(1, sat.credits / 100)) : null;
  const creditLow = sat.credits != null && sat.credits < 25;

  // Active-mission progress — waypoint index over the autonomy waypoint queue.
  const wps = autonomy.waypoints;
  const activeIdx = autonomy.activeWaypointId != null ? wps.findIndex((w) => w.id === autonomy.activeWaypointId) : -1;
  const missionActive = autonomy.activeMissionId != null;
  const wpLabel = wps.length > 0 && activeIdx >= 0 ? `WP ${activeIdx + 1}/${wps.length}` : wps.length > 0 ? `0/${wps.length}` : "—";

  // Only prominent when the link is degraded; in LIVE state this collapses to a slim status chip.
  if (state === "live") {
    return (
      <div className="psa-glass pointer-events-auto shrink-0 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${meta.ledBg}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-green-200">Link Live</span>
        {sat.bearer && <span className="text-[9px] uppercase tracking-wide text-green-300/60">· sat std-by</span>}
      </div>
    );
  }

  return (
    <div className="psa-glass-strong pointer-events-auto shrink-0 flex w-64 flex-col gap-2 rounded-xl p-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-cyan-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">Comms-Denied Ops</span>
        </div>
      </div>

      {/* big CONTACT-STATE badge */}
      <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${meta.ring}`}>
        <div className="flex items-center gap-2.5">
          <span className={`inline-block h-3 w-3 shrink-0 animate-pulse rounded-full ${meta.ledBg}`} />
          <div className="leading-tight">
            <div className={`font-mono text-lg font-black tracking-wider ${meta.text}`}>{meta.label}</div>
            <div className={`text-[9px] uppercase tracking-wide ${meta.chip}`}>contact state</div>
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="flex items-center justify-end gap-1 text-[9px] uppercase tracking-wide text-slate-400"><Clock className="h-2.5 w-2.5" /> last</div>
          <div className="font-mono text-[13px] tabular-nums text-white">{humanizeAge(telemetry.lastContactMsAgo)}</div>
        </div>
      </div>

      {/* next satellite pass countdown + active bearer */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><SatelliteDish className="h-2.5 w-2.5" /> Next pass</div>
          <div className="font-mono text-[15px] tabular-nums text-white">{sat.connected ? <span className="text-green-300">IN PASS</span> : fmtMMSS(sat.nextPassEtaS)}</div>
          <div className="text-[8px] uppercase tracking-wide text-slate-500">{sat.bearer ? RADIO_LABEL[sat.bearer] : "no sat bearer"}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><Radio className="h-2.5 w-2.5" /> Bearer</div>
          <div className="font-mono text-[15px] tabular-nums text-white">{activeBearer}</div>
          <div className="text-[8px] uppercase tracking-wide text-slate-500">{activeRadio?.rssiDbm != null ? `${activeRadio.rssiDbm} dBm` : sat.connected && sat.rssiDbm != null ? `${sat.rssiDbm} dBm` : "store & fwd"}</div>
        </div>
      </div>

      {/* comms-budget gauge — credits + queued backlog */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><Database className="h-2.5 w-2.5" /> Comms budget</div>
          <div className="font-mono text-[10px] tabular-nums text-slate-300">{sat.credits != null ? `${sat.credits} cr` : "—"}</div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${creditFrac === null ? "bg-slate-700" : creditLow ? "bg-red-500" : "bg-cyan-400"}`}
            style={{ width: `${creditFrac === null ? 18 : creditFrac * 100}%`, opacity: creditFrac === null ? 0.4 : 1 }}
          />
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1 text-center">
          <div><div className="text-[8px] uppercase text-slate-500">MO q</div><div className="font-mono text-[11px] text-slate-200">{sat.moQueued}</div></div>
          <div><div className="text-[8px] uppercase text-slate-500">MT q</div><div className="font-mono text-[11px] text-slate-200">{sat.mtQueued}</div></div>
          <div><div className="text-[8px] uppercase text-slate-500">Total</div><div className={`font-mono text-[11px] ${queuedTotal > 0 ? "text-amber-300" : "text-slate-200"}`}>{queuedTotal}</div></div>
        </div>
      </div>

      {/* active-mission progress */}
      <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] p-2">
        <div className="mb-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60"><Route className="h-2.5 w-2.5" /> Mission</div>
          <div className="font-mono text-[10px] uppercase tracking-wide text-slate-300">{autonomy.mode}</div>
        </div>
        {missionActive ? (
          <div className="flex items-center justify-between">
            <div className="truncate font-mono text-[11px] text-cyan-100">{autonomy.activeMissionId}</div>
            <div className="ml-2 shrink-0 font-mono text-[12px] tabular-nums text-white">{wpLabel}</div>
          </div>
        ) : (
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            no active plan · comms-loss policy <span className="text-slate-300">{autonomy.commsLossPolicy}</span>
          </div>
        )}
      </div>
    </div>
  );
}
