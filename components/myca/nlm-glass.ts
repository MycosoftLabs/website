/**
 * Monochrome glass card classes for NLM marketing (/myca/nlm).
 * Matches NLM training app glass (zinc/black/white, transparent blur) —
 * light: clear/white glass; dark: dark glass. No blue-slate or green tints.
 * Date: Sep 22, 2026
 */

/** Outer cards — same intent as training `bg-zinc-900/40 border-zinc-800` + light-mode clear glass */
export const NLM_GLASS_CARD =
  "rounded-2xl border border-zinc-200/80 bg-white/50 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_40px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_48px_rgba(0,0,0,0.35)]"

/** Nested inset panels inside cards */
export const NLM_GLASS_INSET =
  "rounded-xl border border-zinc-200/70 bg-black/[0.03] backdrop-blur-md dark:border-zinc-800 dark:bg-black/20"

/** Compact chips / badges on glass surfaces */
export const NLM_GLASS_CHIP =
  "rounded-full border border-zinc-300/80 bg-white/40 text-zinc-800 backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200"

/** Icon wells — monochrome only */
export const NLM_GLASS_ICON_WELL =
  "rounded-xl border border-zinc-200/80 bg-zinc-100/60 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"

/** Hero band — B&W glass, no purple/green marketing gradient */
export const NLM_GLASS_HERO =
  "relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-br from-white/70 via-zinc-100/40 to-white/50 backdrop-blur-xl dark:border-zinc-800 dark:from-zinc-950/80 dark:via-black/60 dark:to-zinc-900/70"
