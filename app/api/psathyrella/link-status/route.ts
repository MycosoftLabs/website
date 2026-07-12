/**
 * GET /api/psathyrella/link-status[?burst=N]
 *
 * Live dual-path link monitor for the buoy Jetson (dual-homed since Jul 09):
 *   Ethernet enP8p1s0 → 192.168.0.123 (metric 100, preferred — MAS/GCS C2 target)
 *   Wi-Fi   wlP1p1s0  → 192.168.0.211 (SSID "Myca", metric 600, backup)
 * Probes BOTH :8788/health endpoints in parallel with per-probe latency; ?burst=N (max 5) runs N
 * sequential probes per link and reports min/median/max — the bench latency-test tool for the
 * Ethernet-unplug → Wi-Fi failover drill. Server-side so the iPad gets it same-origin too.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// Jul 09 final addressing: the buoy's IDENTITY (.123 = C2/MQTT/MAS target) lives on Wi-Fi via
// UniFi reservation (Wi-Fi MAC dc:4a:9e:de:ab:f6 → .123); Ethernet is the bench umbilical at .124.
// Unplugging the cable changes nothing — .123 is already on the radio.
const ETH_URL = process.env.PSATHYRELLA_JETSON_ETH_URL || "http://192.168.0.124:8788";
const WIFI_URL = process.env.PSATHYRELLA_JETSON_WIFI_URL || "http://192.168.0.123:8788";

type Probe = { up: boolean; latencyMs: number | null; rssiDbm?: number | null; linkQuality?: number | null };

async function probe(base: string, withRadioStats = false): Promise<Probe> {
  const t0 = Date.now();
  try {
    // Wi-Fi probes hit /state so one round trip yields reachability + latency + LIVE radio RSSI
    // (the agent reads /proc/net/wireless). 3.5s timeout: this LAN's first packet can stack
    // 2× 1s TCP retransmits — 2.5s produced false DOWNs.
    const res = await fetch(`${base}${withRadioStats ? "/state" : "/health"}`, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    let rssiDbm: number | null = null;
    let linkQuality: number | null = null;
    if (withRadioStats && res.ok) {
      const j = await res.json().catch(() => null);
      rssiDbm = typeof j?.wifi?.signal_dbm === "number" ? j.wifi.signal_dbm : null;
      linkQuality = typeof j?.wifi?.link_quality === "number" ? j.wifi.link_quality : null;
    }
    return { up: res.ok, latencyMs: Date.now() - t0, rssiDbm, linkQuality };
  } catch {
    return { up: false, latencyMs: null, rssiDbm: null, linkQuality: null };
  }
}

async function burstProbe(base: string, n: number, withRadioStats = false) {
  const lat: number[] = [];
  let up = false;
  let rssiDbm: number | null = null;
  let linkQuality: number | null = null;
  for (let i = 0; i < n; i++) {
    const p = await probe(base, withRadioStats);
    if (p.up && p.latencyMs != null) { up = true; lat.push(p.latencyMs); }
    if (p.rssiDbm != null) rssiDbm = p.rssiDbm;
    if (p.linkQuality != null) linkQuality = p.linkQuality;
  }
  lat.sort((a, b) => a - b);
  return {
    up,
    latencyMs: lat.length ? lat[Math.floor(lat.length / 2)] : null, // median
    minMs: lat[0] ?? null,
    maxMs: lat[lat.length - 1] ?? null,
    samples: lat.length,
    rssiDbm,
    linkQuality,
  };
}

export async function GET(req: Request) {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const url = new URL(req.url);
  const burst = Math.min(5, Math.max(1, Number(url.searchParams.get("burst")) || 1));
  const [ethernet, wifi] = await Promise.all(
    burst > 1
      ? [burstProbe(ETH_URL, burst), burstProbe(WIFI_URL, burst, true)]
      : [probe(ETH_URL), probe(WIFI_URL, true)],
  );
  return NextResponse.json({
    at: Date.now(),
    ethernet: { ...ethernet, ip: ETH_URL.replace(/^https?:\/\//, "").replace(/:\d+$/, "") },
    wifi: { ...wifi, ip: WIFI_URL.replace(/^https?:\/\//, "").replace(/:\d+$/, "") },
    // C2 (.123 — MAS/GCS/MQTT target) rides the Wi-Fi interface per the UniFi reservation.
    c2TargetIp: WIFI_URL.replace(/^https?:\/\//, "").replace(/:\d+$/, ""),
  });
}
