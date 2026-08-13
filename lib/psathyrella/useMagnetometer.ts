"use client";

/**
 * Live BMM150 geomagnetic reading, normalized into `MagnetometerReading`.
 *
 * Backend (`:8794/magnetometer`, proxied by the fusion-sensors BFF) publishes flat scalars:
 *   { hardware, address, calibrated, tiltCompensated, headingDeg, magX_uT, magY_uT, magZ_uT }
 *
 * ══ THE ONE RULE ══════════════════════════════════════════════════════════════════════════════════
 * `magneticBearingDeg` is populated ONLY when the backend reports BOTH `calibrated` and
 * `tiltCompensated`. This hook NEVER derives a bearing from the raw vector, even though atan2 over
 * x/y is trivially available — that value equals a magnetic bearing only when the sensor is perfectly
 * level, which a buoy never is. Bosch's own ±2.5° heading spec is footnoted "a fully calibrated
 * sensor and ideal tilt compensation" (BST-BMM150-DS001-05).
 *
 * The backend already gates `headingDeg` the same way, so this is belt-and-braces: if a future
 * backend regressed and started emitting an uncompensated heading, the flag check here still
 * suppresses it rather than passing a plausible-looking lie to the compass.
 */

import useSWR from "swr";
import type { MagnetometerReading } from "@/lib/psathyrella/contract";

const POLL_MS = 4000;

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

interface Probe {
  status: number;
  body: unknown;
}

const probe = async (url: string): Promise<Probe> => {
  const res = await fetch(url, { cache: "no-store" });
  const body: unknown = await res.json().catch(() => null);
  return { status: res.status, body };
};

export function parseMagnetometer(p: Probe | undefined): MagnetometerReading | null {
  if (!p) return null;
  if (p.status !== 200) {
    return {
      present: false,
      microTesla: null,
      magnitudeUt: null,
      magneticBearingDeg: null,
      calibrated: false,
      tiltCompensated: false,
      status: "sensor service unreachable",
      i2cAddress: null,
    };
  }
  const b = isRecord(p.body) ? p.body : {};

  const x = fin(b.magX_uT);
  const y = fin(b.magY_uT);
  const z = fin(b.magZ_uT);
  const vector = x !== null && y !== null && z !== null ? { x, y, z } : null;

  // "present" is trusted only when a vector actually arrived with it. A backend that says present
  // while publishing nulls has told us about its own state, not the sensor's.
  const present = str(b.hardware) === "present" && vector !== null;

  const calibrated = b.calibrated === true;
  const tiltCompensated = b.tiltCompensated === true;

  return {
    present,
    microTesla: vector,
    magnitudeUt: vector ? Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2) : null,
    // Gated on BOTH flags — see the header. Never computed locally from the vector.
    magneticBearingDeg: calibrated && tiltCompensated ? fin(b.headingDeg) : null,
    calibrated,
    tiltCompensated,
    status: str(b.status) ?? str(b.note) ?? (present ? null : (str(b.hardware) ?? "no reading")),
    i2cAddress: str(b.address),
  };
}

export function useMagnetometer(active = true): {
  magnetometer: MagnetometerReading | null;
  pending: boolean;
} {
  const { data, error } = useSWR<Probe>(
    active ? "/api/psathyrella/fusion-sensors/magnetometer" : null,
    probe,
    {
      refreshInterval: POLL_MS,
      revalidateOnFocus: false,
      dedupingInterval: POLL_MS - 500,
      keepPreviousData: true,
    },
  );

  // A probe that has neither answered nor failed has said NOTHING about the sensor. Reporting
  // "not detected" in that window asserts an absence nobody confirmed.
  const pending = data === undefined && !error;
  return { magnetometer: parseMagnetometer(data), pending };
}
