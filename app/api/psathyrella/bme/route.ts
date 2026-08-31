/**
 * GET /api/psathyrella/bme — live BME688 environmental readings from the Jetson telemetry hub.
 *
 * ══ WHY THIS EXISTS ═══════════════════════════════════════════════════════════════════════════════
 * The GCS read `/api/mycobrain/COM4/sensors`, which proxies `MYCOBRAIN_SERVICE_URL` — the
 * Windows-local serial daemon on :8003. That daemon has not seen the MycoBrain since it moved onto
 * the Jetson. Verified Aug 03: it answers `{"devices":[],"count":0}`, 404s `/devices/mycobrain-COM4`,
 * and the GCS route returns "MycoBrain service not available or device not connected".
 *
 * Meanwhile the hub on :8790 has been publishing the real readings the whole time — 25.5 °C,
 * 48.9 %RH, 648 hPa, IAQ 50, eCO₂ 502 ppm. So the environmental panel showed STANDBY while a healthy,
 * calibrating BME688 streamed. On screen that was indistinguishable from "no sensor fitted", which is
 * exactly the failure mode this console exists to avoid: a dead FEED reading as absent HARDWARE.
 *
 * Emits this route's original `{ sensors: { bme688_1, bme688_2 }, timestamp }` shape so nothing
 * downstream needs to change — `mapBme` in useBuoyTelemetry consumes it unmodified.
 *
 * `timestamp` is the READING's own wall-clock time (the hub's last heartbeat), NOT `Date.now()`.
 * That matters: StatusBar watermarks telemetry older than 30 s, and stamping it with our own clock
 * would make a frozen hub frame look perpetually fresh — the watermark would never fire on the one
 * failure it was built to catch.
 *
 * ⚠ Side B publishes a transport-status frame only, not a BME field, so `bme688_2` stays null.
 * `serialBConnected: true` means the Side B serial LINK is up — it does NOT mean a BME688 B exists.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const HUB = process.env.PSATHYRELLA_TELEMETRY_HUB_URL || "http://192.168.0.123:8790";

/**
 * probeFresh is mandatory on this LAN: the dev-PC → Jetson path intermittently stalls on connection
 * setup, and a stalled socket never recovers — so the fix is a NEW connection, not a longer wait.
 * Measured: a healthy hub answers `/status` in ~12 ms, so 2500 ms is ~200× headroom per attempt.
 */
const ATTEMPT_MS = 2500;
const ATTEMPTS = 3;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  let body: unknown = null;
  for (let i = 0; i < ATTEMPTS && body === null; i++) {
    try {
      const res = await fetch(`${HUB}/status`, {
        signal: AbortSignal.timeout(ATTEMPT_MS),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.ok) body = await res.json();
    } catch {
      /* stall → retry on a fresh connection */
    }
  }

  if (!isRecord(body)) {
    // Unreachable is NOT "no sensor". Say which it is, so the panel can render the difference.
    return NextResponse.json(
      { sensors: null, timestamp: null, error: "telemetry_hub_unreachable", hub: HUB },
      { status: 502 },
    );
  }

  const r = isRecord(body.lastSensorReading) ? body.lastSensorReading : null;
  if (!r) {
    return NextResponse.json({ sensors: {}, timestamp: str(body.lastHeartbeat), note: "hub up, no sensor frame yet" });
  }

  /*
   * `*_comp` are the BSEC-compensated outputs and are the ones to report — the raw `ambient_*` values
   * are pre-compensation and read differently. Falls back to raw only if compensation is absent, so a
   * partially-initialised BSEC still yields a temperature rather than a null.
   */
  const bme688_1 = {
    temperature: num(r.temperature_c_comp) ?? num(r.ambient_temperature_c),
    humidity: num(r.humidity_pct_comp) ?? num(r.ambient_humidity_pct),
    pressure: num(r.pressure_hpa),
    gas_resistance: num(r.gas_resistance_ohm_comp) ?? num(r.gas_resistance_ohm),
    iaq: num(r.iaq),
    // Accuracy 0 means BSEC is still calibrating and the IAQ number is not yet meaningful. Passed
    // through so the UI can say so rather than presenting an uncalibrated index as a reading.
    iaq_accuracy: num(r.iaq_accuracy),
    co2_equivalent: num(r.eco2_ppm),
    voc_equivalent: num(r.bvoc_ppm),
    present: r.present !== false,
    address: str(r.address),
    label: str(r.sensor_slot) ?? "Side A",
  };

  return NextResponse.json({
    sensors: { bme688_1, bme688_2: null },
    // The READING's clock, not ours — see the header note on the stale watermark.
    timestamp: str(body.lastHeartbeat) ?? str(r.ts),
    source: "telemetry-hub",
    fwVersion: str(r.fw_version),
  });
}
