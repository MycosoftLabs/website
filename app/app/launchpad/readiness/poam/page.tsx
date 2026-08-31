'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Loader2, CalendarClock, AlertTriangle, Calculator } from 'lucide-react';
import { PageHeader, Card, StatTile, StateBadge, ThresholdMeter, type Tone } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';

/**
 * POA&M items — opened automatically for POA&M-eligible gaps when a snapshot
 * is computed, closed automatically when the gap clears. The 180-day clock
 * starts at first opening and is never reset by recomputation.
 */

interface PoamItem {
  id: string;
  control_id: string;
  status: string;
  weakness: string | null;
  opened_at: string;
  due_at: string | null;
  closed_at: string | null;
}

/** The 32 CFR §170.21 closeout window for a Conditional status. */
const POAM_WINDOW_DAYS = 180;

const STATUS_TONE: Record<string, Tone> = {
  open: 'amber',
  in_progress: 'sky',
  closed: 'emerald',
  withdrawn: 'slate',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'open',
  in_progress: 'in progress',
  closed: 'closed',
  withdrawn: 'withdrawn',
};

export default function PoamPage() {
  const [items, setItems] = useState<PoamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/poam', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setItems(d.items ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setErr('Could not load POA&M items');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading POA&M…
      </div>
    );
  }

  const open = items.filter((i) => i.status === 'open' || i.status === 'in_progress');
  const closed = items.filter((i) => i.status === 'closed' || i.status === 'withdrawn');
  const daysLeft = (due: string | null) =>
    due ? Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000) : null;
  const elapsedDays = (opened: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(opened).getTime()) / 86_400_000));

  // Posture numbers — computed from the loaded items, never fabricated.
  const dueSoon = open.filter((i) => {
    const d = daysLeft(i.due_at);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const overdue = open.filter((i) => {
    const d = daysLeft(i.due_at);
    return d !== null && d < 0;
  }).length;

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Plan of Action & Milestones"
        icon={ListChecks}
        description="Items open automatically for POA&M-eligible gaps when you compute a snapshot and close when the gap clears. Under 32 CFR §170.21, a Conditional status requires closeout within 180 days of the assessment date — the clock shown here starts when the item first opened."
        actions={
          <GlassButton href="/app/launchpad/readiness/score">
            <Calculator className="h-3.5 w-3.5 text-current mr-1.5" /> Score &amp; snapshots
          </GlassButton>
        }
      />

      {/* Education-first: what / why / next step */}
      <Card tone="sky" className="p-5 mb-5">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A POA&M — Plan of Action &amp; Milestones — is the deferred-closure plan for gaps you
              could not close yet: each item names a requirement, when it opened, and its closeout
              deadline. Items here are derived automatically from your computed score snapshots;
              nothing is entered by hand.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Under 32 CFR §170.21 a Conditional status only works if every POA&M item is closed
              within 180 days of the assessment date. And not all gaps are POA&M-eligible — only
              certain lower-weight requirements qualify for deferral; the rest must be fully
              implemented before you assess.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compute a snapshot on the Score page to derive items from your current gaps, then work
              each open item down. When a later snapshot shows the gap cleared, the item closes
              automatically — the 180-day clock is never reset by recomputation.
            </p>
          </div>
        </div>
      </Card>

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        </Card>
      )}

      {/* Clock posture at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {items.length === 0 ? (
          <>
            <StatTile label="Open items" empty="None yet — compute a snapshot" />
            <StatTile label="Due within 30 days" empty="—" />
            <StatTile label="Overdue" empty="—" />
          </>
        ) : (
          <>
            <StatTile
              label="Open items"
              value={open.length}
              tone={open.length > 0 ? 'amber' : 'emerald'}
              sub={open.length > 0 ? 'deferred gaps awaiting closure' : 'every item closed or withdrawn'}
            />
            <StatTile
              label="Due within 30 days"
              value={dueSoon}
              tone={dueSoon > 0 ? 'amber' : 'slate'}
              sub="close these before the clock runs out"
            />
            <StatTile
              label="Overdue"
              value={overdue}
              tone={overdue > 0 ? 'red' : 'slate'}
              sub="past the 180-day closeout date"
            />
          </>
        )}
      </div>

      {open.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No open POA&M items. Compute a score snapshot to derive them from your current gaps.
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {open.map((i) => {
            const d = daysLeft(i.due_at);
            const elapsed = elapsedDays(i.opened_at);
            // Fall back to the opened_at-based clock when no due date is stored.
            const clockLeft = d ?? POAM_WINDOW_DAYS - elapsed;
            const tone: Tone = clockLeft < 0 ? 'red' : clockLeft <= 30 ? 'amber' : 'emerald';
            return (
              <Card key={i.id} tone={tone} className="p-4">
                <div className="pl-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <code className="text-sm font-semibold">{i.control_id}</code>
                    <StateBadge tone={STATUS_TONE[i.status] ?? 'slate'}>
                      {STATUS_LABEL[i.status] ?? i.status}
                    </StateBadge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      opened {new Date(i.opened_at).toLocaleDateString()}
                      {i.due_at && <> · due {new Date(i.due_at).toLocaleDateString()}</>}
                    </span>
                    {d !== null && (
                      <span
                        className={`text-xs font-semibold tabular-nums ml-auto ${
                          d < 0
                            ? 'text-red-600 dark:text-red-400'
                            : d <= 30
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {d >= 0 ? `${d} days left` : `${-d} days overdue`}
                      </span>
                    )}
                  </div>
                  {i.weakness && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{i.weakness}</p>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-3 tabular-nums">
                    180-day clock — day {elapsed} of {POAM_WINDOW_DAYS}
                  </div>
                  <ThresholdMeter
                    value={elapsed}
                    max={Math.max(POAM_WINDOW_DAYS, elapsed)}
                    threshold={POAM_WINDOW_DAYS}
                    tone={tone}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Closed</h2>
          <div className="space-y-1.5">
            {closed.map((i) => (
              <Card key={i.id} className="px-4 py-2.5 opacity-70">
                <div className="flex flex-wrap items-center gap-3">
                  <code className="text-sm w-32">{i.control_id}</code>
                  <StateBadge tone={STATUS_TONE[i.status] ?? 'slate'}>
                    {STATUS_LABEL[i.status] ?? i.status}
                  </StateBadge>
                  {i.closed_at && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(i.closed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        Items here are derived from your own score snapshots and track your closure clock — nothing
        on this page states that you or anyone else is CMMC compliant, and closing an item is a
        recorded fact about your gap list, not a certification.
      </p>
    </div>
  );
}
