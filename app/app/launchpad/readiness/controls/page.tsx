'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, ClipboardCheck, MinusCircle, XCircle, Loader2, Search } from 'lucide-react';
import { STATUS_VOCABULARY } from '@/lib/launchpad/constants';
import { PageHeader, Card } from '@/components/launchpad/ui';
import { LiquidRadio, LiquidSwitch } from '@/components/launchpad/liquid';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';

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
  ['not_applicable', STATUS_VOCABULARY.not_applicable, MinusCircle, 'text-slate-500 dark:text-slate-400'],
];

export default function ControlsRegisterPage() {
  const [rows, setRows] = useState<ControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [family, setFamily] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [unassessedOnly, setUnassessedOnly] = useState(false);

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
          (!unassessedOnly || r.state === null) &&
          (filter === '' ||
            r.controlId.toLowerCase().includes(filter.toLowerCase()) ||
            r.title.toLowerCase().includes(filter.toLowerCase())),
      ),
    [rows, family, filter, unassessedOnly],
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
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading the 110-requirement register…
      </div>
    );
  }
  if (err && rows.length === 0) {
    return <div className="container max-w-4xl mx-auto px-4 py-14 text-sm text-destructive">{err}</div>;
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Requirement register"
        icon={ClipboardCheck}
        description={
          <>
            {assessed} of {rows.length} requirements assessed. States are yours: Launchpad records
            what you mark and never marks anything for you.
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <LiquidSwitch
              checked={unassessedOnly}
              onChange={setUnassessedOnly}
              label="Unassessed only"
            />
            {/* Neither filter has a visible label — the magnifier icon and the
                "All families" option are the only cues — so the name a sighted
                user infers is carried by aria-label (WCAG 1.3.1 / 4.1.2). A
                placeholder is not an accessible name. */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                id="ctl-search"
                aria-label="Search id or title, in the requirement register"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search id or title…"
                className="myco-glass-field pl-8 pr-3 py-2 rounded-lg border border-border text-sm w-56"
              />
            </div>
            <select
              id="ctl-family"
              aria-label="Filter requirements by family"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              className="myco-glass-field px-3 py-2 rounded-lg border border-border text-sm"
            >
              <option value="all">All families</option>
              {families.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Education-first: what / why / next step */}
      <Card tone="sky" className="p-5 mb-5">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The full register of the 110 security requirements in NIST SP 800-171, grouped by
              family. Each row is one requirement — open it and mark the state that is true today:
              implemented, partial, not implemented, or not applicable.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These marked states are the raw material for everything downstream — the score
              estimate, the SSP, and the POA&amp;M. Unassessed requirements count as Not Met in
              every score estimate, so an honest register beats an optimistic one.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Work one family at a time. Flip on &ldquo;Unassessed only&rdquo; to see what is left,
              open a row, and mark it. Marking a state records your own statement — Launchpad never
              verifies or certifies anything for you.
            </p>
          </div>
        </div>
      </Card>

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
                <Icon className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${open === r.controlId ? 'scale-110' : ''} ${meta?.[3] ?? 'text-slate-500 dark:text-slate-400'}`} />
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
                <div className="lp-row-panel px-4 pb-3 pt-1 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">
                    {r.familyName}{r.dual ? ' · dual-value requirement (partial credit applies)' : ''}
                  </div>
                  {/* Exactly one state per requirement — a radio group, not a
                      row of toggle buttons. Marking is always the customer's
                      action; the BFF stamps state_source='customer'. */}
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {STATE_META.map(([value, label]) => (
                      <LiquidRadio
                        key={value}
                        name={`state-${r.controlId}`}
                        value={value}
                        checked={r.state === value}
                        disabled={saving === r.controlId}
                        onChange={(on) => { if (on) setState(r.controlId, value); }}
                        label={label}
                      />
                    ))}
                    {saving === r.controlId && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-current" /> Saving…
                      </span>
                    )}
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
      <OfficialLinksPanel surface="requirements" title="The source text of these requirements" />
    </div>
  );
}
