/**
 * GET /api/psathyrella/agent-state
 *
 * Same-origin proxy to the Jetson propulsion agent's /state (so the iPad hits it too). Surfaces the
 * live per-channel servo stop trim + current channel pulses so the Raw Channel tester can center its
 * spin/STOP/spin presets on each channel's ACTUAL neutral (e.g. CH4 = 1700µs after calibration)
 * instead of a hardcoded 1500. Read-only.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const PROPULSION = process.env.PSATHYRELLA_JETSON_PROPULSION_URL || "http://192.168.0.123:8788";

export async function GET() {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  try {
    const res = await fetch(`${PROPULSION}/state`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ up: false, status: res.status });
    const body = (await res.json()) as {
      armed?: boolean;
      esc_neutral_us?: number;
      esc_neutral_us_by_channel?: Record<string, number>;
      servo_stop_us_by_channel?: Record<string, number>;
      channels?: { esc?: number[]; servo?: number[] };
      pwm?: { servo_stop_us_by_channel?: Record<string, number>; channels_us?: Record<string, number> };
    };
    return NextResponse.json({
      up: true,
      armed: body?.armed ?? null,
      escNeutralUs: typeof body?.esc_neutral_us === "number" ? body.esc_neutral_us : null,
      // Per-ESC-channel neutral trims (Cursor P1) — override the single neutral when present.
      escNeutralByChannel: body?.esc_neutral_us_by_channel ?? {},
      escChannels: Array.isArray(body?.channels?.esc) ? body!.channels!.esc : null,
      servoChannels: Array.isArray(body?.channels?.servo) ? body!.channels!.servo : null,
      servoStopByChannel: body?.servo_stop_us_by_channel ?? body?.pwm?.servo_stop_us_by_channel ?? {},
      channelsUs: body?.pwm?.channels_us ?? {},
    });
  } catch (err) {
    return NextResponse.json({ up: false, error: (err as Error).message });
  }
}
