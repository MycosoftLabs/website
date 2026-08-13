"use client";

/**
 * SENSORS rail tab — every physical sensor on the buoy, and what it is actually reporting right now.
 *
 * Replaces the EDGE tab (moved into Log, which is where dev-only diagnostics belong).
 *
 * ══ THE DISTINCTION THIS PANEL EXISTS TO MAKE ═════════════════════════════════════════════════════
 * Four states, never two. Collapsing any of these into "no data" is what makes an operator console
 * lie by omission:
 *
 *   PRESENT + RETURNING   green   — hardware answering AND producing usable values
 *   PRESENT + NO RETURN   amber   — hardware answering and telling us it has nothing usable
 *                                   (open water, out of range, gated by a validity rule). This is a
 *                                   WORKING sensor. Rendering it red would make it look unfitted;
 *                                   rendering it green would read as "all clear".
 *   ABSENT                red     — no hardware fitted / not detected
 *   QUERYING              slate   — asked, no answer yet. NOT absence. The dev-PC→Jetson path has a
 *                                   documented first-SYN stall, so this window is long enough to read.
 *
 * Nothing here derives a value the backend did not send. In particular the magnetometer shows its
 * raw field and explicitly refuses to show a heading until it is calibrated AND tilt-compensated.
 */

import useSWR from "swr";
import { type JSX } from "react";
import { Radar, Ruler, Compass, Wifi, Thermometer, Radio, Waves, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { Panel, SectionLabel, StatLED, type LedColor } from "@/components/psathyrella/ui";

const POLL_MS = 4000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

interface Probe {
  status: number;
  body: unknown;
}
const probe = async (url: string): Promise<Probe> => {
  const res = await fetch(url, { cache: "no-store" });
  const body: unknown = await res.json().catch(() => null);
  return { status: res.status, body };
};

/** Acoustic TX service (:8791) via the existing owner-gated BFF. */
function useAcoustic() {
  const { data, error } = useSWR<Record<string, unknown> | null>(
    "/api/psathyrella/acoustic",
    (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    { refreshInterval: POLL_MS, revalidateOnFocus: false, dedupingInterval: POLL_MS - 500, keepPreviousData: true },
  );
  return { body: isRecord(data) ? data : null, pending: data === undefined && !error };
}

function useKind(kind: string) {
  const { data, error } = useSWR<Probe>(`/api/psathyrella/fusion-sensors/${kind}`, probe, {
    refreshInterval: POLL_MS,
    revalidateOnFocus: false,
    dedupingInterval: POLL_MS - 500,
    keepPreviousData: true,
  });
  return {
    body: data && data.status === 200 && isRecord(data.body) ? data.body : null,
    unreachable: Boolean(data && data.status !== 200),
    pending: data === undefined && !error,
  };
}

type State = "returning" | "no-return" | "absent" | "querying" | "unreachable";

const LED: Record<State, LedColor> = {
  returning: "green",
  "no-return": "amber",
  absent: "red",
  querying: "slate",
  unreachable: "red",
};

/** One sensor row. `detail` is only rendered when it says something — no em-dash padding. */
function Row({
  icon,
  name,
  model,
  state,
  headline,
  detail,
  title,
}: {
  icon: JSX.Element;
  name: string;
  model?: string | null;
  state: State;
  headline: string;
  detail?: string | null;
  title?: string;
}): JSX.Element {
  return (
    <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5" title={title}>
      <div className="flex min-w-0 items-center gap-1.5">
        <StatLED color={LED[state]} />
        <span className="shrink-0 text-slate-400">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide text-slate-200">{name}</span>
        {model ? <span className="shrink-0 truncate text-[8px] text-slate-600">{model}</span> : null}
      </div>
      <div
        className={cn(
          "mt-0.5 pl-[18px] font-mono text-[10px] tabular-nums leading-tight",
          state === "returning" ? "text-slate-200" : state === "no-return" ? "text-amber-300" : state === "querying" ? "text-slate-500" : "text-red-300",
        )}
      >
        {headline}
      </div>
      {detail ? <div className="pl-[18px] text-[8px] leading-tight text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function SensorsPanel({ telemetry }: { telemetry: BuoyTelemetry }): JSX.Element {
  const tof = useKind("points");
  const mmw = useKind("mmwave");
  const mag = useKind("magnetometer");
  const wifi = useKind("wifisense");
  const acoustic = useAcoustic();

  // ── TF-Luna ────────────────────────────────────────────────────────────────────────────────────
  const tofPoints = tof.body && Array.isArray(tof.body.points) ? (tof.body.points as unknown[]) : [];
  const tofValid = tofPoints.filter((p) => isRecord(p) && fin(p.rangeM) !== null);
  const tofState: State = tof.pending
    ? "querying"
    : tof.unreachable
      ? "unreachable"
      : str(tof.body?.hardware) !== "present"
        ? "absent"
        : tofValid.length > 0
          ? "returning"
          : "no-return";
  const tof0 = isRecord(tofPoints[0]) ? (tofPoints[0] as Record<string, unknown>) : null;
  const tofHeadline =
    tofState === "returning"
      ? tofValid
          .map((p) => {
            const r = p as Record<string, unknown>;
            return `${str(r.face) ?? "pt"} ${(fin(r.rangeM) as number).toFixed(2)} m`;
          })
          .join("  ")
      : tofState === "no-return"
        ? `no valid return${tof0 && str(tof0.invalidReason) ? ` · ${str(tof0.invalidReason)}` : ""}`
        : tofState === "absent"
          ? "not fitted"
          : tofState === "querying"
            ? "querying…"
            : "sensor service unreachable";

  // ── LD2450 mmWave ──────────────────────────────────────────────────────────────────────────────
  const mmTargets = mmw.body && Array.isArray(mmw.body.targets) ? (mmw.body.targets as unknown[]) : [];
  const mmValid = mmTargets.filter((t) => isRecord(t) && t.valid === true && fin(t.rangeM) !== null);
  const mmState: State = mmw.pending
    ? "querying"
    : mmw.unreachable
      ? "unreachable"
      : str(mmw.body?.hardware) !== "present"
        ? "absent"
        : mmValid.length > 0
          ? "returning"
          : "no-return";
  const mmRange = fin(mmw.body?.maxRangeM) ?? 6;
  const mmHeadline =
    mmState === "returning"
      ? mmValid
          .map((t) => {
            const r = t as Record<string, unknown>;
            return `${Math.round(fin(r.bearingDeg) ?? 0)}° @ ${(fin(r.rangeM) as number).toFixed(2)} m`;
          })
          .join("  ")
      : mmState === "no-return"
        ? `no movement in ${mmRange} m field`
        : mmState === "absent"
          ? "not framing"
          : mmState === "querying"
            ? "querying…"
            : "sensor service unreachable";

  // ── BMM150 ─────────────────────────────────────────────────────────────────────────────────────
  const mx = fin(mag.body?.magX_uT);
  const my = fin(mag.body?.magY_uT);
  const mz = fin(mag.body?.magZ_uT);
  const magVec = mx !== null && my !== null && mz !== null;
  const magMag = magVec ? Math.sqrt(mx * mx + my * my + mz * mz) : null;
  const magState: State = mag.pending
    ? "querying"
    : mag.unreachable
      ? "unreachable"
      : str(mag.body?.hardware) !== "present" || !magVec
        ? "absent"
        : "returning";
  const magCal = mag.body?.calibrated === true && mag.body?.tiltCompensated === true;

  // ── WiFi-sense ─────────────────────────────────────────────────────────────────────────────────
  const wifiDet = wifi.body && Array.isArray(wifi.body.detections) ? (wifi.body.detections as unknown[]) : [];
  const wifiState: State = wifi.pending
    ? "querying"
    : wifi.unreachable
      ? "unreachable"
      : str(wifi.body?.hardware) !== "present"
        ? "absent"
        : wifiDet.length > 0
          ? "returning"
          : "no-return";

  // ── BME688 (from the MAS telemetry envelope) ───────────────────────────────────────────────────
  const bme = telemetry.bme.a;
  const bmeState: State = bme && bme.present ? "returning" : "absent";

  return (
    <Panel title="Sensors" icon={<Radar className="h-4 w-4" />} className="h-full">
      <SectionLabel>Ranging</SectionLabel>
      <div className="space-y-1">
        <Row
          icon={<Ruler className="h-3 w-3" />}
          name="TF-Luna"
          model="single-point ToF"
          state={tofState}
          headline={tofHeadline}
          detail={
            tofState === "no-return"
              ? "hardware answering — this is not a clear reading"
              : tofState === "returning"
                ? "measures range on one fixed bearing · not a scan"
                : null
          }
          title="Benewake TF-Luna on the Jetson /dev/ttyTHS1. Range is reported only when 100 < strength < 65535 and the reading is above the 0.2 m minimum; otherwise null plus a reason."
        />
        <Row
          icon={<Radar className="h-3 w-3" />}
          name="mmWave"
          model="HLK-LD2450"
          state={mmState}
          headline={mmHeadline}
          detail={
            mmState === "no-return"
              ? "static objects are invisible to it — not an all-clear"
              : mmState === "returning"
                ? "measures bearing AND range · movement only"
                : null
          }
          title="24 GHz mmWave, NOT radar. ~6 m, tuned for human movement. It resolves motion, never identity — a stationary hull or piling does not appear."
        />
      </div>

      <SectionLabel className="mt-2">Orientation</SectionLabel>
      <Row
        icon={<Compass className="h-3 w-3" />}
        name="Magnetometer"
        model={str(mag.body?.address) ? `BMM150 @ ${str(mag.body?.address)}` : "BMM150"}
        state={magState}
        headline={
          magState === "returning"
            ? `${(magMag as number).toFixed(1)} µT  ·  X ${(mx as number).toFixed(0)} Y ${(my as number).toFixed(0)} Z ${(mz as number).toFixed(0)}`
            : magState === "querying"
              ? "querying…"
              : magState === "unreachable"
                ? "sensor service unreachable"
                : "not detected"
        }
        detail={magState === "returning" && !magCal ? "raw field only — not a heading (needs tilt compensation)" : null}
        title="Bosch BMM150. TWO distinct uses: (1) heading — which it CANNOT give alone, because that needs tilt compensation from an accelerometer that is not fitted; (2) UNDERWATER MAGNETIC ANOMALY detection — magnetic fields pass through water essentially unattenuated, so a ferrous mass (a hull, a mooring chain, a pipeline) perturbs the local field and is detectable without any sensor entering the water. That second use is what makes this sensor worth its bus address on a buoy. It needs a calibrated baseline first: Earth's field is 25–65 µT, and a departure from a KNOWN quiet baseline is the signal — an absolute reading on its own is not."
      />

      <SectionLabel className="mt-2">Passive RF</SectionLabel>
      <Row
        icon={<Wifi className="h-3 w-3" />}
        name="WiFi-sense"
        model={str(wifi.body?.phase) ?? "phase0"}
        state={wifiState}
        headline={
          wifiState === "returning"
            ? `${wifiDet.length} radio${wifiDet.length === 1 ? "" : "s"} heard`
            : wifiState === "no-return"
              ? "no radios heard"
              : wifiState === "querying"
                ? "querying…"
                : wifiState === "unreachable"
                  ? "sensor service unreachable"
                  : "not reporting"
        }
        detail={wifiState === "returning" || wifiState === "no-return" ? "presence only · no bearing (no AoA hardware)" : null}
        title="A row is a RADIO, not a person — MAC randomization is default-on and one person carries several. Direction comes from the LD2450, not from RSSI."
      />

      <SectionLabel className="mt-2">Acoustic</SectionLabel>
      <div className="space-y-1">
        {/* TRANSDUCER — live today. Real part name, not a generic label: when this is debugged at the
            bench the operator needs to know which device is on the bus, and "Transducer" does not
            tell them it is a Mallory on PCA 0x70 sharing i2c-1 with the ToF mux. */}
        {(() => {
          const hw = isRecord(acoustic.body?.hardware) ? (acoustic.body.hardware as Record<string, unknown>) : null;
          const up = acoustic.body?.up === true || acoustic.body?.status === "ok";
          const txing = acoustic.body?.txing === true;
          const freq = fin(acoustic.body?.freq_hz);
          const st: State = acoustic.pending ? "querying" : !up ? "unreachable" : txing ? "returning" : "no-return";
          return (
            <Row
              icon={<Radio className="h-3 w-3" />}
              name="Transducer"
              model={str(hw?.transducer) ?? "Mallory PT-2040PQ"}
              state={st}
              headline={
                acoustic.pending ? "querying…"
                  : !up ? "acoustic service unreachable"
                  : txing ? `transmitting${freq ? ` · ${(freq / 1000).toFixed(1)} kHz` : ""}`
                  : `idle${freq ? ` · ${(freq / 1000).toFixed(1)} kHz carrier` : ""}`
              }
              detail={up && !txing ? "ready — idle is not a fault" : null}
              title={`Underwater comms transmitter. ${str(hw?.note) ?? ""} It shares i2c-1 with the acoustic PCA at ${str(hw?.pca_addr) ?? "0x70"}. ⚠ A hydrophone cannot listen through a co-located transmitter — any listening window must gate this TX, not just the thrusters.`}
            />
          );
        })()}

        {/* HYDROPHONE — hardware in hand, not yet fitted (Morgan, Aug 03). Wired now so it lights up
            on first connection rather than needing a UI change on the day.

            "Not fitted" here is genuinely honest: the MAS envelope ships this block all-null both
            when the array is absent AND when it simply has not been plumbed in, so this cannot claim
            to know which — it says the level is not reported and leaves it there. */}
        {(() => {
          const h = telemetry.comms.hydrophone;
          const live = h.levelDb != null;
          return (
            <Row
              icon={<Waves className="h-3 w-3" />}
              name="Hydrophone"
              model="Aquarian AS-1 + PA4"
              state={live ? "returning" : "absent"}
              headline={
                live
                  ? `${h.levelDb!.toFixed(0)} dB${h.bandHz ? ` · ${h.bandHz.lo}–${h.bandHz.hi} Hz` : ""}${h.peakBearingDeg != null ? ` · peak ${Math.round(h.peakBearingDeg)}°` : ""}`
                  : "not fitted — level not reported"
              }
              detail={
                live
                  ? (h.peakBearingDeg == null ? "single element — no bearing (a pair gives direction)" : null)
                  : "hardware on hand, awaiting fit · chain: AS-1 → PA4 → USB audio @192 kHz"
              }
              title="Aquarian AS-1 piezo (40 µV/Pa) → PA4 preamp (26 dB, balanced) → USB audio interface on the Jetson. Mount the PA4 in the dry can as close to the penetrator as possible — the balanced output is what survives this platform. A single element gives level only; bearing needs a second element (TDOA)."
            />
          );
        })()}

        {/* ACOUSTIC LINK — the modem side: carrier, SNR, slant range to whatever is answering. */}
        {(() => {
          const a = telemetry.comms.acoustic;
          const st: State = a.connected ? "returning" : "absent";
          return (
            <Row
              icon={<Activity className="h-3 w-3" />}
              name="Acoustic link"
              model={a.carrierKhz != null ? `${a.carrierKhz} kHz` : "modem"}
              state={st}
              headline={
                a.connected
                  ? `${a.snrDb != null ? `${a.snrDb.toFixed(0)} dB SNR` : "linked"}${a.rangeM != null ? ` · ${a.rangeM.toFixed(0)} m` : ""}`
                  : "no acoustic link"
              }
              detail={a.connected && a.lastPingMsAgo != null ? `last ping ${Math.round(a.lastPingMsAgo / 1000)} s ago` : null}
              title="Underwater acoustic modem link state. Range here is a MEASURED slant range from the modem, not an RSSI estimate."
            />
          );
        })()}
      </div>

      <SectionLabel className="mt-2">Environmental</SectionLabel>
      <Row
        icon={<Thermometer className="h-3 w-3" />}
        name="BME688"
        model={bme?.address ?? "Side A"}
        state={bmeState}
        headline={
          bme && bme.present
            ? `${bme.temperature?.toFixed(1) ?? "—"} °C  ·  ${bme.humidity?.toFixed(0) ?? "—"} %RH  ·  IAQ ${bme.iaq ?? "—"}`
            : "not reporting"
        }
        detail={bme && bme.present && bme.iaqAccuracy === 0 ? "IAQ accuracy 0 — BSEC still calibrating" : null}
        title="Bosch BME688 on the MycoBrain I²C bus, via the MAS telemetry envelope. This is AIR temperature inside/around the hull — it is not sea temperature."
      />
      {/* WATER TEMPERATURE — no sensor exists on this vehicle and none is declared in the contract.
          Listed explicitly rather than omitted: a missing ROW reads as "not a thing we measure",
          while an operator looking for sea temperature needs to know it is absent, not overlooked.
          The BME688 above is AIR and must never be read as water. */}
      <Row
        icon={<Thermometer className="h-3 w-3" />}
        name="Water temp"
        model="not fitted"
        state="absent"
        headline="no sea-temperature sensor"
        detail="the BME688 above is AIR temperature — do not read it as water"
        title="No water-temperature probe is fitted and none is declared in the telemetry contract. A submersible thermistor on the MycoBrain I²C bus would populate this."
      />
    </Panel>
  );
}
