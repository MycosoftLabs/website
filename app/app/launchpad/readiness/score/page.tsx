'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calculator, Loader2, History, AlertTriangle } from 'lucide-react';

/**
 * Weighted score estimates — the four-indicator surface.
 *
 * A snapshot is computed ONLY when the customer clicks the button. The four
 * indicators render side by side and are never blended into one ring; an
 * empty history says so instead of showing a zero.
 */

interface Snapshot {
  id: string;
  rule_pack_version: string;
  score: number;
  max_score: number;
  implemented_count: number;
  not_met_count: number;
  na_count: number;
  unassessed_count: number;
  eligibility: string;
  indicators: Record<string, { value: unknown; label: string; [k: string]: unknown }>;
  created_at: string;
}

const ELIGIBILITY_LABEL: Record<string, [string, string]> = {
  'final-eligible': ['Final Level 2 (Self) — estimate', 'text-emerald-500'],
  'conditional-eligible': ['Conditional Level 2 (Self) — estimate', 'text-cyan-500'],
  'not-eligible': ['Not yet eligible — estimate', 'text-amber-500'],
};

export default function ScorePage() {
  const [latest, setLatest] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/score', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setLatest(d.latest);
        setHistory(d.history ?? []);
        setErr(null);
      } else setErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setErr('Could not load snapshots');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const compute = async () => {
    setComputing(true);
    setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/score', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d?.error || 'Computation failed');
      await load();
    } finally {
      setComputing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading score history…
      </div>
    );
  }

  const elig = latest ? ELIGIBILITY_LABEL[latest.eligibility] ?? [latest.eligibility, 'text-muted-foreground'] : null;
  const evidence = latest?.indicators?.evidence_confidence as { value?: number; covered?: number; assessed?: number } | undefined;
  const condElig = latest?.indicators?.conditional_eligibility_estimate as { reason?: string; blocking_gaps?: string[] } | undefined;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Weighted score estimate</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deterministic computation from your recorded states under rule pack{' '}
            <code>{latest?.rule_pack_version ?? 'cmmc-l2-v2.13-r1'}</code>. Not an official score;
            customer review required before any external use.
          </p>
        </div>
        <button
          onClick={compute}
          disabled={computing}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-50 hover:opacity-90"
        >
          {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Compute new snapshot
        </button>
      </div>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {!latest ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No snapshot yet. Mark requirements in the register, then compute your first estimate.
          Unassessed requirements count as Not Met — silence never inflates a score.
        </div>
      ) : (
        <>
          {/* The four independent indicators — side by side, never blended */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Implementation count
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {latest.implemented_count}
                <span className="text-sm font-normal text-muted-foreground">/{latest.max_score}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                customer-marked implemented · a count is not a status
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Weighted score estimate
              </div>
              <div className={`text-2xl font-bold tabular-nums ${latest.score >= 88 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {latest.score}
                <span className="text-sm font-normal text-muted-foreground">/{latest.max_score}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">conditional threshold 88</div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Conditional eligibility
              </div>
              <div className={`text-sm font-semibold ${elig?.[1]}`}>{elig?.[0]}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{condElig?.reason}</div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Evidence confidence
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {evidence?.value !== undefined ? `${Math.round((evidence.value as number) * 100)}%` : '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {evidence?.covered ?? 0} of {evidence?.assessed ?? 0} assessed requirements have indexed evidence
              </div>
            </div>
          </div>

          {latest.unassessed_count > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 mb-6 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>{latest.unassessed_count} requirements are unassessed</strong> and scored as
                Not Met in this estimate. Assess them in the register for an accurate picture.
              </span>
            </div>
          )}

          {condElig?.blocking_gaps && condElig.blocking_gaps.length > 0 && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3.5 mb-6 text-sm">
              <div className="font-semibold mb-1">
                {condElig.blocking_gaps.length} gap(s) cannot sit on a POA&M and block Conditional status:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {condElig.blocking_gaps.map((g) => (
                  <code key={g} className="text-xs px-1.5 py-0.5 rounded bg-background border border-border">{g}</code>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <History className="h-4 w-4" /> Snapshot history (insert-only; rule pack frozen per row)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Implemented</th>
                  <th className="px-3 py-2 font-medium">Not met</th>
                  <th className="px-3 py-2 font-medium">Unassessed</th>
                  <th className="px-3 py-2 font-medium">Eligibility</th>
                  <th className="px-3 py-2 font-medium">Rule pack</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-border/40">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{h.score}</td>
                    <td className="px-3 py-2 tabular-nums">{h.implemented_count}</td>
                    <td className="px-3 py-2 tabular-nums">{h.not_met_count}</td>
                    <td className="px-3 py-2 tabular-nums">{h.unassessed_count}</td>
                    <td className="px-3 py-2">{h.eligibility}</td>
                    <td className="px-3 py-2"><code className="text-xs">{h.rule_pack_version}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
