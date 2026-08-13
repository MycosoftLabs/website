/**
 * GET /api/psathyrella/camera/:feedId/models — MULTI-MODEL detections for one feed (owner-only).
 *
 * WHY THIS EXISTS (read before changing anything here)
 * The buoy runs one detector at a time. Today that is an RF-DETR fine-tune seeded from 36 same-scene
 * frames; pointed at an indoor room it reported "bird" at 0.95 confidence. A single model has no way
 * to know it is hallucinating — its confidence number describes how strongly it matched its own
 * training distribution, not whether the object is there. Running SEVERAL differently-trained models
 * on the SAME frame and comparing them is the only signal available on-board that can separate
 * "several independent systems saw this" from "one system asserted this". This route is the transport
 * for that comparison; it does no fusion and no scoring — it only carries every model's raw opinion
 * across, unmerged and attributed, so the audit trail survives all the way to the operator.
 *
 * SIBLING ROUTE: ./detections — same auth, same retry discipline, same PIXEL bbox contract. Keep them
 * in step; this one is that route generalized from one model to N.
 *
 * UPSTREAM SHAPES — two are accepted deliberately (no flag day), the third is refused
 *  A. Multi-model (the contract requested of Cursor):
 *       { ts, frames:{ quad360:{frameW,frameH}, ... },
 *         models:[ { modelId, engine?, latencyMs?, error?,
 *                    detections:[ {source, class, confidence, bbox:[x1,y1,x2,y2]} ] } ] }
 *  B. The CURRENT single-model `/detect` shape ({ engine, detections:[...] }) — wrapped here as ONE
 *     model named after `engine`. That means this route works TODAY against the live endpoint and
 *     degrades to an honest one-model scoreboard instead of 503-ing until the backend catches up.
 *     A one-model comparison must never be presented as corroboration; that is the UI's job, and the
 *     `models.length === 1` it sees here is what tells it so.
 *  C. NOT A FRAME AT ALL — what `/detect/models` actually answers today: a model REGISTRY (see the
 *     guard below). That is refused with a 503, never reshaped into shape A.
 *
 * BBOX UNITS: corner [x1,y1,x2,y2] → {x,y,w,h}, still in SOURCE PIXELS. We return the per-source
 * frameW/frameH the detector reports (`frames[feedId]`) and NEVER hardcode 1920x1080 — the pano is
 * 3840x540 and the BEV 800x800, so an assumed resolution silently misplaces every box, and a
 * misplaced box on this console reads as a real contact on the wrong bearing.
 *
 * No synthetic detections, ever: unconfigured = 503, dead upstream = 502, capability-only upstream =
 * 503, a model that errored comes back with an empty detection list and its error string preserved —
 * never as "clear".
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Worst case here is 2 attempts x a 12s upstream budget (see the retry loop). A platform default of
// 10-15s would kill the route mid-probe and resurrect the exact "502 against a live detector" bug
// that budget exists to fix, so the ceiling is stated rather than inherited.
export const maxDuration = 30;

// Each surface has its OWN coordinate space, which is why boxes are never cross-projected between
// them. Mirrors FEEDS in the detections route.
const FEEDS = new Set(["quad360", "front", "pano", "bev"]);
const CAMERA_SVC = process.env.PSATHYRELLA_CAMERA_URL || "";

/**
 * The detector is ONE endpoint that tags each box with the feed it came from (`source`) — not
 * per-feed paths. Same convention as `/detect`: an explicit URL wins, otherwise it hangs off the
 * camera service base.
 */
function upstreamFor(): string {
  if (process.env.PSATHYRELLA_CAM_MODELS_URL) return process.env.PSATHYRELLA_CAM_MODELS_URL;
  if (CAMERA_SVC) return `${CAMERA_SVC}/detect/models`;
  return "";
}

type RawDetection = {
  source?: string;
  class?: string;
  cls?: string;
  confidence?: number;
  conf?: number;
  bbox?: number[];
  trackId?: string | number;
  track_id?: string | number;
};

type RawModel = {
  modelId?: string;
  model_id?: string;
  model?: string;
  /** What the live Jetson registry actually keys identity on — see modelIdOf. */
  id?: string;
  engine?: string;
  name?: string;
  latencyMs?: number;
  latency_ms?: number;
  error?: unknown;
  detections?: RawDetection[];
};

type RawPayload = {
  ts?: string;
  /** Per-source frame dimensions, e.g. { quad360:{frameW,frameH}, pano:{...} }. */
  frames?: Record<string, { frameW?: number; frameH?: number }>;
  frameW?: number;
  frameH?: number;
  models?: RawModel[];
  /** Shape B (single model) fields. */
  engine?: string;
  latencyMs?: number;
  latency_ms?: number;
  error?: unknown;
  detections?: RawDetection[];
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Model identity, in the order the backend is most likely to mean it. Never invented silently.
 *
 * `id` is read BEFORE `engine` because the live registry names three distinct RF-DETR checkpoints
 * (rfdetr-maritime / -ema / -regular) that all carry `engine: "rfdetr"`. Falling through to `engine`
 * would collapse them to rfdetr / rfdetr#2 / rfdetr#3 — i.e. one weights family appearing to
 * corroborate itself under three names, which is the precise failure the dedup below exists to stop.
 */
function modelIdOf(m: RawModel, index: number): string {
  const named = m.modelId ?? m.model_id ?? m.model ?? m.id ?? m.engine ?? m.name;
  // An unnamed model still has to be distinguishable in the audit trail, so it gets a positional id
  // that is obviously positional rather than a guessed engine name.
  return typeof named === "string" && named.trim().length > 0 ? named.trim() : `model_${index + 1}`;
}

/**
 * Preserve an upstream error as operator-readable text.
 *
 * A model that errored DID NOT RUN. Returning `null` here would make it indistinguishable from a
 * model that ran and saw nothing — the difference between "no contact" and "no coverage".
 */
function errorOf(v: unknown): string | null {
  // undefined | null | false | 0 | "" all mean "no error". Serializers differ on how they spell a
  // healthy model (`error: null`, `error: false`, `error: 0`, key omitted), and reading any of those
  // as a failure would blank out a model that actually ran — silently shrinking the evidence base.
  if (!v) return null;
  // A whitespace-only string is also "no error"; inventing a message for it would report an outage
  // that did not happen.
  if (typeof v === "string") return v.trim().length > 0 ? v.trim() : null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Objects/arrays have no faithful short text form; record the type so the operator can tell a
  // malformed payload from a real message rather than seeing "[object Object]".
  return `upstream reported a non-text error (${Array.isArray(v) ? "array" : typeof v})`;
}

/**
 * Stamped on a model that reported NEITHER an error NOR a `detections` array.
 *
 * The shape-C guard below rejects a payload where NO model has a detection list. This is the same
 * reasoning applied per model, for the mixed payload the backend will produce mid-migration: a row
 * with no detection list did not report on this frame, and passing it through as error:null +
 * detections:[] would credit it with having looked and seen nothing. `error` is the only channel the
 * fusion layer honours for exclusion, so this is what keeps such a row out of the denominator. A
 * false outage is the safe direction here; a false all-clear is not.
 */
const NO_FRAME_RESULT =
  "model listed as available but returned no detection list for this frame — it did not report, so it neither confirms nor denies anything here";

/**
 * Convert one model's raw boxes for this feed.
 *
 * Feed attribution matches the detections route exactly: an UNTAGGED box is assumed to be the quad
 * composite (the only stream the detector currently runs on) and is never attributed to the Target,
 * whose sensor does not exist yet — a box labelled "Target" from quad pixels would read as a false
 * forward contact.
 */
function convert(dets: RawDetection[], feedId: string, modelSlot: number) {
  const mine = dets.filter((d) => (d.source ? d.source === feedId : feedId === "quad360"));
  return mine.flatMap((d, i) => {
    const b = d.bbox;
    if (!Array.isArray(b) || b.length < 4) return [];
    const [x1, y1, x2, y2] = b.map((n) => num(n));
    if (x1 === null || y1 === null || x2 === null || y2 === null) return [];
    const conf = num(d.confidence) ?? num(d.conf);
    const cls = d.class ?? d.cls;
    if (conf === null || !cls) return [];
    const trackRaw = d.trackId ?? d.track_id;
    return [{
      // Ids must be unique ACROSS models — the fusion layer keys votes by them, and a collision
      // between two models' first box would merge two independent opinions into one.
      id: `m${modelSlot}_det_${i}`,
      // Numeric ids too — DeepStream nvtracker emits uint64 track ids, not strings.
      trackId: trackRaw === undefined || trackRaw === null ? null : String(trackRaw),
      cls,
      conf,
      // corner → size, still in SOURCE PIXELS (the client normalizes with the reported frame dims)
      bbox: { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) },
    }];
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ feedId: string }> }) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { feedId } = await params;
  if (!FEEDS.has(feedId)) return NextResponse.json({ error: "bad_feed" }, { status: 400 });

  const upstream = upstreamFor();
  if (!upstream) {
    return NextResponse.json(
      {
        error: "models_not_configured",
        feedId,
        hint: "Run the multi-model detector on the Jetson and set PSATHYRELLA_CAM_MODELS_URL (or PSATHYRELLA_CAMERA_URL).",
      },
      { status: 503 },
    );
  }

  // Retry-fresh: the dev-PC → Jetson link has a documented intermittent first-SYN stall where a fresh
  // connection recovers instantly (observed failing 3 of 5 consecutive probes). The per-attempt budget
  // is larger than the single-model route's because this endpoint walks every model on the device.
  //
  // THE BUDGET IS MEASURED, NOT GUESSED. A HEALTHY `/detect/models` takes 6.98-7.45s (8 samples,
  // Aug 02 2026, every one HTTP 200) — it probes each weight file and package rather than answering
  // from a cache. The previous 5000ms therefore aborted all four attempts against a perfectly live
  // detector and returned 502 "models_unavailable": reporting an UP sensor as dead, which is the same
  // class of lie as reporting a dead one as clear, and it left the comparison panel permanently dark.
  // Keep this ceiling above the measured round trip whenever the model set changes. Attempts drop
  // 4 → 2 because every aborted attempt still costs the Jetson a full ~7s probe pass that we discard.
  let raw: RawPayload | null = null;
  for (let i = 0; i < 2 && !raw; i++) {
    try {
      const res = await fetch(upstream, {
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.ok) raw = (await res.json()) as RawPayload;
    } catch { /* stall → retry fresh */ }
  }
  if (!raw) return NextResponse.json({ error: "models_unavailable", feedId }, { status: 502 });

  // Shape A when the backend reports a model array; shape B (today's live `/detect`) wrapped as one.
  const rawModels: RawModel[] = Array.isArray(raw.models)
    ? raw.models
    : [{ engine: raw.engine, latencyMs: raw.latencyMs ?? raw.latency_ms, error: raw.error, detections: raw.detections }];

  // SHAPE C — a capability listing is NOT a frame result, and is never laundered into one.
  //
  // Verified live Aug 02 2026: `/detect/models` answers with a model REGISTRY — rows of
  // {id, engine, available, weights, license, role, latencyMs, error} carrying the payload's own note
  // "latencyMs filled after a live /detect cycle per model; availability is real weight/package probe
  // (no mock)". Not one row describes a frame. Parsed as shape A it yields five models with
  // error:null and detections:[] — five detectors each credited with having LOOKED and seen nothing,
  // when none of them has been shown a pixel. "No contacts" from a model that never inferenced is the
  // most dangerous sentence this console can print, so we refuse rather than reshape.
  //
  // The discriminator is structural: a frame result carries a `detections` array on at least one
  // model. An EMPTY array still qualifies — that is a real, honest zero from a model that ran. A
  // payload with no `detections` array anywhere told us about capability, not about the water.
  if (!rawModels.some((m) => Array.isArray(m.detections))) {
    return NextResponse.json(
      {
        error: "models_registry_only",
        feedId,
        // Named for what it is — a roster of what is INSTALLED, not of what looked at this frame.
        modelsInstalled: rawModels.map((m, i) => modelIdOf(m, i)),
        hint:
          "Upstream answered with model availability only — no per-model `detections` array anywhere in the payload. The comparison needs the multi-model FRAME shape from the handoff contract: models:[{ modelId, latencyMs?, error?, detections:[{source,class,confidence,bbox:[x1,y1,x2,y2]}] }]. Until the detector emits that, the scoreboard must read NOT RUNNING — never N models with zero contacts.",
      },
      { status: 503 },
    );
  }

  // Two entries can carry the same engine name (e.g. the same weights at two input sizes). Suffixing
  // keeps them separate: silently collapsing them would let ONE model appear to corroborate ITSELF,
  // which is the exact failure this whole feature exists to prevent.
  const used = new Map<string, number>();
  const models = rawModels.map((m, slot) => {
    const base = modelIdOf(m, slot);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const modelId = seen === 0 ? base : `${base}#${seen + 1}`;
    // A real upstream error wins: it is the more specific fact and the operator should see the actual
    // failure, not our downstream reading of a missing field.
    const error = errorOf(m.error) ?? (Array.isArray(m.detections) ? null : NO_FRAME_RESULT);
    const dets = Array.isArray(m.detections) ? m.detections : [];
    return {
      modelId,
      latencyMs: num(m.latencyMs) ?? num(m.latency_ms),
      error,
      // A model that reported an error did not produce a usable frame. Any boxes riding along with an
      // error are dropped rather than mixed into the vote — half-run inference is not evidence.
      detections: error ? [] : convert(dets, feedId, slot),
    };
  });

  return NextResponse.json(
    {
      feedId,
      // Jetson clock is ISO-8601, not epoch ms. Falls back to null (NOT Date.now()) so the client can
      // tell "backend didn't say" from a real inference timestamp.
      tMs: raw.ts ? Date.parse(raw.ts) || null : null,
      // PIXEL space. Per-source dims from the detector are authoritative — see the header note.
      frameW: num(raw.frames?.[feedId]?.frameW) ?? num(raw.frameW),
      frameH: num(raw.frames?.[feedId]?.frameH) ?? num(raw.frameH),
      bboxUnits: "pixels" as const,
      models,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
