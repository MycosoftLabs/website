"use client";

/**
 * RelabelPopover — the operator half of the learning loop.
 *
 * The buoy's detector is a FROZEN COCO-80 model with no maritime prior: at sea it calls the tower's own
 * antenna whips "bottle" and dock scenery "couch"/"toilet". The ontology layer stops those strings from
 * reaching the operator's eyes, but hiding a wrong label does not fix it. The pilot watching this feed
 * is the only reliable maritime labeler in the system, and today every judgement they make is discarded
 * the instant the next 1 Hz frame lands. This popover is what makes one of those judgements durable:
 * a real label, on real pixels, from THIS tower in THIS harbor — one training example per correction.
 *
 * HONESTY, ENFORCED IN THE UI: this CAPTURES data. It does not make the live model smarter. Nothing
 * submitted here changes inference on the Jetson; the detector only improves after a human runs an
 * offline fine-tune on the export and deploys new weights. The panel says so in plain words, because an
 * operator who believes the detector just learned something will trust the next frame more than they
 * should.
 *
 * The correction targets are drawn from the MARITIME half of the ontology only. The implausible COCO
 * leaves ("toilet", "couch") are never offered: the entire point of the loop is to pull the vocabulary
 * toward maritime meaning, and an operator handed "couch" as a correction target would be teaching the
 * next model the same nonsense the current one emits.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { AlertTriangle, Ban, Check, Loader2, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MARITIME_ONTOLOGY,
  classifyDetection,
  groupColor,
  type MaritimeGroup,
} from "@/lib/psathyrella/maritimeOntology";
import { cropDataUrlFromImage, useCorrections } from "@/lib/psathyrella/useCorrections";
import { type CameraDetection } from "@/lib/psathyrella/contract";

/** Mirrors MAX_LABEL_CHARS / MAX_NOTE_CHARS in the corrections route — the server is the authority;
 *  these stop the operator from typing a value that is guaranteed to come back as a 400. */
const MAX_LABEL_CHARS = 64;
const MAX_NOTE_CHARS = 2000;

/** A little context around the box makes a far better training crop than a box shaved to the edge. */
const CROP_PAD = 0.08;

/** The honest answer for a hallucinated box. Negatives train a detector as hard as positives do. */
const FALSE_POSITIVE_LABEL = "false_positive";

/**
 * Operator-facing headings for the handling lanes.
 *
 * The ontology forbids rendering a group id as visible text — `person_in_water` is the name of a
 * routing lane, not a claim that anyone is in the water, and printing it would manufacture a
 * man-overboard report. These headings carry the lane's meaning without asserting it.
 */
const GROUP_HEADINGS: Record<MaritimeGroup, string> = {
  vessel: "Vessels",
  person_in_water: "People",
  aid_to_navigation: "Aids to navigation",
  marine_life: "Marine life",
  hazard: "Hazards",
  signal: "Signals & lights",
  aerial: "Aerial",
  environmental: "Environmental",
  unknown: "Other",
};

/** Most-reached-for lanes first: traffic and life safety before environmental curiosities. */
const GROUP_ORDER: readonly MaritimeGroup[] = [
  "vessel",
  "person_in_water",
  "aid_to_navigation",
  "hazard",
  "signal",
  "marine_life",
  "aerial",
  "environmental",
  "unknown",
];

interface LabelOption {
  /** The token actually written to the training row — the ontology KEY, not the pretty label. */
  value: string;
  /** What the operator reads. */
  label: string;
}

interface LabelGroup {
  group: MaritimeGroup;
  heading: string;
  color: string;
  options: LabelOption[];
}

/**
 * The maritime correction vocabulary, built once at module scope (MARITIME_ONTOLOGY is frozen, so this
 * can never go stale).
 *
 * WHY THE KEY IS SUBMITTED, NOT THE LABEL: the ontology key ("buoy", "nav light red") is the canonical
 * class token — it round-trips back through classifyDetection() to the same display label, so a dataset
 * written in keys speaks exactly the vocabulary the console and the next model share. The display label
 * ("Buoy / navigation mark") does not round-trip; a dataset written in prose labels would need a second
 * mapping nobody maintains.
 *
 * De-duplicated BY LABEL: "vessel", "ship" and "boat" all display as "Vessel", and offering the same
 * word three times only invites three inconsistent spellings of the same class in the training set.
 * First key wins, so the canonical maritime name beats the COCO alias.
 */
const LABEL_GROUPS: readonly LabelGroup[] = (() => {
  const seenLabels = new Set<string>();
  const byGroup = new Map<MaritimeGroup, LabelOption[]>();

  for (const [value, entry] of Object.entries(MARITIME_ONTOLOGY)) {
    // Only the genuinely maritime half. "possible"/"implausible" leaves are what we are correcting
    // AWAY from — offering them as targets would entrench the COCO vocabulary we are trying to leave.
    if (entry.plausibility !== "maritime") continue;
    const dedupeKey = entry.label.toLowerCase();
    if (seenLabels.has(dedupeKey)) continue;
    seenLabels.add(dedupeKey);
    const list = byGroup.get(entry.group);
    if (list) list.push({ value, label: entry.label });
    else byGroup.set(entry.group, [{ value, label: entry.label }]);
  }

  return GROUP_ORDER.flatMap((group): LabelGroup[] => {
    const options = byGroup.get(group);
    if (!options || options.length === 0) return [];
    return [{ group, heading: GROUP_HEADINGS[group], color: groupColor(group), options }];
  });
})();

export default function RelabelPopover({
  detection,
  feedId,
  source,
  frameW,
  frameH,
  bearingTrueDeg,
  frameEl,
  onDone,
  className,
}: {
  detection: CameraDetection;
  feedId: string;
  source: string;
  frameW: number;
  frameH: number;
  bearingTrueDeg?: number | null;
  /** Live frame element to crop the training snapshot from. May be null — then submit WITHOUT an image. */
  frameEl?: HTMLImageElement | HTMLCanvasElement | null;
  onDone: (submitted: boolean) => void;
  className?: string;
}): JSX.Element {
  const { submit, pending, lastError, count } = useCorrections();

  // ONE source of truth for the label. The chips fill this field rather than holding a separate
  // selection, so what the operator sees in the box is literally what gets written to the dataset —
  // and a failed submit can never lose their typing, because nothing else can clear it.
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");

  const classified = useMemo(() => classifyDetection(detection.cls), [detection.cls]);

  // Escape must reach us even when focus is inside our own inputs (whose keydown we stop below, so the
  // console's map hotkeys do not fire on typed characters). Capture phase runs before any of that.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDoneRef.current(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  /**
   * Bearing is optional metadata. A value outside 0..<360 is not representable as a true bearing, and
   * the capture route rejects it rather than wrapping it. We record null — "bearing not known" — which
   * is honest; wrapping a bad number into a plausible-looking one would put a fabricated bearing into
   * the training set, and losing the operator's whole label over a geometry glitch would be worse still.
   */
  const bearing = useMemo(() => {
    if (typeof bearingTrueDeg !== "number" || !Number.isFinite(bearingTrueDeg)) return null;
    return bearingTrueDeg >= 0 && bearingTrueDeg < 360 ? bearingTrueDeg : null;
  }, [bearingTrueDeg]);

  // Frame dimensions are integer pixel counts by nature; a fractional value can only be a measurement
  // artifact, so rounding is sub-pixel and harmless. Zero/absent is a different thing entirely — see below.
  const frameWInt = Number.isFinite(frameW) ? Math.round(frameW) : 0;
  const frameHInt = Number.isFinite(frameH) ? Math.round(frameH) : 0;

  /**
   * The raw class, taken from classifyDetection's own audit field rather than re-derived here.
   *
   * WHY NOT `typeof detection.cls === "string" ? … : ""`: `cls` is typed string but arrives over the
   * wire from the Jetson, and a YOLO pipeline can serialize a numeric class INDEX (`cls: 0`). Coercing
   * that to "" would print "Detector said: (empty)" — telling the operator the detector said nothing
   * when it actually said `0` — and would block the correction outright, while the overlay next to it
   * correctly reports `detector reported "0"`. classifyDetection already keeps the faithful textual
   * form for numbers/booleans and yields "" only for values with no honest text (objects, null), which
   * is exactly the case the block below is for. One coercion, one truth, in both places.
   */
  const rawClass = classified.rawClass.trim();

  /**
   * Preconditions the capture route hard-requires. Blocking here with a sentence beats letting the
   * operator type a careful label and receive an opaque HTTP 400 — and a row with no frame geometry
   * could never be reprojected onto the image again, so it would not be a training example at all.
   */
  const blockedReason = useMemo(() => {
    if (frameWInt <= 0 || frameHInt <= 0) {
      return "Frame size unknown for this feed — a box cannot be tied back to the image, so it cannot be recorded.";
    }
    if (rawClass.length === 0) {
      return "This detection carries no class string — there is nothing to correct against.";
    }
    return null;
  }, [frameWInt, frameHInt, rawClass]);

  const trimmedLabel = label.trim();
  const canSubmit = !pending && blockedReason === null && trimmedLabel.length > 0;

  const send = useCallback(
    async (correctedLabel: string) => {
      const clean = correctedLabel.trim();
      // Refuse an empty/whitespace label outright: a blank row teaches the next model nothing and the
      // route would reject it anyway.
      if (!clean || pending || blockedReason !== null) return;

      // A label without pixels is a weaker training example, but it is still a real one. The crop is
      // best-effort: a null (element still loading, CORS-tainted canvas, degenerate box) must never
      // cost us the operator's judgement.
      const snapshot = frameEl ? cropDataUrlFromImage(frameEl, detection.bbox, CROP_PAD) : null;
      const trimmedNote = note.trim();

      const ok = await submit({
        feedId,
        source,
        // Verbatim: the raw class is the audit field that proves what the detector actually emitted.
        rawClass,
        correctedLabel: clean,
        bbox: detection.bbox,
        frameW: frameWInt,
        frameH: frameHInt,
        bearingTrueDeg: bearing,
        note: trimmedNote ? trimmedNote : undefined,
        snapshotDataUrl: snapshot ?? undefined,
      });

      // On failure the typed label and note stay exactly where they are, so the operator can retry.
      onDone(ok);
    },
    [
      bearing, blockedReason, detection.bbox, feedId, frameEl, frameHInt, frameWInt,
      note, onDone, pending, rawClass, source, submit,
    ],
  );

  const conf =
    typeof detection.conf === "number" && Number.isFinite(detection.conf)
      ? `${Math.round(Math.max(0, Math.min(1, detection.conf)) * 100)}%`
      : null;

  return (
    <div
      // Click-outside handlers commonly listen on mousedown/pointerdown, not click, so stopping only
      // `click` would still let the parent close this popover the moment the operator reaches for it.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Relabel detection"
      className={cn(
        "w-[260px] rounded-lg border border-cyan-500/25 bg-[#0a0f1e]/95 p-2.5 backdrop-blur-md",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
          <Tag className="h-3 w-3" /> Relabel
        </span>
        <div className="flex items-center gap-1">
          <span
            title="Corrections recorded in the capture log, read back from the server."
            className="rounded bg-cyan-500/15 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-cyan-300/80"
          >
            {count} saved
          </span>
          <button
            type="button"
            onClick={() => onDone(false)}
            title="Close without recording"
            aria-label="Close without recording"
            className="rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-cyan-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* What the detector ACTUALLY said vs what the console is showing. The operator can only judge
          the correction if they can see both — the display label is our interpretation, not evidence. */}
      <div className="mb-2 rounded border border-white/10 bg-black/40 px-1.5 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">Detector said</span>
          <span className="truncate font-mono text-[10px] text-amber-200/90" title={rawClass || "(empty)"}>
            {rawClass || "(empty)"}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">Shown as</span>
          <span className="flex min-w-0 items-center gap-1" title={classified.reason ?? undefined}>
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: groupColor(classified.group) }}
            />
            <span className="truncate text-[10px] text-slate-200">{classified.displayLabel}</span>
          </span>
        </div>
        {(conf || bearing !== null) && (
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-slate-500">
            {conf && <span title="Detector confidence">conf {conf}</span>}
            {bearing !== null && <span title="True bearing to the box">{bearing.toFixed(0)}°T</span>}
          </div>
        )}
      </div>

      <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
        Correct label
      </div>
      <div className="max-h-[150px] overflow-y-auto rounded border border-white/10 bg-black/30 p-1.5">
        {LABEL_GROUPS.map((g) => (
          <div key={g.group} className="mb-1.5 last:mb-0">
            <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: g.color }} />
              {g.heading}
            </div>
            <div className="flex flex-wrap gap-1">
              {g.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  // Fills the field below rather than holding a hidden selection — the operator always
                  // sees the exact token that will be written.
                  onClick={() => setLabel(o.value)}
                  title={`Record as "${o.value}"`}
                  aria-pressed={trimmedLabel === o.value}
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[9px] font-medium tracking-wide",
                    trimmedLabel === o.value
                      ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100"
                      : "border-white/10 bg-black/40 text-slate-400 hover:text-white"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Free text is how a genuinely new class first arrives — the maritime vocabulary above cannot
          already contain a thing nobody has seen from this tower yet. */}
      <input
        type="text"
        value={label}
        maxLength={MAX_LABEL_CHARS}
        placeholder="or type a class not listed…"
        aria-label="Corrected label"
        onChange={(e) => setLabel(e.target.value)}
        // Typed characters must not reach the console's map/camera hotkeys.
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && canSubmit) {
            e.preventDefault();
            void send(label);
          }
        }}
        className="mt-1.5 w-full rounded border border-white/10 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-cyan-100 placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none"
      />

      <textarea
        value={note}
        rows={2}
        maxLength={MAX_NOTE_CHARS}
        placeholder="note (optional) — e.g. own tower stanchion"
        aria-label="Note"
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="mt-1 w-full resize-none rounded border border-white/10 bg-black/50 px-1.5 py-1 text-[10px] leading-tight text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none"
      />

      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void send(label)}
          title={trimmedLabel ? `Record this box as "${trimmedLabel}"` : "Pick or type a label first"}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded border py-1 text-[9px] font-bold uppercase tracking-wide",
            canSubmit
              ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
              : "cursor-not-allowed border-white/10 bg-black/40 text-slate-600"
          )}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          <span className="max-w-[130px] truncate">{trimmedLabel ? `Save "${trimmedLabel}"` : "Save"}</span>
        </button>
        <button
          type="button"
          disabled={pending || blockedReason !== null}
          onClick={() => void send(FALSE_POSITIVE_LABEL)}
          title="Nothing is there — record this box as a false positive. Negatives train the model too."
          className={cn(
            "flex items-center gap-1 rounded border px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide",
            pending || blockedReason !== null
              ? "cursor-not-allowed border-white/10 bg-black/40 text-slate-600"
              : "border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
          )}
        >
          <Ban className="h-3 w-3" /> Not an object
        </button>
      </div>

      {blockedReason && (
        <p className="mt-1.5 flex items-start gap-1 rounded border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-1 text-[9px] leading-tight text-amber-200/90">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          <span>{blockedReason}</span>
        </p>
      )}

      {lastError && (
        <p
          role="alert"
          className="mt-1.5 rounded border border-red-500/30 bg-red-500/[0.08] px-1.5 py-1 text-[9px] leading-tight text-red-200"
        >
          Not saved — {lastError}. Your label is still here; try again.
        </p>
      )}

      {/* The one line that must never be softened: an operator who thinks the detector just learned
          something will over-trust the very next frame. */}
      <p className="mt-1.5 text-[9px] leading-tight text-slate-500">
        Saved for training only. The live detector does not change — it improves only after an offline
        retrain and a new model is deployed to the buoy.
      </p>
    </div>
  );
}
