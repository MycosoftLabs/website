"use client";

/**
 * WifiSensePanel — the operator-facing readout for the buoy's passive WiFi-sense.
 *
 * WHAT THIS REPLACED, AND WHY. The previous surface drew an animated walking human skeleton from a
 * `simSubject()` function, badged "sim", under the title "DensePose (through-wall)". A demo human
 * figure on a Navy operator console is unacceptable even when badged: at a glance it is a contact,
 * and a badge is not a defence against a shape that reads as a person on the deck. It is also not a
 * placeholder for anything, because pose-from-WiFi is not achievable on this platform — no working
 * implementation exists (the published paper shipped no code or weights; the popular substitute repo
 * was audited and found to emit random arrays), the published rig is two fixed mains-powered 3x3
 * routers in a surveyed indoor room, and CSI sensing depends on rich indoor multipath that open water
 * does not provide. So there is no skeleton here, and there is no mode that draws one.
 *
 * WHAT IS RENDERED: only what the backend actually reports — the radios it heard, their measured
 * RSSI, when it first and last heard them, its own capability label, and a disturbance state if it
 * has one. Every field is nullable because the backend genuinely omits most of them, and an absent
 * field renders as an em-dash, never as a plausible default.
 *
 * THE ONE RULE THAT MATTERS MOST HERE: an empty list must never read as an all-clear. "Unreachable",
 * "pipeline off" and "heard nothing" are three different facts and this panel states which one it is,
 * because on a security surface a silent failure that looks like quiet water is the worst outcome.
 *
 * Presentational only — no fetching. `useWifiSense` owns the polling.
 */

import { type JSX, type ReactNode } from "react";
import { Activity, AlertTriangle, Compass, Radio, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WifiSenseDevice, WifiSenseState } from "@/lib/psathyrella/useWifiSense";

/**
 * What each capability the backend may declare can and cannot do. The operator has to know which
 * tier is running, because "we heard 4 radios" and "the channel was disturbed" are different claims
 * with different failure modes, and neither of them is a person count.
 */
const CAPABILITY_HELP: Record<string, string> = {
  presence:
    "802.11 probe-request / management-frame capture: counts RADIOS in range and their RSSI trend. No direction, no identity, no people count.",
  "rssi-motion":
    "RSSI variance on a link only: one scalar per link, so gross disturbance at best. No breathing, no still-presence, no direction, no count. Weather, antenna sway and sea state all trip it.",
  csi: "Channel-state disturbance against a calibrated baseline: motion only, over a short fixed path. No localization, no identity, no pose. Hull vibration and sea state produce false positives.",
};

/** Below this the RSSI bar is styled as a weak return. Presentation only — not a backend threshold. */
const WEAK_RSSI_DBM = -80;

/** Display-scale ends for the RSSI bar. These are chart axes, not sensitivity limits. */
const RSSI_FLOOR_DBM = -100;
const RSSI_CEIL_DBM = -30;

/** The single rendering of "the backend did not report this". Never a substitute value. */
function NotReported(): JSX.Element {
  return (
    <span className="italic text-slate-500/80" title="Not reported by the backend — no default is being shown" aria-label="not reported">
      &mdash;
    </span>
  );
}

function relAge(fromMs: number, nowMs: number): string {
  const d = Math.max(0, nowMs - fromMs);
  if (d < 1000) return "just now";
  if (d < 60000) return `${Math.round(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}

/**
 * The RSSI bar maps dBm onto a fixed display axis. The dBm itself is printed beside it so the
 * operator reads the measurement, not the bar — the bar is only a scan aid.
 */
function RssiBar({ dBm }: { dBm: number | null }): JSX.Element {
  if (dBm === null) {
    return (
      <div className="h-1.5 flex-1 rounded-full bg-white/5" title="No RSSI reported for this radio — no bar is drawn rather than a guessed level" />
    );
  }
  const pct = Math.max(3, Math.min(100, ((dBm - RSSI_FLOOR_DBM) / (RSSI_CEIL_DBM - RSSI_FLOOR_DBM)) * 100));
  const weak = dBm < WEAK_RSSI_DBM;
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5" title={`${dBm} dBm on a ${RSSI_FLOOR_DBM}…${RSSI_CEIL_DBM} dBm display scale`}>
      <div
        className={cn("h-full rounded-full", weak ? "bg-slate-500/70" : "bg-gradient-to-r from-cyan-600/70 to-cyan-300")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DeviceRow({ device, nowMs }: { device: WifiSenseDevice; nowMs: number }): JSX.Element {
  return (
    <li className="border-b border-white/5 py-1 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-200" title={device.id}>
          {device.id}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-slate-400" title={device.rssiDbm === null ? "No RSSI reported for this radio" : "Receive strength as the radio reported it"}>
          {device.rssiDbm !== null ? `${device.rssiDbm} dBm` : <NotReported />}
        </span>
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        <RssiBar dBm={device.rssiDbm} />
        <span
          className="w-24 shrink-0 truncate text-right text-[9px] text-slate-500"
          title={device.vendor ? "OUI vendor guess — meaningless when the MAC is randomized" : "No vendor reported (a randomized MAC has no resolvable OUI)"}
        >
          {device.vendor ?? <NotReported />}
        </span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[8.5px] text-slate-500">
        <span title="When this radio was first heard in the current window">
          first {device.firstSeenMs !== null ? relAge(device.firstSeenMs, nowMs) : <NotReported />}
        </span>
        <span title="When this radio was last heard">
          last {device.lastSeenMs !== null ? relAge(device.lastSeenMs, nowMs) : <NotReported />}
        </span>

        {/* Bearing and range render ONLY when the backend measured them. Nothing on this console
            derives a direction or a distance from signal strength: a single omni antenna cannot
            produce a bearing, and RSSI-to-range is non-metric over water. Today's backend reports
            neither, so neither chip appears — that is the correct empty state, not a gap to fill. */}
        {device.bearingDeg !== null && (
          <span
            className="flex items-center gap-0.5 text-cyan-300/80"
            title={device.bearingMethod ? `Bearing measured by: ${device.bearingMethod}` : "Backend reported a bearing but not how it was measured"}
          >
            <Compass className="h-2.5 w-2.5" />
            {Math.round(device.bearingDeg)}&deg;
            <span className="text-slate-500">{device.bearingMethod ?? "method —"}</span>
          </span>
        )}
        {device.rangeEstimateM !== null && (
          <span
            className="text-amber-300/80"
            title="Backend-computed estimate. Range from RF over water is not a reliable distance — sea-surface reflection, multipath fading and antenna orientation all break it. Treat as an order of magnitude."
          >
            ~{Math.round(device.rangeEstimateM)} m est.
          </span>
        )}
      </div>
    </li>
  );
}

function Banner({ tone, icon, title, children }: { tone: "amber" | "slate"; icon: ReactNode; title: string; children: ReactNode }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded border px-2 py-1.5",
        tone === "amber" ? "border-amber-500/30 bg-amber-500/10" : "border-cyan-500/20 bg-cyan-500/5",
      )}
    >
      <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", tone === "amber" ? "text-amber-300" : "text-cyan-200")}>
        {icon}
        {title}
      </div>
      <p className="mt-0.5 text-[9px] leading-[1.35] text-slate-400">{children}</p>
    </div>
  );
}

export default function WifiSensePanel({ state, className }: { state: WifiSenseState; className?: string }): JSX.Element {
  const { devices, motion, capability, connected, enabled, lastMs, note } = state;
  // Ages are computed once per render. The hook re-renders this panel every poll, so they stay live
  // without a second timer competing with the video surfaces for frame budget.
  const nowMs = Date.now();
  const capabilityHelp = capability !== null ? CAPABILITY_HELP[capability] : undefined;

  return (
    <div className={cn("flex h-full w-full flex-col overflow-hidden bg-[#040a12]", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cyan-500/10 px-2 py-1">
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 text-amber-300" />}
          WiFi-sense
        </span>
        {/* Truncates rather than shoving the title out: in a quarter tile "capability unreported" is
            wider than the header, and the full text stays in the tooltip either way. */}
        <span
          className={cn(
            "min-w-0 truncate rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide",
            capability !== null ? "bg-cyan-500/15 text-cyan-300" : "bg-slate-500/15 text-slate-400",
          )}
          title={
            capabilityHelp ??
            (capability !== null
              ? "The backend named this capability but this console has no description for it."
              : "The backend did not declare a capability — so what this sensor can do right now is unknown, and nothing is assumed.")
          }
        >
          {capability ?? "capability unreported"}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {/* Three different facts, never collapsed into one empty list. */}
        {!connected ? (
          <Banner tone="amber" icon={<AlertTriangle className="h-3 w-3" />} title="Sensor unreachable">
            No reading is being taken. This is a link or pipeline failure &mdash; it is <span className="font-bold text-amber-200">not</span> a
            report that nothing is present.
          </Banner>
        ) : !enabled ? (
          <Banner tone="amber" icon={<AlertTriangle className="h-3 w-3" />} title="Pipeline off">
            MINDEX answered but reports WiFi-sense disabled, so nothing is listening. An empty list below carries no
            information about what is around the buoy.
          </Banner>
        ) : devices.length === 0 ? (
          <Banner tone="slate" icon={<Radio className="h-3 w-3" />} title="No radios heard">
            The pipeline is live and reported zero radios in its window. On open water that is a plausible real result,
            not a fault &mdash; but note that a radio only appears if it transmits.
          </Banner>
        ) : null}

        {devices.length > 0 && (
          <div>
            <div className="mb-0.5 flex items-baseline justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400/60">Radios heard</span>
              <span className="font-mono text-[9px] text-slate-400" title="Count of distinct radio identities the backend reported — not a count of people or vessels">
                {devices.length}
              </span>
            </div>
            <ul className="m-0 list-none p-0">
              {/* Keyed with the index too: a backend that repeats a MAC is an anomaly worth SEEING as
                  two rows, not a duplicate-key collision that drops one of them silently. */}
              {devices.map((d, i) => (
                <DeviceRow key={`${d.id}-${i}`} device={d} nowMs={nowMs} />
              ))}
            </ul>
          </div>
        )}

        {/* Motion is shown only when the backend reports a decision. Null is UNKNOWN, and unknown is
            printed as unknown — never as a quiet "no motion", which during an events-feed outage would
            be a fabricated all-clear. */}
        <div className="flex items-center justify-between gap-2 rounded border border-white/5 px-1.5 py-1">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/60">
            <Activity className="h-2.5 w-2.5" /> Disturbance
          </span>
          {motion === null ? (
            <span className="text-[9px] text-slate-500" title="The backend reported no motion decision this poll. Unknown is not the same as 'nothing moved'.">
              not reported
            </span>
          ) : (
            <span className={cn("font-mono text-[9px]", motion.detected ? "text-amber-300" : "text-slate-300")}>
              {motion.detected ? "motion" : "quiet"}
              <span className="ml-1 text-slate-500" title={motion.confidence === null ? "The backend sent no confidence score — variance is not a confidence and is not promoted into one" : "Backend-reported confidence"}>
                {motion.confidence !== null ? `${Math.round(motion.confidence * 100)}%` : "conf —"}
              </span>
            </span>
          )}
        </div>

        {note !== null && <p className="text-[8.5px] leading-[1.35] text-slate-500">{note}</p>}
      </div>

      <div className="shrink-0 border-t border-cyan-500/10 px-2 py-1">
        <p className="text-[8px] leading-[1.35] text-slate-500">
          Passive RF only. A row is a <span className="font-bold text-slate-400">radio</span>, not a person &mdash; MAC
          randomization has been on by default since ~2020, one person carries 1&ndash;3 radios and a vessel carries
          many, so this cannot be read as a count of people.{" "}
          <span className="font-bold text-slate-400">No body pose:</span> pose-from-WiFi has no working implementation,
          needs a fixed multi-antenna indoor rig, and depends on multipath open water does not provide &mdash; the tower
          cameras are this platform&rsquo;s person-detection sensor.
          {lastMs !== null && <> Last successful read {relAge(lastMs, nowMs)}.</>}
        </p>
      </div>
    </div>
  );
}
