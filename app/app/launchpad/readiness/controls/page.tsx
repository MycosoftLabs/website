'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, MinusCircle, XCircle, Loader2, Search } from 'lucide-react';
import { STATUS_VOCABULARY } from '@/lib/launchpad/constants';

/**
 * The 110-requirement register — customer-owned states only.
 *
 * Safe vocabulary from constants.ts everywhere; state changes are recorded via
 * the BFF (which stamps state_source='customer' and audits the change). This
 * page never computes or displays a score — that happens on the Score page,
 * on explicit request.
 */

interface ControlRow {
  controlId: string;
  family: string;
  familyName: string;
  title: string;
  weight: number | null;
  isNa: boolean;
  dual: boolean;
  poamEligibility: string;
  state: string | null;
  narrative: string | null;
  markedAt: string | null;
}

const STATE_META: Array<[value: string, label: string, icon: typeof CheckCircle2, cls: string]> = [
  ['implemented', STATUS_VOCABULARY.implemented, CheckCircle2, 'text-emerald-500'],
  ['partial', 'In progress (partial)', CircleDashed, 'text-amber-500'],
  ['not_implemented', 'Not implemented', XCircle, 'text-red-400'],
  ['not_applicable', STATUS_VOCABULARY.not_applicable, MinusCircle, 'text-slate-400'],
];

export default function ControlsRegisterPage() {
  const [rows, setRows] = useState<ControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [family, setFamily] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/controls', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error || `HTTP ${r.status}`); return; }
      setRows(d.controls);
      setErr(null);
    } catch {
      setErr('Could not load the register');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const families = useMemo(
    () => [...new Set(rows.map((r) => r.family))].sort(),
    [rows],
  );
  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (family === 'all' || r.family === family) &&
          (filter === '' ||
            r.controlId.toLowerCase().includes(filter.toLowerCase()) ||
            r.title.toLowerCase().includes(filter.toLowerCase())),
      ),
    [rows, family, filter],
  );
  const assessed = rows.filter((r) => r.state !== null).length;

  const setState = async (controlId: string, state: string) => {
    setSaving(controlId);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/controls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controlId, state }),
      });
      if (r.ok) {
        setRows((rs) => rs.map((x) => (x.controlId === controlId ? { ...x, state, markedAt: new Date().toISOString() } : x)));
      } else {
        const d = await r.json().catch(() => ({}));
        setErr(d?.error || 'Save failed');
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading the 110-requirement register…
      </div>
    );
  }
  if (err && rows.length === 0) {
    return <div className="container max-w-4xl mx-auto px-4 py-14 text-sm text-destructive">{err}</div>;
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Requirement register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {assessed} of {rows.length} requirements assessed. States are yours: Launchpad records
            what you mark and never marks anything for you.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search id or title…"
              className="pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm w-56"
            />
          </div>
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="all">All families</option>
            {families.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {err && <p className="text-sm text-destructive mb-3">{err}</p>}

      <div className="space-y-1.5">
        {shown.map((r) => {
          const meta = STATE_META.find(([v]) => v === r.state);
          const Icon = meta?.[2] ?? CircleDashed;
          return (
            <div key={r.controlId} className="rounded-lg border border-border/60 bg-background">
              <button
                onClick={() => setOpen(open === r.controlId ? null : r.controlId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 rounded-lg"
              >
                <Icon className={`h-4 w-4 shrink-0 ${meta?.[3] ?? 'text-slate-300'}`} />
                <code className="text-sm font-semibold shrink-0 w-32">{r.controlId}</code>
                <span className="text-sm text-muted-foreground flex-1 truncate">{r.title}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground shrink-0 tabular-nums">
                  {r.isNa ? 'NA' : `${r.weight} pt`}
                </span>
                {r.poamEligibility === 'no' || r.poamEligibility === 'no-excluded' ? (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 shrink-0">
                    No POA&M
                  </span>
                ) : r.poamEligibility === 'carveout' ? (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground shrink-0">
                    Carve-out
                  </span>
                ) : null}
              </button>
              {open === r.controlId && (
                <div className="px-4 pb-3 pt-1 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">
                    {r.familyName}{r.dual ? ' · dual-value requirement (partial credit applies)' : ''}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATE_META.map(([value, label]) => (
                      <button
                        key={value}
                        disabled={saving === r.controlId}
                        onClick={() => setState(r.controlId, value)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          r.state === value
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        } disabled:opacity-50`}
                      >
                        {saving === r.controlId ? '…' : label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        &ldquo;{STATUS_VOCABULARY.implemented}&rdquo; means you state the implementation exists —
        Launchpad has not independently verified it and does not certify anything. Unassessed
        requirements count as Not Met in every score estimate.
      </p>
    </div>
  );
}
