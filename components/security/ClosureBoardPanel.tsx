'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Loader2, RefreshCw, Wifi, WifiOff,
  CheckCircle2, CircleDashed, Clock, Copy, Download, ChevronDown, ChevronRight, Lock,
} from 'lucide-react';

/**
 * Closure Board — read-only, live.
 *
 * State comes from /api/security/closure-board on every load and every 30s poll.
 * Nothing here is hardcoded posture: when Cursor transitions a control in MAS,
 * this panel reflects it on the next tick with no code change. The static half
 * (what closes each requirement, which wave, who owns it) lives in
 * lib/security/closure/closure-guidance.ts.
 */

interface Item {
  id: string; weight: number; poamEligible: boolean;
  /** 'yes' | 'no' | 'no-excluded' | 'carveout' — the reason, not just the boolean */
  poamEligibility: string;
  blocking: boolean;
  wave: number; waveKey: string; waveLabel: string; owner: string;
  title: string; action: string;
  state: string; closed: boolean;
  evidenceUri: string | null; operatingHistory: boolean;
}
interface Wave {
  wave: number; key: string; label: string; owner: string; blurb: string;
  total: number; closed: number; closedPoints: number;
  open: number; openPoints: number; poamIneligibleOpen: number; complete: boolean;
}
interface Board {
  state: string; reason?: string; collected_at: string; source?: string;
  entity?: string; claim?: string;
  posture?: { met: number; partial: number; notApplicable: number; nonCompliant: number; total: number; metPercent: number; twinMismatches: string[]; twinsClean: boolean };
  sprs?: { projected: number; deduction: number; method: string; provenance: string; thresholdNote: string };
  baseline?: { date: string; count: number; points: number; sprs: number; closedCount: number; pointsRecovered: number };
  remaining?: {
    count: number; points: number;
    poamIneligible: { count: number; points: number; ids: string[] };
    operatingHistory: { count: number; points: number; ids: string[] };
    reachable: { count: number; points: number };
  };
  gates?: {
    rule: string; scenario: string;
    score: { value: number; threshold: number; pass: boolean };
    openCount: { value: number; limit: number; pass: boolean };
    poamWeights: { ineligibleRemaining: string[]; points: number; pass: boolean; detail: string };
  };
  blockers?: { ids: string[]; detail: string };
  waves?: Wave[];
  items?: Item[];
  statements?: Statement[];
  statementsFlagged?: string[];
}
interface Check { label: string; holds: boolean; observed: string; expected: string; because: string }
interface Statement {
  id: string; title: string; kind: 'action' | 'record' | 'standing';
  owner: string | null; body: string[];
  verified: boolean; checks: Check[]; broken: Check[]; unconditional: boolean;
}

type Filter = 'open' | 'closed' | 'ineligible' | 'all';

const card = 'bg-slate-900/60 border border-slate-700 rounded-lg';
const pill = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border';
const good = 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
const warn = 'text-amber-300 border-amber-500/40 bg-amber-500/10';
const bad = 'text-red-300 border-red-500/40 bg-red-500/10';
const mute = 'text-slate-300 border-slate-600 bg-slate-500/10';

function stateChip(i: Item) {
  if (i.state === 'implemented') return [good, 'Met'] as const;
  if (i.state === 'not_applicable') return [mute, 'N/A'] as const;
  if (i.state === 'partial') return [warn, 'Partial'] as const;
  if (i.state === 'non_compliant') return [bad, 'Non-compliant'] as const;
  return [mute, 'Unknown'] as const;
}

export default function ClosureBoardPanel() {
  const [b, setB] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [wave, setWave] = useState<number | 'all'>('all');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/security/closure-board', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || d.state !== 'ok') { setB(null); setErr(d?.reason || `HTTP ${r.status}`); }
      else { setB(d); setErr(null); }
    } catch {
      setB(null); setErr('Board request failed');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const items = b?.items ?? [];
  const shown = useMemo(() => items.filter((i) => {
    if (wave !== 'all' && i.wave !== wave) return false;
    if (filter === 'open') return !i.closed;
    if (filter === 'closed') return i.closed;
    if (filter === 'ineligible') return !i.closed && !i.poamEligible;
    return true;
  }), [items, filter, wave]);

  // Payload for Cursor: only what is still open, with the action that closes it.
  const payload = useMemo(() => {
    if (!b?.items) return '';
    const o = b.items.filter((i) => !i.closed);
    return JSON.stringify({
      generated_at: b.collected_at,
      source: b.source,
      note: 'Live MAS state. Read-only board; MAS remains the system of record. Honesty gate: no Met flip without a real hash-addressed evidence_uri.',
      posture: b.posture,
      projected_sprs: b.sprs?.projected,
      gates: b.gates,
      open_items: o.map((i) => ({
        id: i.id, weight: i.weight, poam_eligible: i.poamEligible,
        wave: i.wave, wave_label: i.waveLabel, owner: i.owner,
        title: i.title, state: i.state,
        operating_history: i.operatingHistory,
        action: i.action.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      })),
      open_actions: (b.statements ?? []).filter((s) => s.kind === 'action').map((s) => ({
        id: s.id, title: s.title, owner: s.owner,
        detail: s.body.map((p) => p.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim(),
      })),
      superseded_statements: (b.statements ?? []).filter((s) => !s.verified).map((s) => ({
        id: s.id, title: s.title,
        broke_on: s.broken.map((c) => `${c.label}: expected ${c.expected}, MAS reports ${c.observed}`),
      })),
      blocking_non_scored: b.blockers,
    }, null, 2);
  }, [b]);

  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(null), 2200); };

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      flash('copy');
    } catch {
      // clipboard API is unavailable in some embedded/insecure contexts
      const ta = document.createElement('textarea');
      ta.value = payload;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let okay = false;
      try { okay = document.execCommand('copy'); } catch { okay = false; }
      document.body.removeChild(ta);
      flash(okay ? 'copy' : 'copyfail');
    }
  };

  const downloadPayload = () => {
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cmmc-closure-open-items-${(b?.collected_at || '').slice(0, 10) || 'export'}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('dl');
  };

  if (loading) {
    return (
      <div className={`${card} p-8 flex items-center justify-center gap-2 text-slate-400`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading closure board from MAS…
      </div>
    );
  }

  if (!b) {
    return (
      <div className={`${card} p-6 border-amber-600/40`}>
        <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
          <WifiOff className="w-4 h-4" /> Closure board unavailable
        </div>
        <p className="text-sm text-slate-300">
          {err || 'MAS did not return control state.'} No figures are shown rather than showing zeros —
          a green zero on a failed read would misstate posture.
        </p>
        <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-600 text-slate-200 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const g = b.gates!;
  const p = b.posture!;
  const rem = b.remaining!;
  const base = b.baseline!;
  const allGates = g.score.pass && g.openCount.pass && g.poamWeights.pass;

  return (
    <div className="space-y-4">
      {/* ---- header ---------------------------------------------------- */}
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" /> Partial Closure Board
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              The {base.count} requirements that were Partial on {base.date}, worth {base.points} points, each with the
              specific action that closes it. Status is read live from MAS on every load — this board never stores posture.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${pill} ${good}`}><Wifi className="w-3 h-3" /> Live · 30s</span>
            <button onClick={load} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-slate-600 text-slate-200 hover:bg-slate-800">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          {[
            ['Met', p.met, 'text-emerald-300'],
            ['Partial', p.partial, 'text-amber-300'],
            ['N/A', p.notApplicable, 'text-slate-300'],
            ['Non-compliant', p.nonCompliant, p.nonCompliant ? 'text-red-300' : 'text-slate-300'],
            ['Projected SPRS', b.sprs!.projected, b.sprs!.projected >= 88 ? 'text-emerald-300' : 'text-amber-300'],
          ].map(([l, v, c]) => (
            <div key={l as string} className="bg-slate-950/50 border border-slate-800 rounded px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">{l as string}</div>
              <div className={`text-xl font-semibold tabular-nums ${c as string}`}>{v as number}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className={`${pill} ${p.twinsClean ? good : bad}`}>
            {p.twinsClean ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {p.twinsClean ? 'Twin rows clean' : `${p.twinMismatches.length} twin mismatch(es)`}
          </span>
          <span className={`${pill} ${mute}`}>
            Baseline {base.sprs} → {b.sprs!.projected} · {base.closedCount}/{base.count} closed · {base.pointsRecovered} pts recovered
          </span>
        </div>

        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          {b.claim} SPRS is derived here, not published by MAS: {b.sprs!.method} {b.sprs!.provenance}{' '}
          {b.sprs!.thresholdNote} Collected {new Date(b.collected_at).toLocaleString()} from <code className="text-slate-400">{b.source}</code>.
        </p>
      </div>

      {/* ---- §170.21 gates ---------------------------------------------- */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-200">32 CFR §170.21 — Conditional status gates</h3>
          <span className={`${pill} ${allGates ? good : warn}`}>
            {allGates ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {allGates ? 'All three pass' : 'Not all gates pass'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{g.rule}</p>
        <p className="text-[11px] text-slate-500 mt-1">Tested against the scenario: {g.scenario}.</p>

        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {[
            { k: 'SPRS score', v: `${g.score.value} / ≥ ${g.score.threshold}`, pass: g.score.pass,
              d: 'A weighted score, not a count of Met requirements.' },
            { k: 'Open items', v: `${g.openCount.value} / ≤ ${g.openCount.limit}`, pass: g.openCount.pass,
              d: 'Requirements that would still be on the POA&M.' },
            { k: 'POA&M weights', v: g.poamWeights.pass ? 'Only 1-point items' : `${g.poamWeights.ineligibleRemaining.length} above 1 pt`, pass: g.poamWeights.pass,
              d: g.poamWeights.detail },
          ].map((x) => (
            <div key={x.k} className={`rounded border p-3 ${x.pass ? 'border-emerald-600/40 bg-emerald-500/5' : 'border-amber-600/40 bg-amber-500/5'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400">{x.k}</span>
                <span className={`${pill} ${x.pass ? good : warn}`}>{x.pass ? 'Pass' : 'Fail'}</span>
              </div>
              <div className="text-lg font-semibold text-slate-100 tabular-nums mt-1">{x.v}</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{x.d}</p>
              {!x.pass && x.k === 'POA&M weights' && g.poamWeights.ineligibleRemaining.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {g.poamWeights.ineligibleRemaining.map((id) => (
                    <code key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">{id}</code>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-3 text-xs">
          <div className="bg-slate-950/50 border border-slate-800 rounded px-3 py-2">
            <div className="text-slate-500 text-[11px] uppercase tracking-wide">Still open</div>
            <div className="text-slate-100 font-semibold tabular-nums">{rem.count} · {rem.points} pts</div>
          </div>
          <div className="bg-slate-950/50 border border-slate-800 rounded px-3 py-2">
            <div className="text-slate-500 text-[11px] uppercase tracking-wide">Cannot sit on a POA&amp;M</div>
            <div className={`font-semibold tabular-nums ${rem.poamIneligible.count ? 'text-amber-300' : 'text-emerald-300'}`}>
              {rem.poamIneligible.count} · {rem.poamIneligible.points} pts
            </div>
          </div>
          <div className="bg-slate-950/50 border border-slate-800 rounded px-3 py-2">
            <div className="text-slate-500 text-[11px] uppercase tracking-wide">Operating history only</div>
            <div className="text-slate-100 font-semibold tabular-nums">{rem.operatingHistory.count} · {rem.operatingHistory.points} pts</div>
          </div>
        </div>
      </div>

      {/* ---- waves ------------------------------------------------------ */}
      <div className={`${card} p-5`}>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Waves</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(b.waves ?? []).map((w) => (
            <button key={w.wave} onClick={() => setWave(wave === w.wave ? 'all' : w.wave)}
              className={`text-left rounded border p-3 transition ${
                wave === w.wave ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Wave {w.wave}</span>
                <span className={`${pill} ${w.complete ? good : warn}`}>{w.closed}/{w.total}</span>
              </div>
              <div className="text-sm font-medium text-slate-100 mt-1">{w.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{w.owner}</div>
              <div className="h-1.5 bg-slate-800 rounded mt-2 overflow-hidden">
                <div className={`h-full ${w.complete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                  style={{ width: `${w.total ? (w.closed / w.total) * 100 : 0}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {w.openPoints} pts open{w.poamIneligibleOpen > 0 ? ` · ${w.poamIneligibleOpen} no-POA&M` : ''}
              </div>
            </button>
          ))}
        </div>
        {wave !== 'all' && (
          <p className="text-xs text-slate-400 mt-3">
            <span className="text-slate-200 font-medium">Wave {wave}:</span>{' '}
            {(b.waves ?? []).find((w) => w.wave === wave)?.blurb}
          </p>
        )}
      </div>

      {/* ---- standing record -------------------------------------------- */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-200">Standing record</h3>
          <span className={`${pill} ${(b.statementsFlagged?.length ?? 0) === 0 ? good : bad}`}>
            {(b.statementsFlagged?.length ?? 0) === 0
              ? <><CheckCircle2 className="w-3 h-3" /> All claims hold against live MAS</>
              : <><AlertTriangle className="w-3 h-3" /> {b.statementsFlagged!.length} claim(s) superseded</>}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Each statement declares the live MAS conditions it depends on, re-checked on every load. A statement whose
          conditions stop holding is flagged here rather than left on the page reading as current.
        </p>

        <div className="space-y-2 mt-3">
          {(b.statements ?? []).map((s) => {
            const isOpen = !!open[s.id];
            const kindCls = s.kind === 'action' ? warn : s.kind === 'standing' ? mute : good;
            return (
              <div key={s.id}
                className={`rounded border ${s.verified ? 'border-slate-700 bg-slate-950/40' : 'border-red-600/50 bg-red-500/5'}`}>
                <button onClick={() => setOpen((x) => ({ ...x, [s.id]: !x[s.id] }))}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-800/30 rounded">
                  <span className="mt-0.5 shrink-0">
                    {!s.verified ? <AlertTriangle className="w-4 h-4 text-red-400" />
                      : s.kind === 'action' ? <Clock className="w-4 h-4 text-amber-400" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`${pill} ${kindCls}`}>
                        {s.kind === 'action' ? 'Open action' : s.kind === 'standing' ? 'Standing rule' : 'Settled record'}
                      </span>
                      {!s.verified && <span className={`${pill} ${bad}`}>Superseded — conditions no longer hold</span>}
                      {s.verified && !s.unconditional && (
                        <span className={`${pill} ${good}`}>Verified · {s.checks.length} condition{s.checks.length === 1 ? '' : 's'}</span>
                      )}
                      {s.owner && <span className="text-[11px] text-slate-500">{s.owner}</span>}
                    </span>
                    <span className="block text-sm font-medium text-slate-100 mt-1">{s.title}</span>
                  </span>
                  <span className="shrink-0 text-slate-500 mt-0.5">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                </button>

                {!s.verified && (
                  <div className="mx-4 mb-3 rounded border border-red-600/40 bg-red-500/10 p-3">
                    <div className="text-xs font-semibold text-red-300 mb-1.5">
                      This statement is no longer supported by live MAS:
                    </div>
                    {s.broken.map((c) => (
                      <div key={c.label} className="text-[11px] text-slate-300 mb-1.5 leading-snug">
                        <code className="text-red-300">{c.label}</code> — expected <b>{c.expected}</b>, MAS reports{' '}
                        <b className="text-red-300">{c.observed}</b>. {c.because}
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800 space-y-2">
                    {s.body.map((para, n) => (
                      <p key={n} className="text-sm text-slate-300 leading-relaxed closure-action"
                        dangerouslySetInnerHTML={{ __html: para }} />
                    ))}
                    {s.checks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
                          Conditions checked this load
                        </div>
                        {s.checks.map((c) => (
                          <div key={c.label} className="flex items-start gap-2 text-[11px] text-slate-400 mb-1">
                            {c.holds ? <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                              : <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />}
                            <span><code className="text-slate-300">{c.label}</code> — {c.observed} (expected {c.expected})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {s.unconditional && (
                      <p className="text-[11px] text-slate-600 mt-2">
                        A methodology rule, not a posture claim — it does not depend on live state and cannot go stale.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- filters + payload ------------------------------------------ */}
      <div className={`${card} p-4 flex flex-wrap items-center gap-2 justify-between`}>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['open', `Open (${items.filter((i) => !i.closed).length})`],
            ['ineligible', `No POA&M (${items.filter((i) => !i.closed && !i.poamEligible).length})`],
            ['closed', `Closed (${items.filter((i) => i.closed).length})`],
            ['all', `All (${items.length})`],
          ] as [Filter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`text-xs px-3 py-1.5 rounded border ${filter === k ? 'border-sky-500 bg-sky-500/10 text-sky-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
              {l}
            </button>
          ))}
          {wave !== 'all' && (
            <button onClick={() => setWave('all')} className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-800">
              Wave {wave} ✕
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={copyPayload}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-600 text-slate-200 hover:bg-slate-800">
            <Copy className="w-3.5 h-3.5" />
            {copied === 'copy' ? 'Copied' : copied === 'copyfail' ? 'Blocked — use Download' : 'Copy Cursor payload'}
          </button>
          <button onClick={downloadPayload}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-600 text-slate-200 hover:bg-slate-800">
            <Download className="w-3.5 h-3.5" /> {copied === 'dl' ? 'Downloaded' : 'Download JSON'}
          </button>
        </div>
      </div>

      {/* ---- items ------------------------------------------------------ */}
      <div className="space-y-2">
        {shown.length === 0 && (
          <div className={`${card} p-6 text-center text-sm text-slate-400`}>
            No requirements match this filter.
          </div>
        )}
        {shown.map((i) => {
          const [cls, label] = stateChip(i);
          const isOpen = !!open[i.id];
          return (
            <div key={i.id} className={`${card} ${i.closed ? 'opacity-75' : ''}`}>
              <button onClick={() => setOpen((s) => ({ ...s, [i.id]: !s[i.id] }))}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-800/40 rounded-lg">
                <span className="mt-0.5 shrink-0">
                  {i.closed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <CircleDashed className="w-4 h-4 text-amber-400" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <code className="text-sm font-semibold text-slate-100">{i.id}</code>
                    <span className={`${pill} ${cls}`}>{label}</span>
                    <span className={`${pill} ${mute} tabular-nums`}>{i.weight} pt</span>
                    {!i.poamEligible && (
                      <span className={`${pill} ${i.closed ? mute : bad}`} title={
                        i.poamEligibility === 'no-excluded'
                          ? 'Excluded from the POA&M regardless of weight — §170.21(a)(2)(iii)'
                          : 'Weight exceeds 1 point, so it cannot sit on a POA&M'}>
                        <Lock className="w-3 h-3" />
                        {i.poamEligibility === 'no-excluded' ? 'Excluded from POA&M' : 'No POA&M'}
                      </span>
                    )}
                    {i.poamEligibility === 'carveout' && (
                      <span className={`${pill} ${mute}`} title="Explicit FIPS carve-out under §170.21(a)(2)(ii): POA&M-eligible despite its 5-point weight, where encryption is employed but not FIPS-validated.">
                        POA&amp;M by carve-out
                      </span>
                    )}
                    {i.blocking && (
                      <span className={`${pill} ${bad}`} title="Non-numeric, blocking. Carries no point weight and cannot be scored away.">
                        Blocking · not scored
                      </span>
                    )}
                    {i.operatingHistory && !i.closed && (
                      <span className={`${pill} ${warn}`}><Clock className="w-3 h-3" /> Operating history</span>
                    )}
                    <span className="text-[11px] text-slate-500">W{i.wave} · {i.owner}</span>
                  </span>
                  <span className="block text-sm text-slate-300 mt-1">{i.title}</span>
                </span>
                <span className="shrink-0 text-slate-500 mt-0.5">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800">
                  <div className="text-sm text-slate-300 leading-relaxed closure-action"
                    dangerouslySetInnerHTML={{ __html: i.action }} />
                  {i.evidenceUri && (
                    <p className="text-[11px] text-slate-500 mt-3 break-all">
                      Evidence in MAS: <code className="text-slate-400">{i.evidenceUri}</code>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">
        Read-only. This board never writes to MAS and never marks a requirement Met — it reports what MAS already holds.
        Mycosoft, LLC is pursuing CMMC Level 2 Self-Assessment and is not certified. Projections describe what filed
        evidence supports, never achieved status.
      </p>

      <style jsx global>{`
        .closure-action code {
          background: rgb(2 6 23 / 0.7);
          border: 1px solid rgb(51 65 85);
          border-radius: 3px;
          padding: 0 4px;
          font-size: 0.85em;
          color: rgb(203 213 225);
          word-break: break-all;
        }
        .closure-action b { color: rgb(226 232 240); }
        .closure-action a { color: rgb(56 189 248); text-decoration: underline; }
      `}</style>
    </div>
  );
}
