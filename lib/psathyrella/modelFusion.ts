/**
 * Multi-model fusion / consensus engine — turn N independent detectors into ONE honest picture.
 *
 * WHY THIS FILE EXISTS
 * The buoy has been running ONE detector at a time. The current one is an RF-DETR fine-tune seeded
 * from only 36 same-scene frames; pointed at an indoor room it reported "bird" at 0.95 confidence.
 * A single model has no way to know it is hallucinating — confidence is the model's opinion of
 * itself, and a badly-seeded model is confidently wrong. There is no signal inside one model's
 * output that separates "I see a bird" from "I have never seen anything but this one dock".
 *
 * The only cheap source of INDEPENDENT evidence is another model trained differently. If a COCO
 * YOLO, an RF-DETR fine-tune and an open-vocabulary detector all put a box in the same place, that
 * is corroboration: three different training distributions had to fail the same way at the same
 * pixels. If only one of them sees it, it is a HYPOTHESIS, and this module says so in those words.
 *
 * THE VOCABULARY PROBLEM (why the ontology is load-bearing here)
 * Models do not share a label set. RF-DETR emits "vessel", COCO emits "boat", an open-vocab model
 * emits "a small boat on the water". Compared as raw strings those three NEVER agree, and a naive
 * fusion engine would report three separate single-model contacts where there is one corroborated
 * vessel — inverting the very signal we are building. So agreement is computed on the ontology
 * GROUP from `classifyDetection` (@/lib/psathyrella/maritimeOntology), which is the shared
 * comparable space across vocabularies.
 *
 * WHAT THIS MODULE REFUSES TO DO
 *  - It never invents a detection, a model, or a vote.
 *  - It never presents a single-model detection as verified — `assessment` names the number of
 *    models that agreed, every time.
 *  - It never picks a winner silently when models disagree about WHAT an object is. It flags
 *    `labelConflict`, shows the highest-confidence label, and says the identification is unresolved.
 *  - It never scores a model as "hallucinating" or "uniquely capable". A detection only one model
 *    saw is reported as `unique` — a count, not a verdict. Both readings are live and only the
 *    operator (or ground truth) can settle it.
 *
 * Pure module: no React, no fetch, no clock, no randomness. Same input → same output, always.
 */

import type { CameraDetection } from "@/lib/psathyrella/contract";
import { classifyDetection, type MaritimeGroup } from "@/lib/psathyrella/maritimeOntology";

/** One model's output for ONE frame. `error` non-null means the run FAILED — see `fuseModels`. */
export interface ModelResult {
  modelId: string;
  detections: CameraDetection[];
  latencyMs?: number | null;
  error?: string | null;
}

/**
 * How much independent support a fused object has.
 *
 * THRESHOLDS (checked in this exact order — the order is the correctness, see `classifyCorroboration`):
 *  - "single"    — exactly ONE model found it. Checked FIRST, before "consensus", because with one
 *                  model running "everybody agreed" is vacuously true and would be a lie.
 *  - "disputed"  — more than one model found an object here but they disagree. Either they disagree
 *                  on WHAT it is (`labelConflict`), or the models that saw it are outnumbered by the
 *                  models that ran and did not.
 *  - "consensus" — EVERY model that ran found it (and they agree on the group). Requires >= 2 models.
 *  - "majority"  — strictly more than half of the models that ran found it, and they agree.
 */
export type Corroboration = "consensus" | "majority" | "single" | "disputed";

export interface FusedDetection {
  id: string;
  /** Consensus display label via the ontology (models disagree on wording; the ontology normalizes). */
  label: string;
  group: string;
  /** Fused box (confidence-weighted mean of the agreeing boxes). Normalized 0..1. */
  bbox: { x: number; y: number; w: number; h: number };
  /** Highest confidence any single model gave it. */
  maxConf: number;
  /** Mean confidence across the models that FOUND it (not across all models). */
  meanConf: number;
  /** Which models found it, with each one's own raw class + conf — the audit trail. */
  votes: Array<{ modelId: string; rawClass: string; conf: number }>;
  /**
   * models that found it / models that ran.
   *
   * NOT a quality score and NOT a verification flag. With ONE model running, a completely
   * uncorroborated detection is 1/1 = 1.0 — rendered as a bare "100%" that would read as
   * confirmed. Gate any presentation on `corroboration`, which is the field that knows the
   * difference; use this number only for ordering or alongside the raw vote counts.
   */
  agreement: number;
  corroboration: Corroboration;
  /** True when models found the same OBJECT but disagree on the ONTOLOGY GROUP — a real red flag. */
  labelConflict: boolean;
  /** Operator-facing sentence. Must state how many models agreed and never overstate. */
  assessment: string;
}

export interface ModelScore {
  modelId: string;
  detections: number;
  /** Found by this model AND corroborated by >=1 other. */
  corroborated: number;
  /**
   * Found ONLY by this model — UNCORROBORATED, and that is the whole claim. It is not evidence of
   * a unique capability and not evidence of a hallucination; only ground truth settles which, so
   * neither reading may be rendered, implied, or colour-coded as the likely one.
   */
  unique: number;
  /** corroborated / detections, null when detections === 0. */
  agreementRate: number | null;
  meanConf: number | null;
  latencyMs: number | null;
  error: string | null;
}

export interface FusionResult {
  fused: FusedDetection[];
  scores: ModelScore[];
  /** Pairwise agreement counts: pairwise[a][b] = objects both found. */
  pairwise: Record<string, Record<string, number>>;
  modelsRan: number;
  /** Objects at least one model saw. */
  totalObjects: number;
}

export interface FusionConfig {
  iouThreshold?: number;
  minConf?: number;
}

/**
 * Defaults.
 *
 * `iouThreshold: 0.45` — two detectors that agree an object is there rarely draw the same box to the
 * pixel; different backbones and different box heads shift edges. 0.45 is loose enough that a real
 * shared object survives the disagreement, tight enough that two boats abeam do not merge into one.
 *
 * `minConf: 0` — we drop NOTHING by default. Hiding a real contact is the dangerous failure mode
 * (the same rule `shouldSurface` follows in the maritime ontology), and confidence thresholds are
 * exactly what failed us: the hallucinated "bird" arrived at 0.95. Filtering is opt-in, never silent.
 */
export const DEFAULT_FUSION_CONFIG: Required<FusionConfig> = Object.freeze({
  iouThreshold: 0.45,
  minConf: 0,
});

/** Numbers arrive over the wire from the Jetson; a NaN would silently poison every downstream mean. */
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Intersection-over-union of two normalized boxes. Returns 0 (never NaN, never throws) for degenerate
 * input — a zero-area or malformed box simply matches nothing and ends up as its own single-model
 * object, which is the honest outcome: we could not geometrically corroborate it.
 */
export function iou(a: CameraDetection["bbox"], b: CameraDetection["bbox"]): number {
  if (!a || !b) return 0;
  const ax = num(a.x);
  const ay = num(a.y);
  const aw = num(a.w);
  const ah = num(a.h);
  const bx = num(b.x);
  const by = num(b.y);
  const bw = num(b.w);
  const bh = num(b.h);
  if (aw <= 0 || ah <= 0 || bw <= 0 || bh <= 0) return 0;

  const ix = Math.max(ax, bx);
  const iy = Math.max(ay, by);
  const ix2 = Math.min(ax + aw, bx + bw);
  const iy2 = Math.min(ay + ah, by + bh);
  const iw = ix2 - ix;
  const ih = iy2 - iy;
  if (iw <= 0 || ih <= 0) return 0;

  const inter = iw * ih;
  const union = aw * ah + bw * bh - inter;
  if (union <= 0) return 0;
  // Clamped because binary floating point can push two IDENTICAL boxes to 1.0000000000000004 (the
  // intersection is recomputed from summed edges, so it rounds differently from the raw w*h areas).
  // An IoU above 1 is mathematically impossible; letting one escape would corrupt any downstream
  // consumer that treats this as a 0..1 quality figure (a match-strength bar, a percentage readout).
  return Math.min(1, inter / union);
}

/** One admitted detection, tagged with the participant that produced it and its ontology group. */
interface Candidate {
  /** Index into `participants` — NOT the modelId string. Identity for the one-vote-per-model rule. */
  participant: number;
  modelId: string;
  det: CameraDetection;
  conf: number;
  group: MaritimeGroup;
  label: string;
  rawClass: string;
}

interface Cluster {
  /** Highest-confidence member; every later candidate is matched against THIS box (see below). */
  seed: Candidate;
  members: Candidate[];
  participants: Set<number>;
}

/** A model that actually produced an observation this frame, after de-duplicating repeated modelIds. */
interface Participant {
  modelId: string;
  detections: CameraDetection[];
  latencyMs: number | null;
  error: string | null;
}

/**
 * Collapse `results` into one participant per DISTINCT modelId.
 *
 * WHY: if the caller hands us the same modelId twice (a duplicated fan-out entry, a retried request
 * merged into the list), treating them as two voters lets a model CORROBORATE ITSELF — manufacturing
 * exactly the independent second opinion this engine exists to measure. One model is one voter, so
 * its detections are concatenated and the one-detection-per-model-per-cluster rule then applies
 * across the whole concatenation.
 */
function toParticipants(results: ModelResult[]): Participant[] {
  const byId = new Map<string, Participant>();
  const order: string[] = [];
  for (const r of results) {
    if (!r) continue;
    const modelId = typeof r.modelId === "string" ? r.modelId : "";
    const dets = Array.isArray(r.detections) ? r.detections : [];
    const err = typeof r.error === "string" && r.error.length > 0 ? r.error : null;
    const lat = typeof r.latencyMs === "number" && Number.isFinite(r.latencyMs) ? r.latencyMs : null;
    const existing = byId.get(modelId);
    if (existing) {
      existing.detections = existing.detections.concat(dets);
      // First reported failure wins: once a run has errored, the model's output for this frame is
      // suspect as a whole and a later clean chunk must not clear that flag.
      existing.error = existing.error ?? err;
      existing.latencyMs = existing.latencyMs ?? lat;
      continue;
    }
    byId.set(modelId, { modelId, detections: dets.slice(), latencyMs: lat, error: err });
    order.push(modelId);
  }
  // Input order preserved so callers can line `scores` up with the list they passed in.
  return order.map((id) => byId.get(id) as Participant);
}

/**
 * Assign a corroboration bucket. Order of the checks IS the correctness — see `Corroboration`.
 */
function classifyCorroboration(voteCount: number, modelsRan: number, labelConflict: boolean): Corroboration {
  // ONE model is never corroboration, even when it is the only model that ran. Checked before the
  // consensus test on purpose: with modelsRan === 1, `voteCount === modelsRan` is trivially true and
  // would stamp "consensus" on an utterly unconfirmed detection. That is the exact overstatement
  // this module exists to prevent.
  if (voteCount <= 1) return "single";
  // Models found the same object but cannot agree what it is — never resolve that silently.
  if (labelConflict) return "disputed";
  if (voteCount >= modelsRan) return "consensus";
  // Strictly MORE than half. With 4 models, 2 is not a majority.
  if (voteCount * 2 > modelsRan) return "majority";
  // >1 model agrees, but they are outnumbered by the models that ran and did NOT report it (e.g. 2
  // of 5). That is weak, contested support: too strong to call "single", far too weak to call a
  // "majority". It lands in "disputed" — the models materially disagree about whether it is there —
  // and `assessment` states the raw counts so the operator is never left guessing which kind.
  return "disputed";
}

/** "1 model" / "3 models" — a plural "1 models" in an operator sentence reads as a bug in the console. */
function plural(n: number): string {
  return n === 1 ? "1 model" : `${n} models`;
}

/** Build the operator sentence. Never claims more support than `votes` actually shows. */
function buildAssessment(
  votes: FusedDetection["votes"],
  modelsRan: number,
  corroboration: Corroboration,
  labelConflict: boolean,
  label: string,
  groupsSeen: string[],
): string {
  const found = votes.length;
  const missing = Math.max(0, modelsRan - found);

  if (corroboration === "single") {
    const only = votes[0]?.modelId || "an unnamed model";
    return missing > 0
      ? `Only ${only} found this — unconfirmed by the other ${plural(missing)}. Treat as a hypothesis, not a contact.`
      : `Only ${only} found this, and no other model ran — nothing corroborates it. Treat as a hypothesis, not a contact.`;
  }

  if (labelConflict) {
    // Spell out who called it what: the disagreement itself is the information the operator needs.
    const detail = votes.map((v) => `${v.modelId} "${v.rawClass}"`).join(" vs ");
    return (
      `${found} of ${modelsRan} models found an object here but disagree on what it is (${detail}; ` +
      `groups: ${groupsSeen.join(", ")}). Shown as the highest-confidence label "${label}" — identification unresolved.`
    );
  }

  if (corroboration === "consensus") {
    return `${found} of ${modelsRan} models agree — ${label}.`;
  }

  if (corroboration === "majority") {
    return `${found} of ${modelsRan} models agree — ${label}; ${plural(missing)} did not report it.`;
  }

  // Minority corroboration (see classifyCorroboration): more models missed it than found it.
  return `${found} of ${modelsRan} models agree — ${label}; ${plural(missing)} did not report it. Weak corroboration.`;
}

/**
 * Fuse N models' detections into one picture plus a head-to-head benchmark.
 *
 * THE ERROR TRAP (guarded explicitly below): a model whose run FAILED did not observe anything. It
 * is excluded from `modelsRan`, from the agreement denominator, and its detections are not admitted
 * as evidence. Counting a crashed model as a participant would drag every genuinely corroborated
 * object down a bucket (a real 2-of-2 consensus reported as a 2-of-3 "majority"), and admitting its
 * partial output would let a crash masquerade as an independent second opinion. Its `error` is
 * surfaced in `scores` so the outage is visible rather than silently absorbed into the math.
 *
 * Never throws. `fuseModels([])` and all-empty input return an empty result with no fabricated rows.
 */
export function fuseModels(results: ModelResult[], cfg?: FusionConfig): FusionResult {
  const iouThreshold =
    typeof cfg?.iouThreshold === "number" && Number.isFinite(cfg.iouThreshold)
      ? Math.min(1, Math.max(0, cfg.iouThreshold))
      : DEFAULT_FUSION_CONFIG.iouThreshold;
  const minConf =
    typeof cfg?.minConf === "number" && Number.isFinite(cfg.minConf)
      ? Math.max(0, cfg.minConf)
      : DEFAULT_FUSION_CONFIG.minConf;

  const participants = toParticipants(Array.isArray(results) ? results : []);

  // ── Admit evidence ──────────────────────────────────────────────────────────────────────────
  const candidates: Candidate[] = [];
  const admittedByParticipant: number[] = participants.map(() => 0);
  const confSumByParticipant: number[] = participants.map(() => 0);

  participants.forEach((p, pi) => {
    if (p.error) return; // THE ERROR TRAP — a failed run contributes no evidence at all.
    for (const det of p.detections) {
      if (!det || typeof det !== "object") continue;
      const conf = num(det.conf);
      if (conf < minConf) continue;
      const cls = typeof det.cls === "string" ? det.cls : "";
      const classified = classifyDetection(cls);
      candidates.push({
        participant: pi,
        modelId: p.modelId,
        det,
        conf,
        group: classified.group,
        label: classified.displayLabel,
        // The ontology preserves the detector's own string; that is what the audit trail must show.
        rawClass: classified.rawClass,
      });
      admittedByParticipant[pi] += 1;
      confSumByParticipant[pi] += conf;
    }
  });

  const modelsRan = participants.reduce((n, p) => (p.error ? n : n + 1), 0);

  // ── Cluster across models ───────────────────────────────────────────────────────────────────
  // Highest confidence first, so the strongest evidence seeds each cluster. Ties broken on modelId
  // then detection id purely so the output is deterministic frame to frame (stable React keys).
  const ordered = candidates.slice().sort((a, b) => {
    if (b.conf !== a.conf) return b.conf - a.conf;
    if (a.modelId !== b.modelId) return a.modelId < b.modelId ? -1 : 1;
    const aid = typeof a.det.id === "string" ? a.det.id : "";
    const bid = typeof b.det.id === "string" ? b.det.id : "";
    return aid < bid ? -1 : aid > bid ? 1 : 0;
  });

  const clusters: Cluster[] = [];
  for (const cand of ordered) {
    let best: Cluster | null = null;
    let bestIou = 0;
    for (const c of clusters) {
      // ONE VOTE PER MODEL. A model's own NMS already de-duplicated its output, so two boxes from
      // the same model are two OBJECTS. Merging them would erase one contact from the display and
      // simultaneously inflate that cluster's apparent support. Non-negotiable.
      if (c.participants.has(cand.participant)) continue;
      // Matched against the SEED only, not against every member. Single-linkage would let A~B and
      // B~C chain A and C together even when A and C do not overlap at all — that is how two
      // distinct hulls in a line abeam become one phantom object.
      const overlap = iou(cand.det.bbox, c.seed.det.bbox);
      if (overlap >= iouThreshold && overlap > bestIou) {
        best = c;
        bestIou = overlap;
      }
    }
    if (best) {
      best.members.push(cand);
      best.participants.add(cand.participant);
    } else {
      clusters.push({ seed: cand, members: [cand], participants: new Set([cand.participant]) });
    }
  }

  // ── Cluster → FusedDetection ────────────────────────────────────────────────────────────────
  const usedIds = new Set<string>();
  const fused: FusedDetection[] = clusters.map((c, ci) => {
    // Votes ordered by confidence so the audit trail reads strongest-first; deterministic ties.
    const members = c.members.slice().sort((a, b) => {
      if (b.conf !== a.conf) return b.conf - a.conf;
      return a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0;
    });

    const votes = members.map((m) => ({ modelId: m.modelId, rawClass: m.rawClass, conf: m.conf }));
    const maxConf = members.reduce((mx, m) => (m.conf > mx ? m.conf : mx), 0);
    const meanConf = members.reduce((s, m) => s + m.conf, 0) / members.length;

    // CROSS-VOCABULARY AGREEMENT: compared on ontology GROUP, never on the raw string. "vessel",
    // "boat" and "ship" are three vocabularies naming one thing and must corroborate each other.
    const groupsSeen: string[] = [];
    for (const m of members) {
      if (!groupsSeen.includes(m.group)) groupsSeen.push(m.group);
    }
    const labelConflict = groupsSeen.length > 1;

    // On conflict the highest-confidence vote supplies the label — but `labelConflict` stays set and
    // `assessment` names the disagreement, so nothing is resolved behind the operator's back.
    const winner = members[0];

    // Confidence-weighted mean box over the agreeing detections. If every weight is 0 (a detector
    // reporting conf 0, or malformed confidences) fall back to an unweighted mean rather than
    // dividing by zero and emitting a NaN box that would draw nothing / draw everywhere.
    const wSum = members.reduce((s, m) => s + Math.max(0, m.conf), 0);
    const useWeights = wSum > 0;
    const acc = { x: 0, y: 0, w: 0, h: 0 };
    for (const m of members) {
      const wt = useWeights ? Math.max(0, m.conf) : 1;
      const b = m.det.bbox;
      acc.x += num(b?.x) * wt;
      acc.y += num(b?.y) * wt;
      acc.w += num(b?.w) * wt;
      acc.h += num(b?.h) * wt;
    }
    const denom = useWeights ? wSum : members.length;
    const bbox = { x: acc.x / denom, y: acc.y / denom, w: acc.w / denom, h: acc.h / denom };

    const corroboration = classifyCorroboration(members.length, modelsRan, labelConflict);
    // modelsRan is >= 1 whenever a cluster exists (a cluster requires an admitted detection, which
    // requires a model that did not error), so this division is safe.
    const agreement = members.length / modelsRan;

    // Derived from the seed's tracker/detection id so the key survives across frames for the same
    // object; suffixed only on a genuine collision so two objects can never share a React key.
    const seedRef = c.seed.det.trackId || c.seed.det.id || `idx${ci}`;
    let id = `fused:${c.seed.modelId}:${seedRef}`;
    if (usedIds.has(id)) id = `${id}#${ci}`;
    usedIds.add(id);

    return {
      id,
      label: winner.label,
      group: winner.group,
      bbox,
      maxConf,
      meanConf,
      votes,
      agreement,
      corroboration,
      labelConflict,
      assessment: buildAssessment(votes, modelsRan, corroboration, labelConflict, winner.label, groupsSeen),
    };
  });

  // Corroborated objects first, then confidence: what several models saw outranks one model's
  // hypothesis in the operator's list. Ties broken on id so the order never jitters between frames.
  fused.sort((a, b) => {
    if (b.agreement !== a.agreement) return b.agreement - a.agreement;
    if (b.maxConf !== a.maxConf) return b.maxConf - a.maxConf;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // ── Per-model scorecard ─────────────────────────────────────────────────────────────────────
  const corroboratedByParticipant: number[] = participants.map(() => 0);
  const uniqueByParticipant: number[] = participants.map(() => 0);
  for (const c of clusters) {
    const supported = c.members.length > 1;
    for (const m of c.members) {
      if (supported) corroboratedByParticipant[m.participant] += 1;
      else uniqueByParticipant[m.participant] += 1;
    }
  }

  const scores: ModelScore[] = participants.map((p, pi) => {
    // A failed run has no observations to score. Reporting 0/0 with a null rate — rather than an
    // agreementRate of 0 — keeps a CRASH from reading like a model that agreed with nobody.
    if (p.error) {
      return {
        modelId: p.modelId,
        detections: 0,
        corroborated: 0,
        unique: 0,
        agreementRate: null,
        meanConf: null,
        latencyMs: p.latencyMs,
        error: p.error,
      };
    }
    const n = admittedByParticipant[pi];
    return {
      modelId: p.modelId,
      detections: n,
      corroborated: corroboratedByParticipant[pi],
      unique: uniqueByParticipant[pi],
      agreementRate: n > 0 ? corroboratedByParticipant[pi] / n : null,
      meanConf: n > 0 ? confSumByParticipant[pi] / n : null,
      latencyMs: p.latencyMs,
      error: null,
    };
  });

  // ── Pairwise head-to-head ───────────────────────────────────────────────────────────────────
  // Dense matrix over EVERY model handed in (errored models included, all zeros) so a renderer can
  // index any pair without a null check. Diagonal pairwise[a][a] = objects a found at all, which is
  // the co-occurrence convention and gives a heatmap its scale row.
  const pairwise: Record<string, Record<string, number>> = {};
  for (const a of participants) {
    pairwise[a.modelId] = {};
    for (const b of participants) pairwise[a.modelId][b.modelId] = 0;
  }
  for (const c of clusters) {
    for (const m of c.members) {
      for (const n of c.members) {
        pairwise[m.modelId][n.modelId] += 1;
      }
    }
  }

  return {
    fused,
    scores,
    pairwise,
    modelsRan,
    totalObjects: fused.length,
  };
}
