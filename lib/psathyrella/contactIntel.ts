/**
 * TACTICAL CONTACT INTEL ENGINE — turn a stateless 1 Hz box-dump into a picture a pilot can use.
 *
 * WHY THIS FILE EXISTS
 * The buoy runs ultralytics yolo11n.pt on CPU with NO tracker, so every frame arrives as an
 * independent list of boxes with no trackId and no memory of the frame before it. Everything an
 * operator actually needs — "is that the same object as last second?", "is it moving?", "is it
 * coming at us?", "is that just our own tower again?" — is temporal, and none of it exists in a
 * single frame. This module is the missing memory. It adds real signal WITHOUT any model change:
 * every conclusion here is derived from OBSERVED MOTION over time, never from the detector's label.
 *
 * THE FOUR THINGS IT DOES, in order of operational value:
 *
 *  1. TEMPORAL CONFIRMATION. Successive frames are fused into persistent Contacts. Because there is
 *     no trackId, the association key is ANGULAR PROXIMITY of the true bearing plus the ontology
 *     handling lane. One sighting is "tentative"; N sightings is "confirmed"; silence decays a
 *     contact to "lost" and then drops it. This is what kills single-frame flicker.
 *
 *  2. SCENE BASELINE / STATIC-CLUTTER SUPPRESSION — the highest-value capability here. The buoy is
 *     moored. Its own tower hardware (which COCO reports as "bottle") and the dock behind it sit at
 *     an essentially CONSTANT TRUE BEARING forever, while a real vessel's bearing changes. So a
 *     contact whose true bearing has been stable for longer than the dwell threshold, and which has
 *     been seen in most frames over that period, is classified "static" = background clutter. This
 *     is what actually solves "our own hardware is detected as a bottle": not by renaming it, but by
 *     LEARNING FROM OBSERVATION that it never moves.
 *
 *  3. BEARING RATE + CBDR. Least-squares bearing-vs-time gives a bearing rate. Constant Bearing,
 *     Decreasing Range is the classic collision signature. We have NO rangefinder, so the bbox
 *     diagonal is used as a RANGE PROXY and is labelled as a proxy everywhere it is used.
 *
 *  4. CROSS-SOURCE DEDUP. The same object can appear on a ring tile and on the Target camera; within
 *     the angular gate those become ONE contact carrying both sources (more sources = corroborated).
 *
 * ── THE TRAP THIS MODULE MUST NOT FALL INTO ─────────────────────────────────────────────────────
 * A vessel on a collision course ALSO holds a constant bearing — that is the entire meaning of CBDR.
 * A naive "constant bearing ⇒ scenery" rule would therefore suppress the single most dangerous
 * contact on the screen. The discriminator is the range proxy: fixed scenery holds a constant
 * APPARENT SIZE, a closing vessel's box GROWS. So `static` requires a stable bearing AND a
 * non-growing box, and a stable bearing with a growing box is escalated to "collision_risk" instead.
 * If no usable range proxy exists we decline to call anything static, because without it the two
 * cases are indistinguishable. See `evaluateStatic`.
 *
 * The subtle half of that trap is the SLOW closer. Growth of a few percent per minute is invisible to
 * an absolute "did the box get bigger" test over a one-minute window, yet it is a vessel whose range
 * is halving every several minutes — and it holds a constant bearing, so a bearing-only rule files it
 * as scenery and takes it off the operator's screen. The range-proxy test is therefore run over TWO
 * windows: a short one that catches a fast approach quickly, and one spanning the whole dwell that
 * measures growth as a RATE (%/min, which unlike an absolute change is independent of window length)
 * so a slow closer accumulates past the noise floor instead of hiding under a fixed threshold.
 * RESIDUAL LIMIT, stated honestly: below roughly 2 %/min of apparent growth the trend is inside the
 * detector's own box jitter, so no optical proxy can separate a very slow closer from scenery. That
 * bound is quoted in every `staticReason` — "static" always means "not measurably growing", never
 * "confirmed stationary".
 *
 * ── HONESTY CONSTRAINTS (a wrong claim here can cause a wrong maneuver) ──────────────────────────
 *  - Bearings must be TRUE (heading-compensated) for any of this to mean anything. A moored buoy
 *    swinging on its mooring changes its own heading constantly, so RELATIVE bearings of fixed
 *    scenery sweep while TRUE bearings stay put. When heading is unknown the caller passes
 *    bearingTrueDeg: null — and then nothing may be classified static (comparing relative bearings
 *    could suppress a real closing vessel) and the threat stays "unknown". The reason is stated in
 *    the contact's `assessment`.
 *  - Nothing is ever invented. A missing bearing stays null; an unfittable rate stays null; an
 *    under-sampled contact stays "unknown" rather than being given a plausible threat level.
 *  - "static" is a claim about MOTION, never about identity, and never deletes a contact — it only
 *    demotes it out of the active picture. The operator can still see it.
 *
 * ── STATE CARRIER (read before wiring) ──────────────────────────────────────────────────────────
 * `ingestFrame` is a PURE reducer: same (prev, input, cfg) always yields the same next state, no
 * Date.now(), no I/O, so a mission can be replayed frame-for-frame from a recording. All memory
 * lives in the returned IntelState, including a per-contact observation history carried on a
 * non-public `intelHistory` field of each Contact (the public `Contact` type is exactly the shape
 * the console wires against; the history is an implementation detail on the same object). Therefore:
 * FEED THE RETURNED STATE BACK IN VERBATIM. Spreading (`{ ...contact }`) preserves it, JSON round
 * trips preserve it; rebuilding Contact objects field-by-field would erase the history and every
 * contact would restart as "tentative" (degrades safely, but loses the entire point of the module).
 */

import { bearingDelta } from "@/lib/psathyrella/targetTracking";

export type ContactState = "tentative" | "confirmed" | "static" | "lost";

/**
 * Operator threat level.
 *
 *  - "collision_risk": bearing rate is at/below the CBDR threshold AND the RANGE PROXY (bbox
 *    diagonal — NOT a measured range) is growing steadily. Never emitted below the sample/time
 *    minimums in IntelConfig.
 *  - "closing": range proxy growing, but the bearing is changing appreciably (it should pass).
 *  - "opening": range proxy shrinking.
 *  - "steady": enough evidence, and neither bearing nor range proxy is changing appreciably.
 *  - "unknown": not enough samples/time, no true bearing (heading unavailable), or no usable range
 *    proxy. "unknown" is an absence of evidence — it is NEVER an all-clear.
 */
export type ThreatLevel = "collision_risk" | "closing" | "opening" | "steady" | "unknown";

export interface ContactObservation {
  tMs: number;
  /** Compass bearing 0..360. Null when own-ship heading is unknown — never substitute a value. */
  bearingTrueDeg: number | null;
  /** Bearing relative to the bow, −180..180. Always present (it needs no heading). */
  bearingRelDeg: number;
  /**
   * RANGE PROXY ONLY: the bbox diagonal in the source's normalized units. This is not a range and
   * not metres. Growing = probably closing. Pass 0 when it cannot be computed.
   */
  sizeProxy: number;
  /** Detector confidence 0..1. */
  conf: number;
  /** Which camera surface saw it ("quad360" | "front" | "pano" | "bev"). Free-form by design. */
  source: string;
}

export interface Contact {
  id: string;
  label: string;                 // ontology displayLabel
  group: string;                 // ontology group id (NEVER render raw — routing only)
  state: ContactState;
  bearingTrueDeg: number | null;
  bearingRelDeg: number;
  bearingRateDegPerMin: number | null;
  threat: ThreatLevel;
  /** Human-readable, honest, includes the range-proxy caveat when relevant. */
  assessment: string;
  conf: number;
  sources: string[];
  firstSeenMs: number;
  lastSeenMs: number;
  observationCount: number;
  /** Set when state==="static": why we think it is scenery. */
  staticReason: string | null;
}

export interface IntelState { contacts: Contact[]; updatedMs: number }

export interface IntelConfig {
  /** Max angular separation for a detection to join an existing contact. Default 8°. */
  associateDeg?: number;
  /** Lifetime sightings needed before a contact is "confirmed". Default 3. */
  confirmFrames?: number;
  /** Silence after which a contact decays to "lost". Dropped entirely at 2× this. Default 6000 ms. */
  lostAfterMs?: number;
  /** How long a bearing must hold still before the contact is called scenery. Default 120000 ms. */
  staticDwellMs?: number;
  /** Peak-to-peak true-bearing spread allowed while still counting as "held still". Default 5°. */
  staticJitterDeg?: number;
  /** Minimum samples before ANY bearing rate / threat above "unknown" is emitted. Default 5. */
  minSamplesForRate?: number;
  /** Minimum time the samples must span before a rate is emitted. Default 20000 ms. */
  minSpanMsForRate?: number;
}

/** Resolved config — every field present, so downstream code never re-applies defaults. */
interface ResolvedConfig {
  associateDeg: number;
  confirmFrames: number;
  lostAfterMs: number;
  staticDwellMs: number;
  staticJitterDeg: number;
  minSamplesForRate: number;
  minSpanMsForRate: number;
}

const DEFAULTS: ResolvedConfig = {
  associateDeg: 8,
  confirmFrames: 3,
  lostAfterMs: 6_000,
  staticDwellMs: 120_000,
  staticJitterDeg: 5,
  minSamplesForRate: 5,
  minSpanMsForRate: 20_000,
};

/**
 * Hard cap on retained observations per contact, so a multi-day mission cannot grow without bound.
 *
 * SIZING NOTE: the static dwell test needs history reaching back at least `staticDwellMs`. At the
 * live ~1 Hz poll rate a 120 s dwell needs ~121 samples, so 240 leaves headroom for a full dwell
 * window plus the retention slack below. If a future pipeline pushes frames much faster than 1 Hz
 * the retained history may span LESS than the dwell, and nothing will ever be classified static —
 * a deliberate fail-safe direction (show clutter rather than hide a contact).
 */
const MAX_OBSERVATIONS = 240;

/** Fraction of the expected frames a contact must appear in to count as "seen in most frames". */
const STATIC_MIN_DUTY = 0.6;

/**
 * SHORT-WINDOW scenery gate: max relative growth of the range proxy across the recent fit window.
 *
 * Job: de-classify an object that has sat still for minutes and has only NOW started to close, within
 * a few tens of seconds. A one-minute window is short enough that box jitter dominates a rate
 * estimate, so this one is deliberately a loose ABSOLUTE change. It is not, and must not be, the only
 * growth gate — on its own it silently tolerates anything closing slower than ~12 %/min.
 */
const STATIC_MAX_GROWTH = 0.12;

/**
 * DWELL-LONG scenery gate: max growth RATE of the range proxy, as a fraction per minute, measured
 * across the contact's whole retained history.
 *
 * THIS IS THE GATE THAT STOPS A SLOW CLOSER BEING FILED AS SCENERY. A rate is used rather than an
 * absolute change because an absolute change means nothing without its window length, whereas %/min
 * is directly comparable to "how fast is the range shrinking": apparent size grows at roughly the
 * rate range shrinks, so 2 %/min is a contact whose range halves in about half an hour.
 *
 * Sized against the measured noise floor of this estimator, not chosen by feel. Simulating genuine
 * scenery at 1 Hz with ±10% per-frame box jitter, |fitted growth rate| has p99 ≈ 0.8 %/min over a
 * 240 s history and ≈ 2.0 %/min over the 120 s minimum. So 2 %/min sits at the edge of what detector
 * noise can fake. Below it, no optical proxy can honestly separate a crawling closer from a fixed
 * object — that limit is stated in `staticReason` rather than papered over.
 *
 * Erring low costs only clutter (a real piling occasionally shown as a normal contact); erring high
 * costs a hidden inbound vessel. The asymmetry is the whole reason this constant is set where it is.
 */
const STATIC_MAX_GROWTH_PER_MIN = 0.02;

/**
 * Fraction of the dwell the range proxy must actually cover before "it never grew" is a claim we are
 * entitled to make. If the detector only reported box sizes for the last few seconds of a two-minute
 * dwell, the other 115 s are unmeasured and the contact could have been growing throughout.
 */
const STATIC_SIZE_COVERAGE = 0.6;

/** |bearing rate| at or below this counts as "constant bearing" for CBDR. */
const CBDR_MAX_RATE_DEG_PER_MIN = 2;

/** Relative change of the range proxy across the fit window that counts as closing / opening. */
const SIZE_CLOSING_REL = 0.15;
const SIZE_OPENING_REL = -0.15;

/**
 * Sustained growth RATE, held for at least a full dwell, that promotes a contact to "closing".
 *
 * Deliberately set ABOVE the static gate (2 %/min), and the gap between them is not sloppiness — it
 * is the point. The two thresholds answer two different questions with two different costs:
 *
 *   ≥2 %/min  → refuse to call it scenery.  Cost of being wrong: one extra contact on the screen.
 *   ≥4 %/min  → raise it as closing.        Cost of being wrong: an alarm the operator learns to
 *                                            ignore, which is itself a safety failure.
 *
 * So the bar to stop HIDING something is low and the bar to start SHOUTING is higher. Contacts in the
 * 2–4 %/min band sit in between: fully visible, threat left at "steady", and the measured growth
 * spelled out in the assessment so the operator can make the call — which is the honest answer when
 * the evidence is real but weak. `steady` (monotone corroboration) is additionally required here so a
 * single ramp of detector noise cannot raise an alarm on its own.
 */
const THREAT_SUSTAINED_GROWTH_PER_MIN = 0.04;

/**
 * Bearing rate and range-proxy trend are fitted over this trailing window only, anchored on the
 * contact's own last sighting. Fitting the whole history would average a contact's current track
 * with a manoeuvre it made two minutes ago and mask a developing collision geometry.
 */
const RATE_FIT_WINDOW_MS = 60_000;

/**
 * Handling lanes that may NEVER be demoted to "static", whatever the motion evidence says.
 *
 * A person who is not moving is still a person. The static rule is a decluttering aid for hardware
 * and dock furniture; applying it to the life-safety lane would let the console quietly stop showing
 * a stationary person, which is the one error this console cannot make. The stability evidence is
 * still reported in `assessment` so the operator can judge it.
 */
const NEVER_STATIC_GROUPS: readonly string[] = ["person_in_water"];

/** Operator-attention ranking used by `summarize().highest`. Higher = wants attention sooner. */
const THREAT_RANK: Record<ThreatLevel, number> = {
  collision_risk: 4,
  closing: 3,
  steady: 2,
  opening: 1,
  unknown: 0,
};

const UNLABELLED = "Unlabelled contact";

/** One fused frame for one contact. Internal — richer than the public ContactObservation. */
interface HistoryEntry {
  tMs: number;
  bearingTrueDeg: number | null;
  bearingRelDeg: number;
  /** Range proxy of the primary (highest-confidence) source this frame. 0 = unusable. */
  sizeProxy: number;
  conf: number;
  /** Every source that saw this contact in this frame — the cross-source dedup record. */
  sources: string[];
  /**
   * Range proxy per source. Kept separately because the sources have DIFFERENT frame geometries
   * (pano 3840x540 vs front 1920x1080), so their normalized diagonals are not comparable. Mixing
   * them into one series would manufacture growth — and therefore a fake collision warning — purely
   * from a source appearing or dropping out. The trend is always fitted within ONE source.
   */
  sizeBySource: Record<string, number>;
  label: string;
}

/** A Contact plus the memory that makes the temporal reasoning possible. See the header note. */
interface InternalContact extends Contact {
  intelHistory: HistoryEntry[];
}

const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

const fmt1 = (value: number): string => (Math.round(value * 10) / 10).toFixed(1);
const fmtSec = (ms: number): string => `${Math.round(ms / 1000)} s`;
const fmtPct = (ratio: number): string => `${ratio >= 0 ? "+" : ""}${Math.round(ratio * 100)}%`;
/** Growth RATES are quoted to a decimal: at these magnitudes "+2%/min" vs "+2.4%/min" is the call. */
const fmtRate = (perMin: number): string => `${perMin >= 0 ? "+" : ""}${fmt1(perMin * 100)}%/min`;

function resolveConfig(cfg?: IntelConfig): ResolvedConfig {
  // Only finite positive overrides are honoured; a NaN from a slider must not disable the gate.
  const pick = (value: number | undefined, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
  return {
    associateDeg: pick(cfg?.associateDeg, DEFAULTS.associateDeg),
    confirmFrames: Math.max(1, Math.round(pick(cfg?.confirmFrames, DEFAULTS.confirmFrames))),
    lostAfterMs: pick(cfg?.lostAfterMs, DEFAULTS.lostAfterMs),
    staticDwellMs: pick(cfg?.staticDwellMs, DEFAULTS.staticDwellMs),
    staticJitterDeg: pick(cfg?.staticJitterDeg, DEFAULTS.staticJitterDeg),
    minSamplesForRate: Math.max(2, Math.round(pick(cfg?.minSamplesForRate, DEFAULTS.minSamplesForRate))),
    minSpanMsForRate: pick(cfg?.minSpanMsForRate, DEFAULTS.minSpanMsForRate),
  };
}

/**
 * Recover the observation history from a Contact.
 *
 * Defensive by design: callers may have serialized, cloned or (against the header's advice) rebuilt
 * the contact. A missing or malformed history degrades to "no memory yet" rather than throwing on an
 * operator console mid-mission.
 */
function readHistory(contact: Contact): HistoryEntry[] {
  const carrier = contact as Partial<InternalContact>;
  return Array.isArray(carrier.intelHistory) ? carrier.intelHistory : [];
}

/** Unwrap a compass series into a continuous one so slopes and spreads are not broken by the 360° seam. */
function unwrap(bearings: number[]): number[] {
  const out: number[] = [bearings[0]];
  for (let i = 1; i < bearings.length; i += 1) {
    out.push(out[i - 1] + bearingDelta(bearings[i - 1], bearings[i]));
  }
  return out;
}

/** Circular mean of compass bearings, 0..360. Callers guarantee a non-empty, all-finite input. */
function circularMean(bearings: number[]): number {
  const unwrapped = unwrap(bearings);
  let sum = 0;
  for (const value of unwrapped) sum += value;
  return norm360(sum / unwrapped.length);
}

/** Ordinary least-squares slope of y over x. Null when x has no spread (slope undefined, not zero). */
function slope(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    num += dx * (ys[i] - my);
    den += dx * dx;
  }
  if (!(den > 0)) return null; // every sample at one instant — no rate is defined
  return num / den;
}

function mean(values: number[]): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/**
 * Pick the source whose range-proxy series is longest inside the window.
 *
 * One source only — see the note on HistoryEntry.sizeBySource for why mixing them fabricates growth.
 * Ties break on the alphabetically first source id so the choice is deterministic and replayable.
 */
function pickSizeSource(window: HistoryEntry[]): string | null {
  const counts = new Map<string, number>();
  for (const entry of window) {
    for (const [source, size] of Object.entries(entry.sizeBySource)) {
      if (!(size > 0)) continue;
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [source, count] of [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (count > bestCount) {
      bestCount = count;
      best = source;
    }
  }
  return best;
}

interface SizeTrend {
  source: string;
  /** Relative change of the range proxy across the fitted span, e.g. 0.3 = the box grew ~30%. */
  relativeChange: number;
  /**
   * The same trend expressed as a fraction PER MINUTE.
   *
   * `relativeChange` is meaningless without its window length — "+10%" is a crawl over four minutes
   * and an emergency over ten seconds — so every comparison that spans windows of different lengths
   * uses this instead. Apparent size grows at roughly the rate range shrinks, which makes this
   * number directly readable as a closing rate.
   */
  growthPerMin: number;
  samples: number;
  spanMs: number;
  /** True when the later samples really are bigger than the earlier ones, not just one blown-up box. */
  steady: boolean;
}

/** A trend, or the specific reason there isn't one. The reason is surfaced verbatim to the operator:
 *  "not enough samples yet" and "the detector is reporting no box size" are very different faults. */
interface SizeTrendResult {
  trend: SizeTrend | null;
  blockedReason: string | null;
}

/**
 * Trend of the RANGE PROXY (bbox diagonal) within a single source.
 *
 * `steady` additionally requires the last third of the window to out-measure the first third, so a
 * single frame where the box blew up (a merged detection, a wave, a lens flare) cannot on its own
 * produce a collision warning.
 */
function sizeTrend(window: HistoryEntry[], minSamples: number): SizeTrendResult {
  const source = pickSizeSource(window);
  if (source === null) {
    return { trend: null, blockedReason: "no source reported a usable box size (range proxy unavailable)" };
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const entry of window) {
    const size = entry.sizeBySource[source];
    if (!(size > 0)) continue;
    xs.push(entry.tMs);
    ys.push(size);
  }
  if (xs.length < minSamples) {
    return {
      trend: null,
      blockedReason: `only ${xs.length} box-size sample${xs.length === 1 ? "" : "s"} from "${source}" (need ${minSamples})`,
    };
  }

  const spanMs = xs[xs.length - 1] - xs[0];
  const m = slope(xs, ys);
  if (m === null || !(spanMs > 0)) {
    return { trend: null, blockedReason: "all box-size samples share one timestamp — no trend is defined" };
  }

  const average = mean(ys);
  if (!(average > 0)) {
    return { trend: null, blockedReason: "reported box sizes are not positive — range proxy unusable" };
  }

  const third = Math.max(1, Math.floor(ys.length / 3));
  const firstThird = mean(ys.slice(0, third));
  const lastThird = mean(ys.slice(ys.length - third));

  const relativeChange = (m * spanMs) / average;
  return {
    trend: {
      source,
      relativeChange,
      growthPerMin: relativeChange / (spanMs / 60_000), // spanMs > 0 is guaranteed above
      samples: xs.length,
      spanMs,
      steady: relativeChange > 0 ? lastThird > firstThird : lastThird < firstThird,
    },
    blockedReason: null,
  };
}

/** Observations inside the trailing fit window, anchored on the contact's own last sighting. */
function fitWindow(history: HistoryEntry[]): HistoryEntry[] {
  if (history.length === 0) return [];
  const anchor = history[history.length - 1].tMs;
  return history.filter((entry) => entry.tMs >= anchor - RATE_FIT_WINDOW_MS);
}

interface RateResult {
  degPerMin: number | null;
  samples: number;
  spanMs: number;
  /** Why no rate could be fitted — surfaced in the assessment so "null" is never mute. */
  blockedReason: string | null;
}

/**
 * Bearing rate from a least-squares fit over TRUE bearings only.
 *
 * Samples whose true bearing is null (heading dropped out for a frame) are skipped rather than
 * filled in; the remaining samples are still real true bearings. The minimums are hard gates: a rate
 * fitted from three sightings a second apart is noise wearing a number's clothes.
 */
function bearingRate(window: HistoryEntry[], cfg: ResolvedConfig): RateResult {
  const usable = window.filter((entry) => entry.bearingTrueDeg !== null);
  if (usable.length < cfg.minSamplesForRate) {
    return {
      degPerMin: null,
      samples: usable.length,
      spanMs: 0,
      blockedReason: `only ${usable.length} true-bearing sighting${usable.length === 1 ? "" : "s"} (need ${cfg.minSamplesForRate})`,
    };
  }
  const xs = usable.map((entry) => entry.tMs);
  const spanMs = xs[xs.length - 1] - xs[0];
  if (spanMs < cfg.minSpanMsForRate) {
    return {
      degPerMin: null,
      samples: usable.length,
      spanMs,
      blockedReason: `sightings span only ${fmtSec(spanMs)} (need ${fmtSec(cfg.minSpanMsForRate)})`,
    };
  }
  const ys = unwrap(usable.map((entry) => entry.bearingTrueDeg as number));
  const perMs = slope(xs, ys);
  if (perMs === null) {
    return { degPerMin: null, samples: usable.length, spanMs, blockedReason: "all sightings share one timestamp" };
  }
  return { degPerMin: perMs * 60_000, samples: usable.length, spanMs, blockedReason: null };
}

interface StaticVerdict {
  isStatic: boolean;
  /** Populated when isStatic — the operator-facing justification. */
  reason: string | null;
  /** Populated when NOT static and the reason is worth telling the operator. Null when uninteresting. */
  blockedReason: string | null;
}

/**
 * Decide whether a contact is fixed scenery.
 *
 * Every gate below exists to avoid suppressing something real:
 *   1. life-safety lanes are never suppressed at all;
 *   2. TRUE bearing required for every retained sighting — relative bearings sweep as the moored buoy
 *      yaws, so a fixed object would look mobile and, worse, a closing vessel could look fixed;
 *   3. the history must actually reach back a full dwell (a short sample of a slow contact looks
 *      identical to scenery);
 *   4. the bearing must have held inside the jitter gate peak-to-peak;
 *   5. the contact must have been seen in most of the frames over that period — scenery does not
 *      flicker, and two lucky sightings 120 s apart prove nothing;
 *   6. the range proxy must NOT be growing. THIS IS THE CBDR GUARD: a vessel on a collision course
 *      also holds a constant bearing, and the only thing separating it from a dock piling is that
 *      its box grows. With no usable range proxy the two are indistinguishable, so we refuse to
 *      suppress rather than risk hiding the collision case.
 */
function evaluateStatic(
  contact: Contact,
  history: HistoryEntry[],
  cfg: ResolvedConfig,
  trendResult: SizeTrendResult,
  dwellResult: SizeTrendResult,
): StaticVerdict {
  if (NEVER_STATIC_GROUPS.includes(contact.group)) {
    return { isStatic: false, reason: null, blockedReason: "life-safety lane — never suppressed as scenery" };
  }
  if (history.length < Math.max(cfg.confirmFrames, 4)) {
    return { isStatic: false, reason: null, blockedReason: null };
  }
  if (history.some((entry) => entry.bearingTrueDeg === null)) {
    return {
      isStatic: false,
      reason: null,
      blockedReason:
        "own-ship heading was unavailable for at least one sighting, so true bearing could not be tracked throughout — scenery suppression is disabled for this contact",
    };
  }

  const spanMs = history[history.length - 1].tMs - history[0].tMs;
  if (spanMs < cfg.staticDwellMs) {
    return { isStatic: false, reason: null, blockedReason: null }; // simply not old enough yet
  }

  const unwrapped = unwrap(history.map((entry) => entry.bearingTrueDeg as number));
  const spread = Math.max(...unwrapped) - Math.min(...unwrapped);
  if (spread > cfg.staticJitterDeg) {
    return { isStatic: false, reason: null, blockedReason: null }; // it moves — the normal case
  }

  // Duty cycle. The frame period is estimated as the SMALLEST gap between this contact's own
  // sightings: a contact seen every frame has all gaps ≈ one period, while a flickering contact
  // still shows one short gap somewhere and then many long ones, which is exactly what we want the
  // ratio to punish. Using the median instead would read a contact seen every third frame as
  // perfectly persistent.
  let period = Infinity;
  for (let i = 1; i < history.length; i += 1) {
    const gap = history[i].tMs - history[i - 1].tMs;
    if (gap > 0 && gap < period) period = gap;
  }
  if (!Number.isFinite(period) || !(period > 0)) {
    return { isStatic: false, reason: null, blockedReason: "sighting timestamps do not advance — cannot measure persistence" };
  }
  const expected = Math.round(spanMs / period) + 1;
  const duty = expected > 0 ? history.length / expected : 0;
  if (duty < STATIC_MIN_DUTY) {
    return { isStatic: false, reason: null, blockedReason: null }; // too intermittent to call it scenery
  }

  // ── THE CBDR GUARD ─────────────────────────────────────────────────────────────────────────────
  // Everything above establishes only that the BEARING did not move — and a vessel closing on a
  // collision course holds a constant bearing by definition. So bearing stability is not evidence of
  // scenery; on its own it is equally evidence of the most dangerous contact on the screen. The range
  // proxy is the only thing that separates the two, and it is checked over two windows doing two
  // different jobs (see the constants for why each uses the measure it does):
  //
  //   RECENT (fit window, ABSOLUTE change) — catches an object that has been still for minutes and
  //   has just begun to close, within a few tens of seconds.
  //
  //   DWELL-LONG (whole retained history, RATE per minute) — catches the slow closer, whose growth is
  //   far too gradual to trip the short window but is unmistakable once integrated over the dwell.
  //
  // Failing either one blocks suppression. So does the absence of a usable range proxy: with no size
  // evidence at all, scenery and an inbound vessel are genuinely indistinguishable, and the safe
  // reading of "indistinguishable" on this console is to leave the contact on the screen.
  const trend = trendResult.trend;
  if (trend === null) {
    return {
      isStatic: false,
      reason: null,
      blockedReason: `${trendResult.blockedReason ?? "no range-proxy trend"} — without it, fixed scenery cannot be told apart from a constant-bearing closing contact, so this contact is NOT suppressed`,
    };
  }
  if (trend.relativeChange > STATIC_MAX_GROWTH) {
    return {
      isStatic: false,
      reason: null,
      blockedReason: `bearing is holding steady but the detection box is growing (${fmtPct(trend.relativeChange)} over ${fmtSec(trend.spanMs)}) — treated as a possible closing contact, NOT as scenery`,
    };
  }

  const dwellTrend = dwellResult.trend;
  if (dwellTrend === null) {
    return {
      isStatic: false,
      reason: null,
      blockedReason: `${dwellResult.blockedReason ?? "no range-proxy trend across the dwell"} — the box size over the full dwell is what separates fixed scenery from a slow closer, so this contact is NOT suppressed`,
    };
  }
  if (dwellTrend.spanMs < cfg.staticDwellMs * STATIC_SIZE_COVERAGE) {
    return {
      isStatic: false,
      reason: null,
      blockedReason: `box size was only reported across ${fmtSec(dwellTrend.spanMs)} of the ${fmtSec(cfg.staticDwellMs)} dwell, so "it never grew" is unproven for the rest — NOT suppressed`,
    };
  }
  if (dwellTrend.growthPerMin > STATIC_MAX_GROWTH_PER_MIN) {
    return {
      isStatic: false,
      reason: null,
      blockedReason:
        `bearing has been steady, but the detection box has grown ${fmtRate(dwellTrend.growthPerMin)} sustained over ` +
        `${fmtSec(dwellTrend.spanMs)} on "${dwellTrend.source}" — a constant bearing with a growing box is the ` +
        `collision signature, not scenery, so this contact is NOT suppressed`,
    };
  }

  const meanBearing = norm360(mean(unwrapped));
  return {
    isStatic: true,
    reason:
      `bearing held within ${fmt1(spread)}° peak-to-peak of ${fmt1(meanBearing)}° true for ${fmtSec(spanMs)} ` +
      `across ${history.length} sightings (~${Math.round(duty * 100)}% of frames), while the detection box did not grow ` +
      `(${fmtPct(trend.relativeChange)} over the last ${fmtSec(trend.spanMs)}, and ${fmtRate(dwellTrend.growthPerMin)} ` +
      `sustained across ${fmtSec(dwellTrend.spanMs)} on "${dwellTrend.source}"). A moored buoy's own tower hardware and ` +
      `the shoreline behind it behave exactly this way; a vessel closing on a steady bearing does not — its box grows. ` +
      `Classified from MOTION ONLY — this says nothing about what the object is, and box size is a range PROXY, not a ` +
      `measured range. It means NOT MEASURABLY GROWING, not "confirmed stationary": growth under ` +
      `${fmtRate(STATIC_MAX_GROWTH_PER_MIN)} is inside the detector's own box jitter and cannot be ruled out. ` +
      `Verify visually before dismissing it.`,
    blockedReason: null,
  };
}

/**
 * Growth too gradual for the short window to notice, but held long enough to be real.
 *
 * A rate this small is only trustworthy over a long baseline — it is quoted per minute so it can be
 * compared across windows, but it is only BELIEVED once observed for at least a full dwell, because
 * that is the span over which the measured jitter floor of this estimator drops below the threshold.
 * Requiring `steady` as well means the later samples genuinely out-measure the earlier ones.
 */
function isSustainedGrowth(dwellTrend: SizeTrend | null, cfg: ResolvedConfig, thresholdPerMin: number): boolean {
  if (dwellTrend === null) return false;
  if (dwellTrend.spanMs < cfg.staticDwellMs) return false;
  return dwellTrend.growthPerMin > thresholdPerMin && dwellTrend.steady;
}

/**
 * Classify the threat from the fitted bearing rate and the range-proxy trend.
 *
 * Two independent routes to "the range proxy is growing", because one window cannot see both cases:
 * a fast approach shows up as a big ABSOLUTE change inside the short fit window, while a slow one is
 * only visible as a sustained RATE across the whole dwell. Missing the second route is what let a
 * vessel closing at a few percent per minute be reported as "steady" — the same blind spot that let
 * the scenery rule suppress it, so both are closed the same way.
 */
function classifyThreat(
  rate: RateResult,
  trend: SizeTrend | null,
  dwellTrend: SizeTrend | null,
  cfg: ResolvedConfig,
): ThreatLevel {
  if (rate.degPerMin === null) return "unknown";
  if (trend === null) return "unknown"; // no range proxy ⇒ no honest statement about range at all
  const growing =
    (trend.relativeChange >= SIZE_CLOSING_REL && trend.steady) ||
    isSustainedGrowth(dwellTrend, cfg, THREAT_SUSTAINED_GROWTH_PER_MIN);
  if (growing) {
    return Math.abs(rate.degPerMin) <= CBDR_MAX_RATE_DEG_PER_MIN ? "collision_risk" : "closing";
  }
  if (trend.relativeChange <= SIZE_OPENING_REL && trend.steady) return "opening";
  return "steady";
}

/** The one caveat that must ride along with every range statement this module makes. */
const PROXY_CAVEAT =
  "RANGE IS A PROXY: no rangefinder is fitted, so \"closing\" means the detection box is growing, not a measured range.";

function buildAssessment(
  contact: Contact,
  state: ContactState,
  threat: ThreatLevel,
  rate: RateResult,
  trendResult: SizeTrendResult,
  dwellResult: SizeTrendResult,
  staticVerdict: StaticVerdict,
  cfg: ResolvedConfig,
  tMs: number,
): string {
  const trend = trendResult.trend;
  const parts: string[] = [];

  if (state === "lost") {
    const age = tMs - contact.lastSeenMs;
    parts.push(
      `LOST — not seen for ${fmtSec(age)} (timeout ${fmtSec(cfg.lostAfterMs)}); anything below is from the last sighting.`,
    );
  }

  if (contact.bearingTrueDeg === null) {
    // The single most important honesty case: without heading there is no true bearing, and every
    // temporal conclusion in this module is built on true bearing.
    parts.push(
      `Own-ship heading is unavailable, so no true bearing can be computed — only ${fmt1(contact.bearingRelDeg)}° relative to the bow. ` +
        "Bearing rate, CBDR assessment and static-scenery suppression are all disabled for this contact: while the buoy yaws on its mooring, " +
        "a relative bearing cannot tell a fixed object from a closing vessel.",
    );
    parts.push(`Seen ${contact.observationCount}× on ${contact.sources.join(", ") || "no reported source"}.`);
    return parts.join(" ");
  }

  parts.push(`Bearing ${fmt1(contact.bearingTrueDeg)}° true (${fmt1(contact.bearingRelDeg)}° rel).`);

  if (state === "static") {
    parts.push(`SCENERY / BACKGROUND CLUTTER — ${staticVerdict.reason ?? "stable bearing"}`);
    return parts.join(" ");
  }

  if (rate.degPerMin === null) {
    parts.push(`Bearing rate not yet determined: ${rate.blockedReason ?? "insufficient evidence"}.`);
  } else {
    parts.push(`Bearing rate ${fmt1(rate.degPerMin)}°/min over ${fmtSec(rate.spanMs)} (${rate.samples} sightings).`);
  }

  if (trend === null) {
    parts.push(`Range proxy not yet usable: ${trendResult.blockedReason ?? "no box-size trend"} — no closing/opening judgement is offered.`);
  } else {
    parts.push(
      `Detection box ${fmtPct(trend.relativeChange)} over ${fmtSec(trend.spanMs)} on "${trend.source}" (range proxy).`,
    );
  }

  switch (threat) {
    case "collision_risk":
      parts.push(
        `COLLISION RISK: constant bearing with a growing box — the classic constant-bearing/decreasing-range signature. ${PROXY_CAVEAT} Verify visually before manoeuvring.`,
      );
      break;
    case "closing":
      parts.push(`Closing: the box is growing while the bearing draws. ${PROXY_CAVEAT}`);
      break;
    case "opening":
      parts.push(`Opening: the box is shrinking. ${PROXY_CAVEAT}`);
      break;
    case "steady": {
      // "Steady" must never be printed as "the box is not changing" when it measurably is. A contact
      // in the band below the alert threshold gets the measured growth quoted instead, so the operator
      // sees weak-but-real evidence as exactly that rather than as an all-clear.
      const creep = dwellResult.trend;
      if (creep !== null && isSustainedGrowth(creep, cfg, STATIC_MAX_GROWTH_PER_MIN)) {
        parts.push(
          `Bearing steady, and the box has grown ${fmtRate(creep.growthPerMin)} sustained over ${fmtSec(creep.spanMs)} — ` +
            `real, but below the ${fmtRate(THREAT_SUSTAINED_GROWTH_PER_MIN)} threshold to call it closing. NOT an all-clear: ` +
            `a constant bearing with a slowly growing box is a developing collision geometry. Watch it. ${PROXY_CAVEAT}`,
        );
      } else {
        parts.push(`Steady: neither the bearing nor the box is changing appreciably. ${PROXY_CAVEAT}`);
      }
      break;
    }
    default:
      parts.push("Threat not assessed — this is an absence of evidence, not an all-clear.");
      break;
  }

  if (staticVerdict.blockedReason !== null) {
    parts.push(`Scenery test: ${staticVerdict.blockedReason}.`);
  }

  const heading = state === "confirmed" ? "Confirmed" : state === "lost" ? "Last known" : "Tentative";
  const plural = contact.observationCount === 1 ? "" : "s";
  const corroboration =
    contact.sources.length > 1
      ? ` corroborated across ${contact.sources.length} sources (${contact.sources.join(", ")})`
      : contact.sources.length === 1
        ? ` from ${contact.sources[0]}`
        : "";
  parts.push(`${heading} on ${contact.observationCount} sighting${plural}${corroboration}.`);

  return parts.join(" ");
}

export function emptyIntelState(): IntelState {
  // updatedMs 0 = "never fed a frame". The caller should treat an empty picture as "no contacts
  // reported", never as "the water is clear".
  return { contacts: [], updatedMs: 0 };
}

/** A validated observation paired with its ontology label/group. */
interface PreparedObservation {
  tMs: number;
  bearingTrueDeg: number | null;
  bearingRelDeg: number;
  sizeProxy: number;
  conf: number;
  source: string;
  label: string;
  group: string;
}

function prepareObservations(
  observations: ContactObservation[],
  labels: Array<{ label: string; group: string }>,
  tMs: number,
): PreparedObservation[] {
  const prepared: PreparedObservation[] = [];
  for (let i = 0; i < observations.length; i += 1) {
    const obs = observations[i];
    if (!obs) continue;
    // A relative bearing is the one field with no honest fallback: without it the detection cannot be
    // placed on the ring at all, so it is dropped rather than parked at 0° (dead ahead).
    if (typeof obs.bearingRelDeg !== "number" || !Number.isFinite(obs.bearingRelDeg)) continue;

    const trueDeg =
      typeof obs.bearingTrueDeg === "number" && Number.isFinite(obs.bearingTrueDeg) ? norm360(obs.bearingTrueDeg) : null;
    const size = typeof obs.sizeProxy === "number" && Number.isFinite(obs.sizeProxy) && obs.sizeProxy > 0 ? obs.sizeProxy : 0;
    const conf = typeof obs.conf === "number" && Number.isFinite(obs.conf) ? Math.min(1, Math.max(0, obs.conf)) : 0;
    const source = typeof obs.source === "string" && obs.source.length > 0 ? obs.source : "unknown-source";
    // Per-observation timestamps are deliberately IGNORED in favour of the frame's tMs. The reducer's
    // contract is one call = one frame; letting boxes inside a frame carry different clocks would
    // corrupt the duty-cycle estimate (which reads the frame period off the gaps) and the rate fit.
    const entry = labels?.[i];
    prepared.push({
      tMs,
      bearingTrueDeg: trueDeg,
      bearingRelDeg: bearingDelta(0, obs.bearingRelDeg),
      sizeProxy: size,
      conf,
      source,
      // A missing label entry is a caller wiring bug. We surface the detection with an honest
      // placeholder rather than dropping a real box off the operator's screen.
      label: typeof entry?.label === "string" && entry.label.length > 0 ? entry.label : UNLABELLED,
      group: typeof entry?.group === "string" && entry.group.length > 0 ? entry.group : "unknown",
    });
  }
  return prepared;
}

/** Angular distance used for association: true bearings when both sides have one, else relative. */
function associationDistance(contact: Contact, obs: PreparedObservation): number {
  if (contact.bearingTrueDeg !== null && obs.bearingTrueDeg !== null) {
    return Math.abs(bearingDelta(contact.bearingTrueDeg, obs.bearingTrueDeg));
  }
  return Math.abs(bearingDelta(contact.bearingRelDeg, obs.bearingRelDeg));
}

function makeContactId(obs: PreparedObservation, taken: Set<string>): string {
  // Derived from the creating frame rather than a counter, so the reducer stays pure and a replay
  // reproduces identical ids. Two contacts created in the same frame, in the same lane, at the same
  // 0.1° would have been merged by the association gate; the suffix loop is belt-and-braces.
  const bearingKey = obs.bearingTrueDeg !== null ? `t${Math.round(obs.bearingTrueDeg * 10)}` : `r${Math.round(obs.bearingRelDeg * 10)}`;
  const base = `c${obs.tMs}-${bearingKey}-${obs.group}`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}#${n}`)) n += 1;
  return `${base}#${n}`;
}

/** Most frequent label in the retained history; ties break toward the most recent sighting. */
function dominantLabel(history: HistoryEntry[], fallback: string): string {
  if (history.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const entry of history) counts.set(entry.label, (counts.get(entry.label) ?? 0) + 1);
  let best = history[history.length - 1].label;
  let bestCount = counts.get(best) ?? 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const count = counts.get(history[i].label) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = history[i].label;
    }
  }
  return best;
}

/**
 * Pure reducer: fold one detection frame into the running picture.
 *
 * `observations` and `labels` are INDEX-ALIGNED — labels[i] is the ontology classification of
 * observations[i]. One call = one frame; `tMs` is the frame's timestamp and the only clock this
 * module has (no Date.now(), so a recorded mission replays identically).
 */
export function ingestFrame(
  prev: IntelState,
  input: { tMs: number; observations: ContactObservation[]; labels: Array<{ label: string; group: string }> },
  cfg?: IntelConfig,
): IntelState {
  const config = resolveConfig(cfg);
  const tMs = input?.tMs;
  // A frame with no usable clock cannot be placed in the history at all; folding it in would corrupt
  // every rate and dwell measurement. Return the previous picture untouched.
  if (typeof tMs !== "number" || !Number.isFinite(tMs)) return prev ?? emptyIntelState();

  const previousContacts = Array.isArray(prev?.contacts) ? prev.contacts : [];
  const observations = Array.isArray(input?.observations) ? input.observations : [];
  const labels = Array.isArray(input?.labels) ? input.labels : [];

  // Working copies: contact + its recovered history, so the input state is never mutated.
  interface Working {
    contact: Contact;
    history: HistoryEntry[];
    /** Observations claimed this frame, awaiting fusion into one history entry. */
    incoming: PreparedObservation[];
    /** Sources already claimed this frame — one observation per source per contact (see below). */
    claimedSources: Set<string>;
  }

  const working: Working[] = previousContacts.map((contact) => ({
    contact: { ...contact },
    history: readHistory(contact).slice(),
    incoming: [],
    claimedSources: new Set<string>(),
  }));

  const takenIds = new Set<string>(working.map((w) => w.contact.id));

  // Strongest detections choose their contact first, so a marginal box cannot steal the association
  // a confident one deserved. Index breaks ties to keep the fold deterministic.
  const prepared = prepareObservations(observations, labels, tMs)
    .map((obs, index) => ({ obs, index }))
    .sort((a, b) => (b.obs.conf - a.obs.conf) || (a.index - b.index));

  for (const { obs } of prepared) {
    let best: Working | null = null;
    let bestDistance = Infinity;
    for (const candidate of working) {
      // The handling lane is part of the association key: a "Vessel" and an "Unclassified contact" at
      // the same bearing may well be the same pixels, but we cannot prove it, and merging them would
      // launder an unverified label onto a vessel track.
      if (candidate.contact.group !== obs.group) continue;
      // CROSS-SOURCE DEDUP happens here — a contact may absorb one observation from EACH source in a
      // frame, so the ring tile and the Target camera collapse into one corroborated contact. A
      // SECOND box from the SAME source is deliberately refused: the detector's NMS already removes
      // duplicate boxes, so two same-source boxes 8° apart are more likely two real objects, and
      // merging them would erase one.
      if (candidate.claimedSources.has(obs.source)) continue;
      const distance = associationDistance(candidate.contact, obs);
      if (distance <= config.associateDeg && distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    if (best === null) {
      // New contact seed. Pushed into `working` immediately so a later observation in this same frame
      // (from a different source) can associate to it — that is how cross-source dedup works on a
      // contact's very first frame.
      const id = makeContactId(obs, takenIds);
      takenIds.add(id);
      best = {
        contact: {
          id,
          label: obs.label,
          group: obs.group,
          state: "tentative",
          bearingTrueDeg: obs.bearingTrueDeg,
          bearingRelDeg: obs.bearingRelDeg,
          bearingRateDegPerMin: null,
          threat: "unknown",
          assessment: "",
          conf: obs.conf,
          sources: [],
          firstSeenMs: tMs,
          lastSeenMs: tMs,
          observationCount: 0,
          staticReason: null,
        },
        history: [],
        incoming: [],
        claimedSources: new Set<string>(),
      };
      working.push(best);
    }

    best.claimedSources.add(obs.source);
    best.incoming.push(obs);
  }

  // ── Fuse this frame's observations into ONE history entry per contact ──────────────────────────
  for (const w of working) {
    if (w.incoming.length === 0) continue;

    const sizeBySource: Record<string, number> = {};
    for (const obs of w.incoming) {
      if (obs.sizeProxy > 0) sizeBySource[obs.source] = obs.sizeProxy;
    }
    // Primary = highest confidence; `prepared` was sorted by confidence, so incoming[0] is it.
    const primary = w.incoming[0];
    const trueValues = w.incoming.map((obs) => obs.bearingTrueDeg);
    // If ANY source lacked a true bearing we keep null: in practice all sources share one heading, so
    // a mixed frame means something is wrong upstream, and averaging would invent a bearing.
    const fusedTrue = trueValues.every((value) => value !== null)
      ? circularMean(trueValues as number[])
      : null;
    const fusedRel = bearingDelta(0, circularMean(w.incoming.map((obs) => norm360(obs.bearingRelDeg))));

    const entry: HistoryEntry = {
      tMs,
      bearingTrueDeg: fusedTrue,
      bearingRelDeg: fusedRel,
      sizeProxy: primary.sizeProxy,
      conf: Math.max(...w.incoming.map((obs) => obs.conf)),
      sources: [...new Set(w.incoming.map((obs) => obs.source))].sort(),
      sizeBySource,
      label: primary.label,
    };
    w.history.push(entry);

    // Retention: long enough to run the dwell test twice over, hard-capped for memory. Both bounds
    // are needed — the time bound keeps a slow frame rate from starving the dwell window, the count
    // bound keeps a fast one from growing without limit.
    const retentionMs = Math.max(2 * config.staticDwellMs, 2 * config.lostAfterMs);
    let history = w.history.filter((h) => h.tMs >= tMs - retentionMs);
    if (history.length > MAX_OBSERVATIONS) history = history.slice(history.length - MAX_OBSERVATIONS);
    w.history = history;

    w.contact.lastSeenMs = tMs;
    w.contact.observationCount += 1;
    w.contact.bearingTrueDeg = entry.bearingTrueDeg;
    w.contact.bearingRelDeg = entry.bearingRelDeg;
    w.contact.conf = entry.conf;
    w.contact.label = dominantLabel(w.history, entry.label);
  }

  // ── Recompute derived intel for every contact, seen this frame or not ──────────────────────────
  const dropAfterMs = config.lostAfterMs * 2;
  const contacts: Contact[] = [];

  for (const w of working) {
    const silenceMs = tMs - w.contact.lastSeenMs;
    // Dropped outright: the contact is gone, not merely quiet. Guard against a backwards clock
    // (silenceMs < 0) so an out-of-order frame cannot delete a live picture.
    if (silenceMs > dropAfterMs) continue;

    const window = fitWindow(w.history);
    const rate = bearingRate(window, config);
    // One sample gate for both the threat call and the scenery test: a range-proxy trend read off
    // fewer samples than we demand for a bearing rate would be the weakest link in either decision.
    const trendResult = sizeTrend(window, config.minSamplesForRate);
    // The same range-proxy series over the contact's WHOLE retained history. The short window above
    // cannot see a slow closer at all, and both the scenery test and the threat call need that view —
    // computed once here so the two can never disagree about what the box has been doing.
    const dwellResult = sizeTrend(w.history, config.minSamplesForRate);
    const staticVerdict = evaluateStatic(w.contact, w.history, config, trendResult, dwellResult);

    let state: ContactState;
    if (silenceMs > config.lostAfterMs) {
      state = "lost";
    } else if (staticVerdict.isStatic) {
      state = "static";
    } else if (w.contact.observationCount >= config.confirmFrames) {
      state = "confirmed";
    } else {
      state = "tentative";
    }

    const threat: ThreatLevel =
      w.contact.bearingTrueDeg === null ? "unknown" : classifyThreat(rate, trendResult.trend, dwellResult.trend, config);

    // Sources are the contact's RECENT corroboration, not its lifetime one: a camera that saw it once
    // two minutes ago is not evidence about the contact now. A lost contact falls back to whoever saw
    // it last, so the record of who reported it never goes blank.
    const recent = w.history.filter((h) => h.tMs >= w.contact.lastSeenMs - config.lostAfterMs);
    const sourceRows = recent.length > 0 ? recent : w.history.slice(-1);
    const sources = [...new Set(sourceRows.flatMap((h) => h.sources))].sort();

    const contact: InternalContact = {
      ...w.contact,
      state,
      sources,
      bearingRateDegPerMin: w.contact.bearingTrueDeg === null ? null : rate.degPerMin,
      threat,
      staticReason: state === "static" ? staticVerdict.reason : null,
      assessment: "",
      intelHistory: w.history,
    };
    contact.assessment = buildAssessment(contact, state, threat, rate, trendResult, dwellResult, staticVerdict, config, tMs);
    contacts.push(contact);
  }

  return { contacts, updatedMs: tMs };
}

/**
 * One-line picture summary for a status strip.
 *
 * `threats` counts contacts currently demanding attention (collision_risk or closing) and excludes
 * lost and static ones. `highest` is the most attention-worthy threat among contacts that are not
 * lost; an EMPTY picture returns "unknown", which means "nothing is being reported" — never "clear".
 */
export function summarize(s: IntelState): { confirmed: number; static: number; threats: number; highest: ThreatLevel } {
  const contacts = Array.isArray(s?.contacts) ? s.contacts : [];
  let confirmed = 0;
  let staticCount = 0;
  let threats = 0;
  let highest: ThreatLevel = "unknown";

  for (const contact of contacts) {
    if (contact.state === "confirmed") confirmed += 1;
    if (contact.state === "static") staticCount += 1;
    if (contact.state === "lost") continue;
    if (contact.state !== "static" && (contact.threat === "collision_risk" || contact.threat === "closing")) {
      threats += 1;
    }
    if (THREAT_RANK[contact.threat] > THREAT_RANK[highest]) highest = contact.threat;
  }

  return { confirmed, static: staticCount, threats, highest };
}
