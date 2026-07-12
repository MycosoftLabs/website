/**
 * GET /api/psathyrella/edge-health
 *
 * Bench-test debug aggregator: server-side (so the iPad hits it same-origin) health probe of every
 * lane in the Psathyrella control chain — MAS relay, the Jetson propulsion agent (:8788), the
 * Mushroom 1 / MycoBrain operator lane (:8787), and the OpenClaw edge-autonomy gateway. Read-only:
 * it only GETs /health-style endpoints, never actuates. Feeds the GCS Edge debug panel.
 *
 * All targets are env-overridable; defaults match the confirmed live bench topology (Jul 03 2026).
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const MAS = process.env.MAS_API_URL || "http://192.168.0.188:8001";
// Jetson telemetry hub (:8790) — merges Side A sensors + Side B LoRa/BLE + u-blox GPS + SIM7600 and
// publishes to MAS. When it's down, MAS falls back to registry site pose + all-radios-disconnected,
// which the GCS must NOT misread as "GPS/radios broken hardware". Probed here so the Edge panel and
// pipeline banner can name it (incident Jul 09 2026).
const HUB = process.env.PSATHYRELLA_TELEMETRY_HUB_URL || "http://192.168.0.123:8790";
const PROPULSION = process.env.PSATHYRELLA_JETSON_PROPULSION_URL || "http://192.168.0.123:8788";
const MUSHROOM1 = process.env.PSATHYRELLA_MUSHROOM1_URL || "http://192.168.0.123:8787";
// Device ids to resolve against MAS so the panel shows the migration state at a glance.
const DEVICE_IDS = (process.env.PSATHYRELLA_DEVICE_IDS || "psathyrella-1,psathyrella-buoy-com4")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OC_DEVICE = DEVICE_IDS[0] || "psathyrella-1";
// OpenClaw status: prefer the MAS route Cursor verified end-to-end; allow a direct-gateway override.
const OPENCLAW = process.env.PSATHYRELLA_OPENCLAW_STATUS_URL || `${MAS}/api/psathyrella/${OC_DEVICE}/openclaw/status`;

async function probe(url: string, opts: { method?: string; timeoutMs?: number } = {}): Promise<{ up: boolean; status: number | null; body: unknown; ms: number; error?: string }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 4000),
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = text ? JSON.parse(text) : {}; } catch { body = text.slice(0, 200); }
    return { up: res.ok, status: res.status, body, ms: Date.now() - t0 };
  } catch (err) {
    return { up: false, status: null, body: null, ms: Date.now() - t0, error: (err as Error).message };
  }
}

/**
 * Retry-fresh probe — for lanes behind the dev-PC → Jetson (.123) Node first-SYN stall: a fresh
 * connection intermittently hangs multi-second even though the service answers in ~8ms directly, so
 * a longer timeout won't help (the stalled connection stays stalled). A short per-attempt timeout +
 * a brand-new connection recovers immediately. Returns the first success, else the last failure — so
 * a GENUINE outage (the whole point of the hub probe) still resolves as down within attempts×timeout.
 */
async function probeFresh(url: string, attempts: number, timeoutMs: number) {
  let last = await probe(url, { timeoutMs });
  for (let i = 1; i < attempts && !last.up; i++) last = await probe(url, { timeoutMs });
  return last;
}

export async function GET() {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  // Keep the probe set small + fast (4 lightweight health lanes). We deliberately DON'T re-probe
  // MAS /telemetry here — it runs a slow live field query that times out under parallel load, and
  // the GCS client already knows the served deviceId/source from useBuoyTelemetry. Device-id
  // resolution is computed client-side in the panel against the known served id.
  const [masHealth, hub, propulsion, mushroom1, openclaw] = await Promise.all([
    probe(`${MAS}/health`, { timeoutMs: 5000 }),
    // Telemetry hub — down = pipeline outage. 3 fresh attempts @3.5s: a healthy hub answers on the
    // first (~8ms), a dev-PC first-SYN stall is caught by a fresh retry, and a real outage still
    // resolves down in ≤10.5s. Prevents a FALSE "hub down" banner flickering during bench tests.
    probeFresh(`${HUB}/health`, 3, 3500),
    probe(`${PROPULSION}/health`, { timeoutMs: 5000 }),
    probe(`${MUSHROOM1}/`, { timeoutMs: 8000 }), // operator UI root — slow HTML render
    probe(OPENCLAW, { timeoutMs: 8000 }), // MAS-verified openclaw/status route (~2s live query, spikes under load)
  ]);

  // Hub /health (field-healthy) reports: serialConnected (Side A) + serialBConnected (Side B) +
  // gpsConnected (u-blox) true, and transports.{lora,ble,wifi,sim} true. Parse defensively.
  const hubBody = hub.body as { serialConnected?: boolean; serialBConnected?: boolean; gpsConnected?: boolean; transports?: { lora?: boolean; ble?: boolean; wifi?: boolean; sim?: boolean } } | null;

  return NextResponse.json({
    ts: new Date().toISOString(),
    targets: { MAS, HUB, PROPULSION, MUSHROOM1, OPENCLAW: OPENCLAW || null },
    mas: { up: masHealth.up, status: masHealth.status, ms: masHealth.ms, error: masHealth.error ?? null },
    hub: {
      up: hub.up,
      status: hub.status,
      ms: hub.ms,
      error: hub.error ?? null,
      serialConnected: hubBody?.serialConnected ?? null,
      serialBConnected: hubBody?.serialBConnected ?? null,
      gpsConnected: hubBody?.gpsConnected ?? null,
      transports: hubBody?.transports ?? null,
    },
    // Candidate device ids the panel resolves client-side against the served telemetry deviceId.
    candidateDeviceIds: DEVICE_IDS,
    propulsion: {
      up: propulsion.up,
      status: propulsion.status,
      ms: propulsion.ms,
      // jetson_agent.py health: { status, service, armed, pwm:"pca9685"|"mock", thrusters, servo_mode,
      // bench_single_motor, deadman_s }. (An earlier serial variant reported { serialConnected, lastError } — support both.)
      armed: (propulsion.body as { armed?: boolean } | null)?.armed ?? null,
      pwm: (propulsion.body as { pwm?: string } | null)?.pwm ?? null,
      benchSingleMotor: (propulsion.body as { bench_single_motor?: boolean } | null)?.bench_single_motor ?? null,
      servoMode: (propulsion.body as { servo_mode?: string } | null)?.servo_mode ?? null,
      deadmanS: (propulsion.body as { deadman_s?: number } | null)?.deadman_s ?? null,
      serialConnected: (propulsion.body as { serialConnected?: boolean } | null)?.serialConnected ?? null,
      lastError: (propulsion.body as { lastError?: unknown } | null)?.lastError ?? null,
      body: propulsion.body,
      error: propulsion.error ?? null,
    },
    mushroom1: { up: mushroom1.up || mushroom1.status === 200, status: mushroom1.status, ms: mushroom1.ms, error: mushroom1.error ?? null },
    openclaw: { configured: true, up: openclaw.up, status: openclaw.status, ms: openclaw.ms, body: openclaw.body, error: openclaw.error ?? null },
  });
}
