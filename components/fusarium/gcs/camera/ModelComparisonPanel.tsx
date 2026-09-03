"use client";

/**
 * ModelComparisonPanel — head-to-head readout for the multi-model detector.
 *
 * WHY THIS PANEL EXISTS
 * A single detector cannot detect its own hallucination. The buoy's RF-DETR fine-tune, seeded from 36
 * same-scene frames, reported "bird" at 0.95 confidence in an indoor room — the confidence number
 * described how strongly the frame matched its training distribution, not whether a bird was there.
 * Running several differently-trained models on the SAME frame gives the operator the one on-board
 * signal that can separate "independent systems concur" from "one system asserted". This panel is
 * where that distinction is made visible.
 *
 * THE HONESTY RULES THIS FILE ENFORCES (do not soften any of them)
 *  1. Agreement is EVIDENCE, not ACCURACY. Nothing here may be worded as a quality or correctness
 *     score. Models trained on overlapping data can agree and both be wrong; the footer says so.
 *  2. A "single" contact is rendered WEAKER than a corroborated one — dimmed, unemphasised, and
 *     explicitly stamped UNCONFIRMED. One model's box is a hypothesis.
 *  3. A model carrying an `error` was NOT counted — it either crashed, or its boxes could not be
 *     placed. Either way it contributed no evidence, and it gets its own row rather than numeric
 *     cells: a zero in the detections column reads as "this model looked and saw nothing", which is
 *     the opposite of the truth and would make the frame look better-covered than it is.
 *  4. Neither empty state is an all-clear. "Nothing counted" is a pipeline failure; "no contacts"
 *     means the models that ran reported nothing, which is not the same as nothing being there.
 *  5. `unique` is UNCORROBORATED and nothing more — never captioned, coloured or tooltipped as
 *     either a unique capability or a hallucination.
 *
 * Presentational only: no fetching, no fusing, no sorting of `fused` (fuseModels already orders it
 * corroborated-first, then confidence — re-sorting here could disagree with the overlay's ordering).
 */

import { type JSX } from "react";
import { cn } from "@/lib/utils";
import type {
  Corroboration,
  FusedDetection,
  FusionResult,
  ModelScore,
} from "@/lib/fusarium/gcs/modelFusion";

/**
 * Per-bucket styling. Warm/urgent hues are reserved for DISAGREEMENT, not for detection strength —
 * a red row means the models are in conflict, which is a state the operator must resolve, whereas a
 * dim row means nothing has been corroborated yet.
 */
const CORROBORATION_STYLE: Record<
  Corroboration,
  { chip: string; row: string; label: string; text: string }
> = {
  consensus: {
    chip: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    row: "border-emerald-500/25 bg-emerald-500/[0.05]",
    label: "CONSENSUS",
    text: "text-emerald-50",
  },
  majority: {
    chip: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
    row: "border-cyan-500/25 bg-cyan-500/[0.04]",
    label: "MAJORITY",
    text: "text-cyan-50",
  },
  // "disputed" covers TWO different disagreements (see Corroboration in modelFusion): the models
  // cannot agree WHAT it is (labelConflict), or they cannot agree WHETHER it is there (a minority
  // saw it). Both need resolving, so both stay red — but the chip is relabelled per case below,
  // because a bare "DISPUTED" on 2-of-5-that-all-said-vessel reads as an identity conflict that
  // does not exist.
  disputed: {
    chip: "border-red-500/45 bg-red-500/15 text-red-200",
    row: "border-red-500/30 bg-red-500/[0.05]",
    label: "DISPUTED",
    text: "text-red-50",
  },
  // Deliberately the quietest treatment on the panel — see honesty rule 2.
  single: {
    chip: "border-amber-500/35 bg-amber-500/10 text-amber-300/90",
    row: "border-white/10 bg-black/30",
    label: "SINGLE",
    text: "text-slate-300",
  },
};

/** "—" for anything the backend did not report. Never 0, never a guess. */
const dash = "—";

const pct = (v: number | null): string => (v === null ? dash : `${Math.round(v * 100)}%`);
const conf = (v: number | null): string => (v === null ? dash : v.toFixed(2));
const ms = (v: number | null): string => (v === null ? dash : `${Math.round(v)}ms`);

/**
 * Scoreboard order: agreement rate descending, nulls last.
 *
 * A null rate is NOT a low rate — it means the model has nothing to score (it errored, or it reported
 * no detections at all), so it must not be interleaved with real rates as if it were a 0%. Errored
 * models sink below merely-empty ones because an outage is a different fact from an empty frame.
 * Ties break on modelId so the table never jitters between polls.
 */
function sortScores(scores: ModelScore[]): ModelScore[] {
  return scores.slice().sort((a, b) => {
    const aNull = a.agreementRate === null;
    const bNull = b.agreementRate === null;
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (!aNull && !bNull && a.agreementRate !== b.agreementRate) {
      return (b.agreementRate as number) - (a.agreementRate as number);
    }
    const aErr = a.error !== null;
    const bErr = b.error !== null;
    if (aErr !== bErr) return aErr ? 1 : -1;
    return a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0;
  });
}

export default function ModelComparisonPanel({
  fusion,
  connected,
  className,
}: {
  fusion: FusionResult;
  /**
   * OPTIONAL link state from useModelComparison. Omit and the panel behaves exactly as before.
   *
   * Pass it: the hook RETAINS the last results across a failed poll (so a one-off LAN stall does not
   * strobe the scoreboard), which means these rows can describe a frame that is seconds or minutes
   * old while looking completely current. On an operator console that is the difference between
   * "the water is like this" and "the water was like this before the link dropped". Explicit
   * `false` puts a banner over the panel saying so.
   */
  connected?: boolean;
  className?: string;
}): JSX.Element {
  const scores = sortScores(fusion.scores);
  const failed = fusion.scores.filter((s) => s.error !== null);
  // Strictly `=== false`: `undefined` means the caller did not wire link state, and inventing a
  // "link down" warning from a missing prop would be its own false alarm.
  const linkDown = connected === false;

  return (
    <div
      className={cn(
        "rounded-lg border border-cyan-500/20 bg-[#0a0f1e]/95 p-2.5 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
          Model comparison
        </span>
        <span className="font-mono text-[9px] text-slate-400">
          {/* "counted", not "ran": a model can run and still be excluded (see honesty rule 3). */}
          {fusion.modelsRan} counted
          {failed.length > 0 && (
            <span className="text-amber-300/90"> · {failed.length} not counted</span>
          )}
        </span>
      </div>

      {linkDown && (
        <p className="mb-2 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-1 text-[9px] leading-tight text-amber-200">
          <span className="font-bold uppercase tracking-wide">Link down.</span> Everything below is
          the last frame that reached us, not the water now.
        </p>
      )}

      {/* ── SECTION 1 · SCOREBOARD ─────────────────────────────────────────────────────────── */}
      <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
        Model scoreboard
      </div>

      {scores.length === 0 ? (
        <p className="rounded border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-1 text-[9px] leading-tight text-amber-200/90">
          No models reporting — the comparison is blind, not clear.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[300px]">
            <div className="grid grid-cols-[minmax(72px,1fr)_28px_28px_28px_36px_36px_44px] gap-x-1 border-b border-white/10 pb-1 text-[8px] font-bold uppercase tracking-wide text-slate-500">
              <span>Model</span>
              <span className="text-right" title="Detections this model reported">Det</span>
              <span className="text-right" title="Of those, how many at least one other model also found">Cor</span>
              <span className="text-right" title="Found by this model alone — uncorroborated. Unresolved, not wrong and not right.">Uniq</span>
              <span className="text-right" title="Corroborated / detections. Agreement between models, NOT accuracy.">Agree</span>
              <span className="text-right" title="Mean confidence over this model's own detections">Conf</span>
              <span className="text-right" title="Inference latency reported by the backend">Lat</span>
            </div>

            {scores.map((s) =>
              s.error !== null ? (
                // An excluded model gets its own full-width row: putting "—" in seven cells would
                // still read as a model that participated. It did not.
                //
                // The badge says NOT COUNTED rather than "did not run" because `error` covers both a
                // crashed run AND a run whose boxes could not be placed (see UNPLACEABLE_FRAME in
                // useModelComparison). "Did not run" would be a false statement about the second
                // case; "not counted" is exactly true of both, and the verbatim reason follows.
                <div
                  key={s.modelId}
                  className="border-b border-white/[0.04] py-1 text-[9px] leading-tight text-amber-200/90"
                >
                  <span className="font-mono font-bold text-amber-200">{s.modelId}</span>
                  <span className="ml-1.5 rounded border border-amber-500/35 bg-amber-500/10 px-1 py-px text-[8px] font-bold uppercase tracking-wide">
                    Not counted
                  </span>
                  <span className="mt-0.5 block text-amber-200/70">
                    {s.error} — this model contributed no evidence to the frame; it neither confirms
                    nor denies any contact below.
                  </span>
                </div>
              ) : (
                <div
                  key={s.modelId}
                  className="grid grid-cols-[minmax(72px,1fr)_28px_28px_28px_36px_36px_44px] items-center gap-x-1 border-b border-white/[0.04] py-1 text-[10px] text-slate-300"
                >
                  <span className="truncate font-mono text-cyan-100" title={s.modelId}>
                    {s.modelId}
                  </span>
                  <span className="text-right font-mono">{s.detections}</span>
                  <span className="text-right font-mono text-emerald-300/90">{s.corroborated}</span>
                  {/* Amber, not red: a unique detection is unresolved, not wrong. */}
                  <span className="text-right font-mono text-amber-300/90">{s.unique}</span>
                  <span className="text-right font-mono text-cyan-200">{pct(s.agreementRate)}</span>
                  <span className="text-right font-mono">{conf(s.meanConf)}</span>
                  <span className="text-right font-mono text-slate-400">{ms(s.latencyMs)}</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 2 · CONTACTS ───────────────────────────────────────────────────────────── */}
      <div className="mb-1 mt-2.5 flex items-baseline justify-between">
        <span className="text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
          Contacts
        </span>
        {fusion.totalObjects > 0 && (
          <span className="font-mono text-[9px] text-slate-500">{fusion.totalObjects}</span>
        )}
      </div>

      {fusion.modelsRan === 0 ? (
        // Wording covers BOTH ways the denominator reaches zero: nothing reported at all, and every
        // model excluded (crashed, or boxes unplaceable). Saying "nothing ran" would be false in the
        // second case — and that case is precisely the one where a detector may have seen a hull we
        // could not place, so it must never soften into an all-clear.
        <p className="rounded border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-1 text-[9px] leading-tight text-amber-200/90">
          <span className="font-bold uppercase tracking-wide">No usable model output.</span>{" "}
          Nothing could be counted on this frame — this is a detection-pipeline failure, NOT a clear
          picture. The water is unobserved by the AI; use the video, radar and lookout.
          {failed.length > 0 && " Per-model reasons are in the scoreboard above."}
        </p>
      ) : fusion.totalObjects === 0 ? (
        <p className="rounded border border-white/10 bg-black/30 px-1.5 py-1 text-[9px] leading-tight text-slate-400">
          <span className="font-bold uppercase tracking-wide text-slate-300">
            No contacts this frame.
          </span>{" "}
          The {fusion.modelsRan === 1 ? "model" : "models"} that ran reported nothing. That is not an
          all-clear — a detector only reports what it was trained to see.
        </p>
      ) : (
        <div className="space-y-1">
          {/* Already ordered corroborated-first by fuseModels — see the header note. */}
          {fusion.fused.map((d) => (
            <ContactRow key={d.id} d={d} modelsRan={fusion.modelsRan} />
          ))}
        </div>
      )}

      <p className="mt-2 border-t border-white/10 pt-1.5 text-[9px] leading-tight text-slate-500">
        Agreement means the models concur — not that they are correct. Models sharing training data
        can agree and both be wrong.
      </p>
    </div>
  );
}

/**
 * One fused object.
 *
 * The votes line is the AUDIT TRAIL and is never collapsed: the operator must be able to see that
 * model A called it "vessel" while model B called it "bird". That raw disagreement is exactly the
 * evidence a merged label would destroy.
 */
function ContactRow({ d, modelsRan }: { d: FusedDetection; modelsRan: number }): JSX.Element {
  const style = CORROBORATION_STYLE[d.corroboration];
  const unconfirmed = d.corroboration === "single";
  // Same red bucket, two different disagreements — name the one that is actually happening.
  // "MINORITY" is the honest word for "more models missed this than found it"; calling that
  // "DISPUTED" implies the models argued about its identity when they in fact agreed on it.
  const chipLabel =
    d.corroboration === "disputed" && !d.labelConflict ? "MINORITY" : style.label;

  return (
    <div
      className={cn(
        "rounded border px-1.5 py-1",
        style.row,
        // Honesty rule 2: an uncorroborated contact must not compete visually with a corroborated one.
        unconfirmed && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={cn(
            "rounded border px-1 py-px text-[8px] font-bold uppercase tracking-wide",
            style.chip,
          )}
        >
          {chipLabel}
        </span>
        <span
          className={cn(
            "text-[11px] leading-tight",
            style.text,
            // Only corroborated contacts get typographic weight.
            unconfirmed ? "font-normal" : "font-semibold",
          )}
        >
          {d.label}
        </span>
        {unconfirmed && (
          <span className="text-[8px] font-bold uppercase tracking-wide text-amber-300/90">
            Unconfirmed
          </span>
        )}
        {d.labelConflict && (
          <span className="text-[8px] font-bold uppercase tracking-wide text-red-300/90">
            ID unresolved
          </span>
        )}
        <span className="ml-auto font-mono text-[9px] text-slate-400">
          {d.votes.length} of {modelsRan} {modelsRan === 1 ? "model" : "models"} · max{" "}
          {d.maxConf.toFixed(2)}
        </span>
      </div>

      {/* The module's own sentence — it states the counts and never overstates support. */}
      <p className="mt-0.5 text-[9px] leading-tight text-slate-400">{d.assessment}</p>

      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
        {d.votes.map((v) => (
          <span key={`${d.id}:${v.modelId}`} className="font-mono text-[9px] text-slate-500">
            <span className="text-cyan-300/80">{v.modelId}</span>
            {/* Each model's OWN raw class, verbatim and quoted — never the normalized label. */}
            <span className="text-slate-300"> &ldquo;{v.rawClass}&rdquo;</span>{" "}
            {v.conf.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
