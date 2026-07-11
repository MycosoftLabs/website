"use client";

/**
 * Edge / Jetson debug panel — live status of every lane in the Psathyrella control chain, for
 * bench testing. Polls the same-origin /api/psathyrella/edge-health aggregator (so it works over
 * WiFi on the iPad too) and shows MAS, the propulsion agent (:8788), Mushroom 1 / MycoBrain
 * operator lane (:8787), OpenClaw, and — critically — which device IDs MAS actually resolves
 * (surfacing the psathyrella-1 vs psathyrella-buoy-com4 migration state at a glance).
 *
 * Read-only: this panel never actuates anything. Isolated right-rail tab → freeze-safe.
 */

import { RefreshCw, Cpu, Radio, Server, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, SectionLabel, StatLED, type LedColor } from "../ui";
import { useEdgeHealth, hubLedColor } from "@/lib/psathyrella/useEdgeHealth";

function Row({ led, label, detail, sub }: { led: LedColor; label: string; detail: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
      <StatLED color={led} pulse={led === "green"} />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">{label}</span>
      <span className="ml-auto truncate font-mono text-[10px] text-slate-400" title={detail}>{detail}</span>
      {sub ? <span className="shrink-0 font-mono text-[9px] text-slate-600">{sub}</span> : null}
    </div>
  );
}

export function EdgeDebugPanel({ servedDeviceId, servedSource }: { servedDeviceId?: string | null; servedSource?: string | null }) {
  const { data, error, isLoading, mutate } = useEdgeHealth();

  const masLed: LedColor = data?.mas.up ? "green" : "red";
  const hubLed: LedColor = hubLedColor(data?.hub);
  const propLed: LedColor = !data?.propulsion ? "slate" : !data.propulsion.up ? "red" : data.propulsion.pwm === "pca9685" || data.propulsion.serialConnected ? "green" : "amber";
  const m1Led: LedColor = data?.mushroom1.up ? "green" : "red";
  const ocLed: LedColor = !data?.openclaw.configured ? "slate" : data.openclaw.up ? "green" : "red";

  return (
    <Panel
      title="Edge · Jetson · MAS"
      icon={<Cpu className="h-3.5 w-3.5" />}
      right={
        <button type="button" onClick={() => mutate()} title="Refresh now" className="psa-glass-btn rounded border border-white/10 p-1 text-slate-400 hover:text-cyan-200">
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </button>
      }
    >
      {error ? (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-2 py-2 text-[10px] text-red-300">Aggregator unreachable — is the dev server up?</div>
      ) : !data ? (
        <div className="px-2 py-3 text-center text-[10px] uppercase tracking-wide text-slate-500">Probing lanes…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Control chain lanes */}
          <div className="flex flex-col gap-1">
            <Row led={masLed} label="MAS relay" detail={data.mas.up ? `healthy` : `DOWN${data.mas.error ? " · " + data.mas.error : ""}`} sub={`${data.mas.ms}ms`} />
            <Row
              led={hubLed}
              label="Telemetry hub :8790"
              detail={!data.hub.up
                ? `HUB DOWN${data.hub.error ? " · " + data.hub.error : ""}`
                : [
                    `A ${data.hub.serialConnected == null ? "?" : data.hub.serialConnected ? "✓" : "✗"}`,
                    `B ${data.hub.serialBConnected == null ? "?" : data.hub.serialBConnected ? "✓" : "✗"}`,
                    `GPS ${data.hub.gpsConnected == null ? "?" : data.hub.gpsConnected ? "✓" : "✗"}`,
                  ].join(" · ")}
              sub={`${data.hub.ms}ms`}
            />
            <Row
              led={propLed}
              label="Propulsion :8788"
              detail={!data.propulsion.up
                ? "DOWN"
                : [
                    data.propulsion.pwm ?? (data.propulsion.serialConnected ? "serial ✓" : "up"),
                    data.propulsion.armed ? "ARMED" : "safe",
                    data.propulsion.benchSingleMotor ? "bench" : null,
                  ].filter(Boolean).join(" · ")}
              sub={`${data.propulsion.ms}ms`}
            />
            <Row led={m1Led} label="Mushroom 1 :8787" detail={data.mushroom1.up ? "operator UI ✓" : "DOWN"} sub={`${data.mushroom1.ms}ms`} />
            <Row
              led={ocLed}
              label="OpenClaw"
              detail={!data.openclaw.configured ? "not configured" : data.openclaw.up ? `${data.openclaw.body?.health?.status ?? data.openclaw.body?.status ?? "online"}${data.openclaw.body?.mode ? " · " + data.openclaw.body.mode : ""}` : "DOWN"}
              sub={data.openclaw.body?.model ? data.openclaw.body.model.slice(0, 16) : undefined}
            />
          </div>

          {/* Hub-down operator checklist — this is a pipeline outage, NOT a radio/GPS hardware fault. */}
          {!data.hub.up && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-200">
              <div className="mb-1 font-bold uppercase tracking-wide">Hub down → GPS/radios unavailable (pipeline, not hardware)</div>
              <ol className="ml-3.5 list-decimal space-y-0.5 text-red-200/90">
                <li>Confirm Jetson reachable ({data.targets.HUB.replace(/^https?:\/\//, "").replace(/:\d+$/, "")})</li>
                <li>Hub should auto-recover via watchdog in ≤ ~60 s</li>
                <li>If still down after 2 min: ops restarts <span className="font-mono">mycobrain-telemetry-hub.service</span></li>
                <li>Do <span className="font-bold">not</span> reflash Side A/B for this symptom</li>
              </ol>
            </div>
          )}

          {data.propulsion.lastError != null && String(data.propulsion.lastError) !== "null" && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
              Propulsion lastError: {String(data.propulsion.lastError)}
            </div>
          )}

          {data.openclaw.body?.armedToActuate === true && (
            <div className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300">
              ⚠ OpenClaw armed to actuate — edge agent can drive propulsion
            </div>
          )}
          {data.openclaw.body?.lastDecision?.action && (
            <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[10px] text-cyan-200/90">
              OpenClaw: {data.openclaw.body.lastDecision.action}{data.openclaw.body.lastDecision.reason ? ` — ${data.openclaw.body.lastDecision.reason}` : ""}
            </div>
          )}

          {/* Device-ID resolution — resolved client-side against the served telemetry id */}
          <SectionLabel>Device routing</SectionLabel>
          {servedDeviceId ? (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Bot className="h-3 w-3 text-cyan-400" />
              MAS serving <span className="font-mono text-cyan-200">{servedDeviceId}</span>
              {servedSource ? <span className="text-slate-500">· {servedSource}</span> : null}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">Served device id unknown (telemetry not loaded)</div>
          )}
          <div className="flex flex-col gap-1">
            {data.candidateDeviceIds.map((id) => {
              const resolves = servedDeviceId != null && id === servedDeviceId;
              return <Row key={id} led={resolves ? "green" : "red"} label={id} detail={resolves ? "✓ served" : "✗ not served"} />;
            })}
          </div>
          {servedDeviceId && servedDeviceId !== "psathyrella-1" && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
              MAS is serving <span className="font-mono">{servedDeviceId}</span>, not <span className="font-mono">psathyrella-1</span> — for the bench test, commands must target <span className="font-mono">{servedDeviceId}</span> until Cursor registers psathyrella-1 → Jetson :8788 in MAS.
            </div>
          )}

          <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-slate-600">
            <span className="flex items-center gap-1"><Server className="h-2.5 w-2.5" /> {data.targets.MAS.replace(/^https?:\/\//, "")}</span>
            <span className="flex items-center gap-1"><Radio className="h-2.5 w-2.5" /> {data.targets.PROPULSION.replace(/^https?:\/\//, "")}</span>
          </div>
          <div className="text-right text-[8px] text-slate-600">updated {new Date(data.ts).toLocaleTimeString()}</div>
        </div>
      )}
    </Panel>
  );
}
