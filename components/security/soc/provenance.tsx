'use client';

// ═══════════════════════════════════════════════════════════════════════════
// SOC provenance primitives — the honest-rendering vocabulary
// ═══════════════════════════════════════════════════════════════════════════
//
// These are the ONLY components a SOC tile should use to render an operational
// value. They make the honest-SOC rule structural rather than a convention:
//
//   • unknown / unavailable  → em-dash or an explicit error card, NEVER "0"
//   • stale                  → last-known-good with a visible stale banner
//   • healthy / degraded     → the value, with source + freshness underneath
//
// Dark SOC design system preserved: slate grounds, emerald=good, amber=degraded/
// stale, red=unavailable, cyan=neutral accent. Mobile-first, 44px touch targets.

import { AlertTriangle, HelpCircle, Clock, WifiOff, CheckCircle2 } from 'lucide-react';
import type { OperationalState, SocState } from '@/lib/security/soc/operational-state';

function relTime(iso: string | null): string {
  if (!iso) return 'unknown time';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'unknown time';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 0) return 'in the future';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATE_META: Record<SocState, { label: string; cls: string; Icon: any }> = {
  healthy: { label: 'Live', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', Icon: CheckCircle2 },
  degraded: { label: 'Degraded', cls: 'text-amber-300 border-amber-500/40 bg-amber-500/10', Icon: AlertTriangle },
  stale: { label: 'Stale', cls: 'text-amber-300 border-amber-500/40 bg-amber-500/10', Icon: Clock },
  unknown: { label: 'Unknown', cls: 'text-slate-300 border-slate-600 bg-slate-500/10', Icon: HelpCircle },
  unavailable: { label: 'Unavailable', cls: 'text-red-300 border-red-500/40 bg-red-500/10', Icon: WifiOff },
};

/** Small state badge with icon. */
export function SourceState({ state, className = '' }: { state: SocState; className?: string }) {
  const m = STATE_META[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.cls} ${className}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

/** Source + freshness line placed under a value. */
export function ProvenanceFooter({ s, className = '' }: { s: OperationalState<unknown>; className?: string }) {
  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 ${className}`}>
      <span className="font-mono">{s.source}</span>
      {s.collected_at && <span>· {relTime(s.collected_at)}</span>}
      {s.correlation_id && <span className="font-mono">· {s.correlation_id.slice(0, 8)}</span>}
      {s.reason && <span className="text-amber-400/80">· {s.reason}</span>}
    </div>
  );
}

/** Full-width unavailable card — the honest replacement for a zeroed panel. */
export function UnavailableCard({ s, title, className = '' }: { s: OperationalState<unknown>; title?: string; className?: string }) {
  const isUnknown = s.state === 'unknown';
  return (
    <div className={`rounded-xl border p-4 ${isUnknown ? 'border-slate-700 bg-slate-800/40' : 'border-red-500/30 bg-red-500/5'} ${className}`}>
      <div className="flex items-center gap-2">
        <SourceState state={s.state} />
        {title && <span className="text-sm font-medium text-slate-200">{title}</span>}
      </div>
      <p className={`mt-2 text-xs ${isUnknown ? 'text-slate-400' : 'text-red-200/80'}`}>
        {isUnknown
          ? `No verified snapshot from ${s.source} yet.`
          : `${s.source} is unavailable${s.reason ? ` — ${s.reason}` : ''}.`}
      </p>
      <p className="mt-1 font-mono text-[10px] text-slate-500">{s.source}</p>
    </div>
  );
}

/** Inline stale banner for panels that retain last-known-good. */
export function StaleBanner({ s, className = '' }: { s: OperationalState<unknown>; className?: string }) {
  if (s.state !== 'stale') return null;
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 ${className}`}>
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>Showing last known good{s.collected_at ? ` from ${relTime(s.collected_at)}` : ''}. Source is not currently fresh.</span>
    </div>
  );
}

/**
 * A single metric tile. The core honesty guarantee lives here: for
 * unknown/unavailable it renders an em-dash and the state badge, and it is
 * structurally impossible to display `0` for a value that was never collected.
 */
export function MetricTile({
  label,
  s,
  format = (v) => String(v),
  hint,
  accent = 'cyan',
  className = '',
}: {
  label: string;
  s: OperationalState<number | string> | null | undefined;
  format?: (v: number | string) => string;
  hint?: string;
  accent?: 'cyan' | 'emerald' | 'amber' | 'red' | 'slate';
  className?: string;
}) {
  const accentCls: Record<string, string> = {
    cyan: 'text-cyan-300', emerald: 'text-emerald-300', amber: 'text-amber-300', red: 'text-red-300', slate: 'text-slate-200',
  };
  const missing = !s || s.state === 'unknown' || s.state === 'unavailable' || s.data == null;
  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800/50 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
        {s && <SourceState state={s.state} />}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${missing ? 'text-slate-600' : accentCls[accent]}`}>
        {missing ? '—' : format(s!.data as number | string)}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
      {s && <ProvenanceFooter s={s} />}
    </div>
  );
}
