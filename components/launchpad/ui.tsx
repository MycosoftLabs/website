'use client';

/**
 * FUSARIUM Launchpad — shared UI primitives.
 *
 * One visual language across every authenticated screen: slate/neutral ground,
 * emerald as the single commercial accent, and semantic status colors
 * (emerald=good, amber=partial/warning, red=not-met/blocking, sky=info) kept
 * separate from the accent. Theme-aware — reads in light and dark.
 *
 * These encode state in FORM as well as number (a stat tile carries a state
 * stripe; a badge carries a dot), so posture reads at a glance — the point of
 * an operated dashboard versus a read document.
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type Tone = 'emerald' | 'amber' | 'red' | 'sky' | 'slate';

const TONE_TEXT: Record<Tone, string> = {
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
  sky: 'text-sky-500',
  slate: 'text-slate-400',
};
const TONE_STRIPE: Record<Tone, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-500',
};
const TONE_CHIP: Record<Tone, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  amber: 'text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10',
  red: 'text-red-600 dark:text-red-400 border-red-500/40 bg-red-500/10',
  sky: 'text-sky-600 dark:text-sky-400 border-sky-500/40 bg-sky-500/10',
  slate: 'text-slate-500 border-slate-500/30 bg-slate-500/10',
};

/** Page title + optional description + right-aligned actions. */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          {Icon && <Icon className="h-6 w-6 text-emerald-500 shrink-0" />}
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** A card surface with an optional left state stripe. */
export function Card({
  children,
  tone,
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`myco-glass-surface relative rounded-xl border border-border/70 overflow-hidden ${className}`}>
      {tone && <div className={`absolute inset-y-0 left-0 w-1 ${TONE_STRIPE[tone]}`} />}
      {children}
    </div>
  );
}

/** KPI stat tile: label, big value, sub-context, tone stripe. Value renders
 * "—" (never a fabricated 0) when empty is passed. */
export function StatTile({
  label,
  value,
  sub,
  tone = 'slate',
  empty,
}: {
  label: string;
  value?: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  empty?: string;
}) {
  return (
    <Card tone={tone} className="p-4">
      <div className="pl-1.5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {empty !== undefined ? (
          <div className="text-sm italic text-muted-foreground mt-2">{empty}</div>
        ) : (
          <div className={`text-3xl font-bold tabular-nums mt-1 ${TONE_TEXT[tone]}`}>{value}</div>
        )}
        {sub && empty === undefined && <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{sub}</div>}
      </div>
    </Card>
  );
}

/** Pill badge with a state dot. */
export function StateBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`myco-glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${TONE_CHIP[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_STRIPE[tone]}`} />
      {children}
    </span>
  );
}

/** A pass/fail gate chip (the §170.21 gates). */
export function GateChip({
  label,
  value,
  pass,
  detail,
}: {
  label: string;
  value: string;
  pass: boolean;
  detail?: string;
}) {
  const tone: Tone = pass ? 'emerald' : 'amber';
  return (
    <div className={`rounded-lg border p-3 ${pass ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`text-[11px] font-semibold ${pass ? 'text-emerald-500' : 'text-amber-500'}`}>
          {pass ? 'PASS' : 'FAIL'}
        </span>
      </div>
      <div className="text-base font-semibold tabular-nums mt-1">{value}</div>
      {detail && <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{detail}</div>}
    </div>
  );
}

/**
 * Segmented progress bar for a distribution of states (implemented / partial /
 * not-met / n-a / unassessed). Encodes the whole posture in one horizontal read.
 */
export function SegmentBar({
  segments,
  total,
}: {
  segments: Array<{ tone: Tone; value: number; label: string }>;
  total: number;
}) {
  const denom = total || 1;
  return (
    <div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className={TONE_STRIPE[s.tone]} style={{ width: `${(s.value / denom) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`h-2 w-2 rounded-sm ${TONE_STRIPE[s.tone]}`} />
            <span className="tabular-nums font-medium text-foreground">{s.value}</span> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal meter toward a threshold (the weighted score vs. 88). */
export function ThresholdMeter({
  value,
  max,
  threshold,
  tone,
}: {
  value: number;
  max: number;
  threshold: number;
  tone: Tone;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tPct = Math.max(0, Math.min(100, (threshold / max) * 100));
  return (
    <div className="mt-2">
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${TONE_STRIPE[tone]} transition-all`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${tPct}%` }} title={`Threshold ${threshold}`} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
        <span>0</span>
        <span>threshold {threshold}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
