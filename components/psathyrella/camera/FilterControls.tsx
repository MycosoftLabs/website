"use client";

/**
 * Operator image-adjustment popover for the tower cameras. Fully controlled — every interaction
 * hands back a COMPLETE VideoFilterState, so the owner can persist/restore it and drive several
 * surfaces (ring tiles, target cam, pano) from one object. Nothing is computed per frame here: the
 * viewer turns the state into one CSS `filter:` string via cssFilter().
 *
 * `compact` is the per-tile popover (~200px): presets, the two knobs an operator actually reaches
 * for under way, and reset. The full panel adds the rest.
 */

import { type JSX } from "react";
import { Contrast, Grid3x3, Moon, RotateCcw, SlidersHorizontal, Wand2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTER_STATE,
  FILTER_PRESETS,
  filterSummary,
  isFilterActive,
  presetState,
  type VideoFilterState,
} from "@/lib/psathyrella/videoFilters";

type NumericKey = "brightness" | "contrast" | "saturation" | "gamma" | "sharpen";

// Slider bounds mirror LIMITS in videoFilters.ts, which is the authority — it re-clamps everything
// on the way into cssFilter(), so a drifted bound here degrades the feel, never the picture.
const SLIDERS: { key: NumericKey; label: string; min: number; max: number; step: number; hint: string }[] = [
  { key: "brightness", label: "Bright", min: 0.2, max: 2.5, step: 0.05, hint: "Display brightness — does not change sensor exposure" },
  { key: "contrast", label: "Contrast", min: 0.2, max: 2.5, step: 0.05, hint: "Display contrast" },
  { key: "saturation", label: "Sat", min: 0, max: 2.5, step: 0.05, hint: "Colour saturation — 0 is mono" },
  { key: "gamma", label: "Gamma ≈", min: 0.4, max: 2.2, step: 0.05, hint: "APPROXIMATED with brightness/contrast — CSS has no gamma primitive" },
  { key: "sharpen", label: "Sharpen ≈", min: 0, max: 1, step: 0.05, hint: "APPROXIMATED as global micro-contrast — not a true unsharp mask" },
];

const COMPACT_SLIDERS: NumericKey[] = ["brightness", "contrast"];

export default function FilterControls({
  state,
  onChange,
  onReset,
  compact,
  className,
}: {
  state: VideoFilterState;
  onChange: (next: VideoFilterState) => void;
  onReset: () => void;
  compact?: boolean;
  className?: string;
}): JSX.Element {
  const active = isFilterActive(state);
  const sliders = compact ? SLIDERS.filter((s) => COMPACT_SLIDERS.includes(s.key)) : SLIDERS;

  const setNumber = (key: NumericKey, value: number) => {
    const next: VideoFilterState = { ...state };
    next[key] = value;
    onChange(next);
  };

  return (
    <div
      className={cn(
        "rounded-lg p-2.5",
        compact ? "w-[200px]" : "w-64",
        className
      )}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.20), rgba(15,23,42,0.74) 48%, rgba(255,255,255,0.10)), " +
            "radial-gradient(circle at 24% 18%, rgba(255,255,255,0.18), transparent 32%)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          border: "1px solid rgba(255,255,255,0.42)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 30px rgba(15,23,42,0.35)",
        }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
          <SlidersHorizontal className="h-3 w-3" /> Image
        </span>
        <div className="flex items-center gap-1">
          {active && (
            <span title={filterSummary(state)} className="rounded bg-cyan-500/20 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-cyan-200">
              FX
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            title="Reset to raw feed"
            aria-label="Reset image adjustment"
            className="rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-cyan-200"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
        <Wand2 className="h-3 w-3" /> Preset
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.hint}
            // Carry the reticle across a preset change — it is an overlay the operator set, not part
            // of the image adjustment the preset is replacing.
            onClick={() => onChange({ ...presetState(p.id), grid: state.grid })}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              state.preset === p.id
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100"
                : "border-white/10 bg-black/40 text-slate-400 hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* The two presets that could be mistaken for sensor capability say what they are, in-line,
          not just in a tooltip — a tooltip is not seen on a touch console. */}
      {state.preset === "thermal" && (
        <p className="mb-2 rounded border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-1 text-[9px] leading-tight text-amber-200/90">
          False colour of the VISIBLE camera. No thermal/IR sensor — shows no heat.
        </p>
      )}
      {state.preset === "edge" && (
        <p className="mb-2 rounded border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-1 text-[9px] leading-tight text-amber-200/90">
          Contrast approximation, not a true edge detector.
        </p>
      )}

      <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
        <SlidersHorizontal className="h-3 w-3" /> Adjust
      </div>
      {sliders.map((s) => (
        <div key={s.key} className="mb-1.5" title={s.hint}>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{s.label}</span>
            <span className="font-mono text-cyan-200">{state[s.key].toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={state[s.key]}
            aria-label={s.label}
            // Keep a slider drag from being read as a pan/drag gesture by the map or tile underneath.
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setNumber(s.key, parseFloat(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>
      ))}

      {!compact && (
        <>
          <div className="mb-1 mt-2 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
            <Moon className="h-3 w-3" /> Modes
          </div>
          <div className="flex gap-1">
            <Toggle
              label="Gain"
              icon={Moon}
              on={state.lowLight}
              title="Display gain for night — brightens this screen only, not the sensor"
              onClick={() => onChange({ ...state, lowLight: !state.lowLight })}
            />
            <Toggle
              label="Invert"
              icon={Contrast}
              on={state.invert}
              title="Invert the image"
              onClick={() => onChange({ ...state, invert: !state.invert })}
            />
            <Toggle
              label="Grid"
              icon={Grid3x3}
              on={state.grid}
              title="Reticle / grid overlay"
              onClick={() => onChange({ ...state, grid: !state.grid })}
            />
          </div>
          <p className="mt-2 text-[9px] leading-tight text-slate-500">
            Display-side only — nothing here changes the camera or what is recorded.
          </p>
        </>
      )}

      {compact && active && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FILTER_STATE, grid: state.grid })}
          className="mt-1 w-full rounded border border-white/10 bg-black/40 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300 hover:text-white"
        >
          Clear adjustment
        </button>
      )}
    </div>
  );
}

function Toggle({
  label,
  icon: Icon,
  on,
  title,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  on: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded border px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide",
        on ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-black/40 text-slate-400 hover:text-white"
      )}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
