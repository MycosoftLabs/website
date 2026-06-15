/**
 * BlueSite perf governor (Earth Simulator v2, Phase 0).
 *
 * Single source of truth for "how much can we paint right now" — caps particle /
 * instance / tile counts and the raymarch-quality tier by DEVICE CLASS + ZOOM + LIVE
 * FPS + INTERACTION state, and signals the auto-downshift ladder from the plan:
 *   full → pause advection → drop instanced flames → cut raymarch steps →
 *   2D fallback → disable.
 * The map must NEVER freeze: budgets shrink before that happens. Reads the v1
 * `window.__crep_fps` heartbeat so it reacts to real frame cost.
 */

export type PerfClass = "desktop" | "tablet" | "phone";
export type EffectKind = "mover" | "smoke" | "spore" | "cloud" | "tiles";
/** 0 = full quality … 4 = disabled. */
export type DownshiftTier = 0 | 1 | 2 | 3 | 4;

export interface PerfGovernor {
  readonly perfClass: PerfClass;
  /** Max particles/instances/tiles for a kind at the current zoom + fps + interaction. */
  budget(kind: EffectKind, zoom: number): number;
  /** Volumetric raymarch step count for the current tier (smoke/cloud). */
  raymarchSteps(): number;
  /** Current downshift tier (rises as FPS falls / while interacting). */
  tier(): DownshiftTier;
  /** True when we should use the cheap 2D path instead of volumetric. */
  useFallback2D(kind: EffectKind): boolean;
  /** Wire to map "movestart"/"moveend" to drop budget during pan/zoom. */
  setInteracting(on: boolean): void;
  /** One-line human status for QA overlays / logs. */
  note(): string;
}

function detectPerfClass(): PerfClass {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth || 1920;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  if (w <= 820) return "phone";
  if (w <= 1180 || (touch && w <= 1440)) return "tablet";
  return "desktop";
}

function liveFps(): number {
  if (typeof window === "undefined") return 60;
  const f = (window as unknown as { __crep_fps?: { fps?: number } }).__crep_fps?.fps;
  return typeof f === "number" && f > 0 ? f : 60;
}

// Full-quality base budgets per kind, scaled by zoom tier then by downshift.
function baseBudget(kind: EffectKind, perfClass: PerfClass, zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 3;
  const desktop = perfClass === "desktop";
  const tablet = perfClass === "tablet";
  switch (kind) {
    case "mover": {
      // billboarded sprites / instanced — cheap on GPU
      const d = z < 3 ? 1400 : z < 5 ? 1800 : z < 7 ? 2400 : 3200;
      return desktop ? d : tablet ? Math.round(d * 0.45) : Math.round(d * 0.25);
    }
    case "smoke":
    case "spore": {
      const d = z < 3 ? 40_000 : z < 5 ? 80_000 : z < 7 ? 160_000 : 240_000;
      return desktop ? d : tablet ? Math.round(d * 0.3) : 0; // off on phone
    }
    case "cloud": {
      const d = z < 4 ? 60_000 : 120_000;
      return desktop ? d : tablet ? Math.round(d * 0.35) : 0;
    }
    case "tiles": {
      // photoreal 3D tiles only at city zoom, desktop only
      if (!desktop || z < 10) return 0;
      return z < 13 ? 120 : 320;
    }
    default:
      return 0;
  }
}

export function createPerfGovernor(): PerfGovernor {
  const perfClass = detectPerfClass();
  let interacting = false;

  const target = perfClass === "desktop" ? 50 : perfClass === "tablet" ? 30 : 24;

  const computeTier = (): DownshiftTier => {
    const fps = liveFps();
    let t: DownshiftTier =
      fps >= target ? 0 :
      fps >= target * 0.8 ? 1 :
      fps >= target * 0.6 ? 2 :
      fps >= target * 0.4 ? 3 : 4;
    if (interacting && t < 4) t = (t + 1) as DownshiftTier; // ease off during pan/zoom
    return t;
  };

  // budget multiplier by tier
  const tierMul = [1, 0.6, 0.35, 0.15, 0] as const;

  return {
    perfClass,
    tier: computeTier,
    setInteracting: (on: boolean) => { interacting = on; },
    raymarchSteps: () => {
      const t = computeTier();
      return [64, 48, 32, 16, 0][t];
    },
    useFallback2D: (kind: EffectKind) => {
      if (kind !== "smoke" && kind !== "cloud") return false;
      return perfClass !== "desktop" || computeTier() >= 3;
    },
    budget: (kind: EffectKind, zoom: number) => {
      const t = computeTier();
      return Math.round(baseBudget(kind, perfClass, zoom) * tierMul[t]);
    },
    note: () => `perf=${perfClass} fps=${Math.round(liveFps())} target=${target} tier=${computeTier()}${interacting ? " (interacting)" : ""}`,
  };
}
