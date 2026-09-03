"use client";

/**
 * Shared edge-health probe + pipeline-alert derivation for the Psathyrella GCS.
 *
 * One SWR key (`/api/fusarium/gcs/edge-health`) feeds the Edge debug panel, the pipeline banner,
 * and the Comms panel — SWR dedups the network call, so all three read the same live probe of the
 * MAS relay, the Jetson propulsion agent (:8788), the telemetry hub (:8790), Mushroom 1 (:8787),
 * and OpenClaw.
 *
 * WHY the hub row matters (Jul 09 2026 incident): the Jetson telemetry hub (:8790) crash-looped for
 * ~1.5h. MAS could no longer merge hub pose/radios, so the GCS fell back to the registry SITE
 * position and showed every radio disconnected — which looked like "GPS module dead / radios broken
 * hardware" when it was really a pipeline outage. `derivePipelineAlert()` turns that exact signature
 * into an honest, named banner: hub/publisher path down, NOT hardware. No mock data — offline reads
 * as offline.
 */

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { BuoyTelemetry } from "./contract";

export interface HubHealth {
  up: boolean;
  status: number | null;
  ms: number;
  error: string | null;
  /** Side A (sensors) serial connected. */
  serialConnected: boolean | null;
  /** Side B (LoRa/BLE) serial connected. */
  serialBConnected: boolean | null;
  /** u-blox GPS serial connected. */
  gpsConnected: boolean | null;
  /** Per-transport reachability the hub publishes. */
  transports: { lora?: boolean; ble?: boolean; wifi?: boolean; sim?: boolean } | null;
}

export interface EdgeHealth {
  ts: string;
  targets: { MAS: string; HUB: string; PROPULSION: string; MUSHROOM1: string; OPENCLAW: string | null };
  mas: { up: boolean; status: number | null; ms: number; error: string | null };
  hub: HubHealth;
  candidateDeviceIds: string[];
  propulsion: {
    up: boolean; status: number | null; ms: number; serialConnected: boolean | null; lastError: unknown;
    armed: boolean | null; pwm: string | null; benchSingleMotor: boolean | null; servoMode: string | null;
    deadmanS: number | null; error: string | null;
  };
  mushroom1: { up: boolean; status: number | null; ms: number; error: string | null };
  openclaw: {
    configured: boolean; up: boolean; status: number | null; note?: string; error?: string | null;
    body?: { agent?: string; model?: string; mode?: string; commsMode?: string; armedToActuate?: boolean; status?: string; health?: { ok?: boolean; status?: string }; lastDecision?: { action?: string; reason?: string } };
  };
}

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());

/** Shared SWR handle — same key everywhere, so the aggregator is probed once per 10s regardless of
 *  how many panels mount it. */
export function useEdgeHealth() {
  return useSWR<EdgeHealth>("/api/fusarium/gcs/edge-health", fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
    dedupingInterval: 8000,
  });
}

/**
 * How many CONSECUTIVE failed hub probes before the banner calls it an outage.
 *
 * Two, not one. The dev-PC → Jetson path has a documented first-SYN stall, so a single failed
 * aggregate is genuinely UNKNOWN — and on Aug 03 exactly that painted a full-width "Telemetry hub
 * DOWN — GPS/radios unavailable" banner over a hub answering `/health` in 53 ms. A false outage
 * banner is not a harmless flicker: it teaches the operator to disbelieve the banner, which is the
 * one thing that must stay trustworthy for the real outage. At a 10 s poll a genuine outage is still
 * announced within ~20 s.
 */
export const HUB_DOWN_CONFIRMATIONS = 2;

/**
 * Hub health plus whether a reported down state has been CONFIRMED by consecutive failures.
 *
 * Deliberately does NOT rewrite `hub.up` to true while unconfirmed — that would substitute one
 * false claim for another. It reports the raw state and lets the caller phrase the difference
 * between "not answering, re-checking" and "down".
 */
export function useConfirmedHub(): { hub: HubHealth | null; downConfirmed: boolean } {
  const { data } = useEdgeHealth();
  const hub = data?.hub ?? null;
  const streak = useRef(0);
  const [downConfirmed, setDownConfirmed] = useState(false);

  useEffect(() => {
    if (!hub) return;
    if (hub.up === false) {
      streak.current += 1;
      if (streak.current >= HUB_DOWN_CONFIRMATIONS) setDownConfirmed(true);
    } else {
      streak.current = 0;
      setDownConfirmed(false);
    }
  }, [hub]);

  return { hub, downConfirmed };
}

/** Hub LED semantics used by the Edge panel: green only when up AND both sides + GPS are connected. */
export function hubLedColor(hub: HubHealth | null | undefined): "green" | "amber" | "red" | "slate" {
  if (!hub) return "slate";
  if (!hub.up) return "red";
  // Up but degraded (a side or GPS serial missing) → amber, not a false all-clear.
  if (hub.serialConnected === false || hub.serialBConnected === false || hub.gpsConnected === false) return "amber";
  return "green";
}

export type PipelineAlert = { level: "warn" | "crit"; key: string; message: string };

/**
 * The single source of truth for the degraded-pipeline banner. Returns the highest-priority alert or
 * null. In SIM mode the field pipeline is intentionally bypassed (the Sim watermark already says so),
 * so we never raise a field-pipeline alert. Never auto-switches into SIM to "make it look good".
 */
export function derivePipelineAlert(
  hub: HubHealth | null | undefined,
  telemetry: BuoyTelemetry,
  simMode: boolean,
  opts?: { hubDownConfirmed?: boolean },
): PipelineAlert | null {
  if (simMode) return null;

  // 1. Hub down — the headline failure. GPS + Side-B radios cannot be merged until it recovers.
  if (hub && hub.up === false) {
    // A single missed probe is UNKNOWN, not an outage — see HUB_DOWN_CONFIRMATIONS. Undefined means
    // the caller does not track confirmation, so the original behaviour is preserved for it.
    if (opts?.hubDownConfirmed === false) {
      return {
        level: "warn",
        key: "hub-checking",
        message: "Telemetry hub :8790 not answering — re-checking (a single missed probe is not an outage)",
      };
    }
    return { level: "crit", key: "hub-down", message: "Telemetry hub :8790 DOWN — GPS/radios unavailable until hub recovers (pipeline, not hardware)" };
  }
  // 2. Hub up but the u-blox GPS serial isn't connected.
  if (hub && hub.up && hub.gpsConnected === false) {
    return { level: "warn", key: "gps-serial", message: "Hub up · GPS serial not connected (u-blox) — position may be site fallback" };
  }
  // 3. Hub up but Side B serial down → LoRa/BLE offline at the source.
  if (hub && hub.up && hub.serialBConnected === false) {
    return { level: "warn", key: "side-b", message: "Hub up · Side B disconnected — LoRa/BLE offline" };
  }
  // 4. MAS itself flags the telemetry as simulated while the operator expects live field.
  if (telemetry.simulated) {
    return { level: "warn", key: "mas-sim", message: "SIMULATED telemetry — not live field data" };
  }
  // 5. Registry SITE position + every RF bearer down = the classic fusion/publisher-path outage
  //    signature (works even if the hub probe itself didn't resolve).
  const rfKinds = ["ble", "lora", "wifi", "cellular"] as const;
  const allRfDown = rfKinds.every((k) => {
    const r = telemetry.comms.radios.find((x) => x.kind === k);
    return r ? !r.connected : true;
  });
  if (telemetry.pose.gpsLock === "site" && allRfDown) {
    return { level: "warn", key: "no-fusion", message: "Field RF + GPS not fused — likely hub/publisher path (not hardware)" };
  }
  // 6. Stale telemetry while the link isn't reporting a clean offline — don't keep painting last-good.
  if (telemetry.link !== "offline" && telemetry.lastUpdateMsAgo != null && telemetry.lastUpdateMsAgo > 30_000) {
    return { level: "warn", key: "stale", message: `Telemetry STALE — last field update ${Math.round(telemetry.lastUpdateMsAgo / 1000)}s ago` };
  }
  return null;
}
