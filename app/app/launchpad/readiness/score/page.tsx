'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calculator, Loader2, History, AlertTriangle, Gauge, Info } from 'lucide-react';
import {
  PageHeader, Card, StatTile, GateChip, ThresholdMeter, StateBadge, type Tone,
} from '@/components/launchpad/ui';

/**
 * Weighted score estimate + the three 32 CFR §170.21 gates.
 *
 * A snapshot is computed ONLY on explicit request. Indicators render side by
 * side, never blended; an empty history says so rather than showing zeros.
 */

interface Indicators {
  weighted_score_estimate?: { value: number; max: number; threshold: number };
  conditional_eligibility_estimate?: { value: string; reason?: string; blocking_gaps?: string[]; open_poam_items?: number };
  evidence_confidence?: { value: number; covered: number; assessed: number };
}
interface Snapshot {
  id: string; rule_pack_version: string; score: number; max_score: number;
  implemented_count: number; not_met_count: number; na_count: number; unassessed_count: number;
  eligibility: string; indicators?: Indicators; created_at: string;
}

const ELIG: Record<string, { label: string; tone: Tone }> = {
  'final-eligible': { label: 'Final Level 2 (Self) — estimate', tone: 'emerald' },
  'conditional-eligible': { label: 'Conditional Level 2 (Self) — estimate', tone: 'sky' },
  'not-eligible': { label: 'Not yet eligible — estimate', tone: 'amber' },
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
      if (r.ok) { setLatest(d.latest); setHistory(d.history ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load snapshots'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const compute = async () => {
    setComputing(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/score', { method: 'POST' });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d?.error || 'Computation failed'); }
      await load();
    } finally { setComputing(false); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading score history…
    </div>;
  }

  const ind = latest?.indicators;
  const threshold = ind?.weighted_score_estimate?.threshold ?? 88;
  const elig = latest ? ELIG[latest.eligibility] ?? { label: latest.eligibility, tone: 'slate' as Tone } : null;
  const blocking = ind?.conditional_eligibility_estimate?.blocking_gaps ?? [];
  const openPoam = ind?.conditional_eligibility_estimate?.open_poam_items ?? 0;
  const scoreTone: Tone = latest ? (latest.score >= threshold ? 'emerald' : 'amber') : 'slate';

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Weighted score estimate"
        icon={Gauge}
        description={<>Deterministic computation from your recorded states under rule pack <code className="text-xs px-1 rounded bg-muted">{latest?.rule_pack_version ?? 'cmmc-l2-v2.13-r1'}</code>. Not an official score — customer review required before any external use.</>}
        actions={
          <button onClick={compute} disabled={computing}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-emerald-500">
            {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Compute snapshot
          </button>
        }
      />

      {err && <Card tone="red" className="p-4 mb-5"><p className="text-sm pl-1.5">{err}</p></Card>}

      {!latest ? (
        <Card className="p-10 text-center">
          <Gauge className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">No snapshot yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Mark requirements in the register, then compute your first estimate. Unassessed requirements
            count as Not Met — silence never inflates a score.
          </p>
        </Card>
      ) : (
        <>
          {/* Score headline + meter */}
          <Card tone={scoreTone} className="p-5 mb-4">
            <div className="pl-1.5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Weighted score estimate</div>
                  <div className={`text-4xl font-bold tabular-nums ${scoreTone === 'emerald' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {latest.score}<span className="text-xl font-normal text-muted-foreground">/{latest.max_score}</span>
                  </div>
                </div>
                {elig && <StateBadge tone={elig.tone}>{elig.label}</StateBadge>}
              </div>
              <ThresholdMeter value={latest.score} max={latest.max_score} threshold={threshold} tone={scoreTone} />
              <p className="text-xs text-muted-foreground mt-3">{ind?.conditional_eligibility_estimate?.reason}</p>
            </div>
          </Card>

          {/* The three gates */}
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            32 CFR §170.21 — all three must pass simultaneously
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <GateChip label="Score ≥ 88" value={`${latest.score} / ≥ ${threshold}`} pass={latest.score >= threshold}
              detail="A weighted score — not a count of Met requirements." />
            <GateChip label="≤ 22 open items" value={`${openPoam} / ≤ 22`} pass={openPoam <= 22}
              detail="Requirements that would sit on the POA&M." />
            <GateChip label="Only 1-pt on POA&M" value={blocking.length === 0 ? 'Satisfied' : `${blocking.length} blocking`}
              pass={blocking.length === 0}
              detail="Requirements above 1 point (and excluded ones) cannot be deferred." />
          </div>

          {/* Other indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatTile label="Implemented" tone="emerald" value={<>{latest.implemented_count}<span className="text-base font-normal text-muted-foreground">/{latest.max_score}</span></>} sub="customer-marked · a count is not a status" />
            <StatTile label="Not met" tone="amber" value={latest.not_met_count} sub="includes unassessed" />
            <StatTile label="Not applicable" tone="slate" value={latest.na_count} sub="excluded from the count" />
            <StatTile label="Evidence confidence" tone="sky"
              value={ind?.evidence_confidence ? `${Math.round(ind.evidence_confidence.value * 100)}%` : '—'}
              sub={`${ind?.evidence_confidence?.covered ?? 0}/${ind?.evidence_confidence?.assessed ?? 0} assessed have evidence`} />
          </div>

          {latest.unassessed_count > 0 && (
            <Card tone="amber" className="p-4 mb-4">
              <div className="pl-1.5 flex items-start gap-2.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>{latest.unassessed_count} requirements are unassessed</strong> and scored as Not Met in this estimate.</span>
              </div>
            </Card>
          )}

          {blocking.length > 0 && (
            <Card tone="red" className="p-4 mb-6">
              <div className="pl-1.5">
                <div className="text-sm font-semibold mb-2">
                  {blocking.length} gap(s) cannot sit on a POA&amp;M — each blocks Conditional status
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {blocking.map((g) => (
                    <code key={g} className="text-[11px] px-2 py-1 rounded bg-muted border border-border">{g}</code>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> Snapshot history
            <span className="font-normal normal-case tracking-normal text-[11px] text-muted-foreground/70">
              insert-only · rule pack frozen per row
            </span>
          </h2>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {['When', 'Score', 'Implemented', 'Not met', 'Unassessed', 'Eligibility', 'Rule pack'].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-border/40">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold">{h.score}</td>
                    <td className="px-3 py-2 tabular-nums">{h.implemented_count}</td>
                    <td className="px-3 py-2 tabular-nums">{h.not_met_count}</td>
                    <td className="px-3 py-2 tabular-nums">{h.unassessed_count}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{h.eligibility.replace(/-/g, ' ')}</td>
                    <td className="px-3 py-2"><code className="text-[10px]">{h.rule_pack_version}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground mt-4">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Snapshots are never recomputed or rewritten — each row keeps the rule-pack version it was
              calculated under, so a historical estimate stays reproducible even after the rules change.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
